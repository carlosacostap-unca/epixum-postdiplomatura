import 'server-only';

import JSZip from 'jszip';
import type { RepositoryCoverage } from '@/types';
import type { ParsedGithubRepositoryUrl } from './github-url';

export const GITHUB_INGESTION_LIMITS = Object.freeze({
  metadataTimeoutMs: 10_000,
  downloadTimeoutMs: 30_000,
  maxCompressedBytes: 10 * 1024 * 1024,
  maxExpandedBytes: 50 * 1024 * 1024,
  maxEntries: 2_000,
  maxTextFileBytes: 256 * 1024,
  maxEvidenceBytes: 1024 * 1024,
  maxRedirects: 3,
});

export type GithubRepositoryErrorCategory =
  | 'github_not_found'
  | 'github_private'
  | 'github_rate_limit'
  | 'github_timeout'
  | 'repository_limits'
  | 'insufficient_evidence'
  | 'github_unavailable';

export class GithubRepositoryError extends Error {
  constructor(public readonly category: GithubRepositoryErrorCategory, message: string) {
    super(message);
    this.name = 'GithubRepositoryError';
  }
}

export interface ResolvedGithubRepository extends ParsedGithubRepositoryUrl {
  defaultBranch: string;
  commitSha: string;
}

export interface RepositoryEvidence {
  text: string;
  coverage: RepositoryCoverage;
}

type FetchLike = typeof fetch;

function githubHeaders(token?: string) {
  return {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'epixum-ai-preevaluation',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function fetchWithTimeout(fetchFn: FetchLike, url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchFn(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new GithubRepositoryError('github_timeout', 'GitHub no respondió dentro del tiempo permitido.');
    }
    throw new GithubRepositoryError('github_unavailable', 'No se pudo comunicar con GitHub.');
  } finally {
    clearTimeout(timeout);
  }
}

function throwForGithubResponse(response: Response): never {
  if (response.status === 404 || response.status === 409) {
    throw new GithubRepositoryError('github_not_found', 'El repositorio público no existe o todavía no contiene commits.');
  }
  if (response.status === 429 || (response.status === 403 && response.headers.get('x-ratelimit-remaining') === '0')) {
    throw new GithubRepositoryError('github_rate_limit', 'GitHub alcanzó el límite de consultas. Intentá nuevamente más tarde.');
  }
  throw new GithubRepositoryError('github_unavailable', 'GitHub no pudo preparar el repositorio solicitado.');
}

export async function resolvePublicGithubRepository(
  parsed: ParsedGithubRepositoryUrl,
  options: { fetchFn?: FetchLike; token?: string; timeoutMs?: number } = {},
): Promise<ResolvedGithubRepository> {
  const fetchFn = options.fetchFn || fetch;
  const token = options.token ?? process.env.GITHUB_API_TOKEN;
  const timeoutMs = options.timeoutMs ?? GITHUB_INGESTION_LIMITS.metadataTimeoutMs;
  const base = `https://api.github.com/repos/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.repository)}`;
  const repositoryResponse = await fetchWithTimeout(fetchFn, base, { headers: githubHeaders(token), redirect: 'error' }, timeoutMs);
  if (!repositoryResponse.ok) throwForGithubResponse(repositoryResponse);
  const repository = await repositoryResponse.json() as { private?: boolean; full_name?: string; html_url?: string; default_branch?: string };
  if (repository.private) throw new GithubRepositoryError('github_private', 'Los repositorios privados no son elegibles para la preevaluación.');
  if (!repository.default_branch || !repository.full_name) {
    throw new GithubRepositoryError('github_not_found', 'El repositorio público todavía no contiene un commit evaluable.');
  }

  const commitResponse = await fetchWithTimeout(
    fetchFn,
    `${base}/commits/${encodeURIComponent(repository.default_branch)}`,
    { headers: githubHeaders(token), redirect: 'error' },
    timeoutMs,
  );
  if (!commitResponse.ok) throwForGithubResponse(commitResponse);
  const commit = await commitResponse.json() as { sha?: string };
  if (!commit.sha || !/^[a-f0-9]{40}$/i.test(commit.sha)) {
    throw new GithubRepositoryError('github_not_found', 'GitHub no devolvió un commit válido para el repositorio.');
  }

  const [owner, repositoryName] = repository.full_name.split('/');
  return {
    owner,
    repository: repositoryName,
    fullName: repository.full_name,
    canonicalUrl: `https://github.com/${repository.full_name}`,
    defaultBranch: repository.default_branch,
    commitSha: commit.sha.toLowerCase(),
  };
}

const DOWNLOAD_HOSTS = new Set(['api.github.com', 'codeload.github.com']);

export async function downloadGithubZipball(
  repositoryFullName: string,
  commitSha: string,
  options: { fetchFn?: FetchLike; token?: string; timeoutMs?: number; maxBytes?: number } = {},
): Promise<Uint8Array> {
  if (!/^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/.test(repositoryFullName) || !/^[a-f0-9]{40}$/i.test(commitSha)) {
    throw new GithubRepositoryError('github_not_found', 'La referencia del repositorio no es válida.');
  }
  const fetchFn = options.fetchFn || fetch;
  const token = options.token ?? process.env.GITHUB_API_TOKEN;
  const timeoutMs = options.timeoutMs ?? GITHUB_INGESTION_LIMITS.downloadTimeoutMs;
  const maxBytes = options.maxBytes ?? GITHUB_INGESTION_LIMITS.maxCompressedBytes;
  let url = `https://api.github.com/repos/${repositoryFullName}/zipball/${commitSha}`;

  let response: Response | null = null;
  for (let redirects = 0; redirects <= GITHUB_INGESTION_LIMITS.maxRedirects; redirects += 1) {
    const current = new URL(url);
    if (current.protocol !== 'https:' || !DOWNLOAD_HOSTS.has(current.hostname)) {
      throw new GithubRepositoryError('github_unavailable', 'GitHub intentó redirigir la descarga a un destino no permitido.');
    }
    try {
      response = await fetchFn(current.toString(), {
        redirect: 'manual',
        signal: AbortSignal.timeout(timeoutMs),
        headers: current.hostname === 'api.github.com' ? githubHeaders(token) : { 'User-Agent': 'epixum-ai-preevaluation' },
      });
    } catch (error) {
      if (error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError')) {
        throw new GithubRepositoryError('github_timeout', 'GitHub no completó la descarga dentro del tiempo permitido.');
      }
      throw new GithubRepositoryError('github_unavailable', 'No se pudo descargar el repositorio desde GitHub.');
    }
    if (![301, 302, 303, 307, 308].includes(response.status)) break;
    const location = response.headers.get('location');
    if (!location) throw new GithubRepositoryError('github_unavailable', 'GitHub devolvió una redirección inválida.');
    url = new URL(location, current).toString();
    if (redirects === GITHUB_INGESTION_LIMITS.maxRedirects) {
      throw new GithubRepositoryError('github_unavailable', 'GitHub excedió el máximo de redirecciones permitido.');
    }
  }
  if (!response?.ok) throwForGithubResponse(response!);
  const declaredLength = Number(response.headers.get('content-length') || 0);
  if (declaredLength > maxBytes) throw new GithubRepositoryError('repository_limits', 'El repositorio supera el límite de descarga del piloto.');
  if (!response.body) throw new GithubRepositoryError('github_unavailable', 'GitHub devolvió una descarga vacía.');

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new GithubRepositoryError('repository_limits', 'El repositorio supera el límite de descarga del piloto.');
      }
      chunks.push(value);
    }
  } catch (error) {
    if (error instanceof GithubRepositoryError) throw error;
    if (error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError')) {
      throw new GithubRepositoryError('github_timeout', 'GitHub no completó la descarga dentro del tiempo permitido.');
    }
    throw new GithubRepositoryError('github_unavailable', 'La descarga del repositorio se interrumpió.');
  }
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.byteLength; }
  return result;
}

const ALLOWED_EXTENSIONS = new Set([
  '.c', '.cc', '.cpp', '.cs', '.css', '.go', '.h', '.hpp', '.html', '.java', '.js', '.jsx', '.kt', '.kts',
  '.md', '.mjs', '.mts', '.php', '.properties', '.py', '.rb', '.rs', '.scss', '.sh', '.sql', '.swift',
  '.toml', '.ts', '.tsx', '.txt', '.vue', '.xml', '.yaml', '.yml', '.json', '.graphql', '.gql', '.prisma',
]);
const PRIORITY_FILES = /^(readme(?:\.[^.]+)?|dockerfile|makefile|package\.json|tsconfig(?:\.[^.]+)?\.json|vite\.config\.[^.]+|next\.config\.[^.]+)$/i;
const EXCLUDED_DIRECTORIES = new Set(['.git', 'node_modules', '.next', 'dist', 'build', 'coverage', 'vendor', 'target', '.cache']);
const SENSITIVE_FILE = /(^|\/)(\.env(?:\..*)?|id_rsa|id_ed25519|.*\.(?:pem|key|p12|pfx)|credentials(?:\..*)?|secrets?(?:\..*)?)$/i;
const GENERATED_FILE = /(?:\.min\.(?:js|css)$|\.map$|(?:package-lock|pnpm-lock|yarn\.lock|composer\.lock)$)/i;

function normalizedArchivePath(entry: JSZip.JSZipObject) {
  const original = (entry as JSZip.JSZipObject & { unsafeOriginalName?: string }).unsafeOriginalName || entry.name;
  const slashPath = original.replace(/\\/g, '/');
  if (slashPath.startsWith('/') || /^[A-Za-z]:\//.test(slashPath) || slashPath.split('/').includes('..')) {
    throw new GithubRepositoryError('repository_limits', 'El archivo ZIP contiene una ruta no segura.');
  }
  const segments = slashPath.split('/').filter(Boolean);
  return segments.length > 1 ? segments.slice(1).join('/') : segments.join('/');
}

function omissionReason(path: string, size: number): string | null {
  const segments = path.split('/');
  if (segments.some((segment) => EXCLUDED_DIRECTORIES.has(segment))) return 'directorio excluido';
  if (SENSITIVE_FILE.test(path)) return 'archivo sensible';
  if (GENERATED_FILE.test(path)) return 'archivo generado o lockfile voluminoso';
  if (size > GITHUB_INGESTION_LIMITS.maxTextFileBytes) return 'archivo de texto fuera de límite';
  const lower = path.toLowerCase();
  const name = segments.at(-1) || '';
  const extension = name.includes('.') ? name.slice(name.lastIndexOf('.')) : '';
  if (!ALLOWED_EXTENSIONS.has(extension) && !PRIORITY_FILES.test(name) && !lower.includes('/test') && !lower.includes('/spec')) return 'tipo de archivo no admitido';
  return null;
}

export async function prepareRepositoryEvidence(zipBytes: Uint8Array, commitSha: string): Promise<RepositoryEvidence> {
  if (zipBytes.byteLength > GITHUB_INGESTION_LIMITS.maxCompressedBytes) {
    throw new GithubRepositoryError('repository_limits', 'El repositorio supera el límite comprimido del piloto.');
  }
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(zipBytes, { checkCRC32: true, createFolders: false });
  } catch {
    throw new GithubRepositoryError('repository_limits', 'GitHub devolvió un archivo ZIP inválido.');
  }
  const entries = Object.values(zip.files);
  if (entries.length > GITHUB_INGESTION_LIMITS.maxEntries) {
    throw new GithubRepositoryError('repository_limits', 'El repositorio contiene demasiadas entradas para el piloto.');
  }

  const candidates: Array<{ entry: JSZip.JSZipObject; path: string; size: number }> = [];
  const omittedFiles: Array<{ path: string; reason: string }> = [];
  let expandedBytes = 0;
  for (const entry of entries) {
    const path = normalizedArchivePath(entry);
    if (!path || entry.dir) continue;
    const permissions = typeof entry.unixPermissions === 'number' ? entry.unixPermissions : 0;
    if ((permissions & 0o170000) === 0o120000) throw new GithubRepositoryError('repository_limits', 'El archivo ZIP contiene enlaces simbólicos no admitidos.');
    const internal = entry as JSZip.JSZipObject & { _data?: { uncompressedSize?: number } };
    const size = Number(internal._data?.uncompressedSize || 0);
    expandedBytes += size;
    if (expandedBytes > GITHUB_INGESTION_LIMITS.maxExpandedBytes) {
      throw new GithubRepositoryError('repository_limits', 'El repositorio supera el límite expandido del piloto.');
    }
    const reason = omissionReason(path, size);
    if (reason) omittedFiles.push({ path, reason });
    else candidates.push({ entry, path, size });
  }

  candidates.sort((left, right) => {
    const priority = Number(PRIORITY_FILES.test(right.path.split('/').at(-1) || '')) - Number(PRIORITY_FILES.test(left.path.split('/').at(-1) || ''));
    return priority || left.path.localeCompare(right.path);
  });
  const includedFiles: string[] = [];
  const evidence: string[] = [];
  let includedBytes = 0;
  for (const candidate of candidates) {
    if (includedBytes + candidate.size > GITHUB_INGESTION_LIMITS.maxEvidenceBytes) {
      omittedFiles.push({ path: candidate.path, reason: 'límite agregado de evidencia' });
      continue;
    }
    const content = await candidate.entry.async('string');
    const actualBytes = Buffer.byteLength(content, 'utf8');
    if (actualBytes > GITHUB_INGESTION_LIMITS.maxTextFileBytes) {
      omittedFiles.push({ path: candidate.path, reason: 'archivo de texto fuera de límite' });
      continue;
    }
    includedBytes += actualBytes;
    includedFiles.push(candidate.path);
    evidence.push(`\n<<<ARCHIVO_NO_CONFIABLE ruta=${JSON.stringify(candidate.path)}>>>\n${content}\n<<<FIN_ARCHIVO_NO_CONFIABLE>>>`);
  }
  if (includedFiles.length === 0 || includedBytes < 20) {
    throw new GithubRepositoryError('insufficient_evidence', 'No quedó código o texto suficiente después del filtrado seguro.');
  }
  omittedFiles.sort((left, right) => left.path.localeCompare(right.path) || left.reason.localeCompare(right.reason));
  return {
    text: evidence.join('\n'),
    coverage: {
      commitSha: commitSha.toLowerCase(),
      includedFiles,
      omittedFiles,
      includedBytes,
      expandedBytes,
      totalEntries: entries.length,
      partial: omittedFiles.length > 0,
    },
  };
}
