import JSZip from 'jszip';
import { describe, expect, it, vi } from 'vitest';
import {
  downloadGithubZipball,
  GithubRepositoryError,
  prepareRepositoryEvidence,
  resolvePublicGithubRepository,
} from './github-repository';

const parsed = {
  owner: 'epixum',
  repository: 'tp',
  fullName: 'epixum/tp',
  canonicalUrl: 'https://github.com/epixum/tp',
};
const sha = 'a'.repeat(40);

describe('cliente GitHub', () => {
  it('resuelve la rama predeterminada a un SHA completo', async () => {
    const fetchFn = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ private: false, full_name: 'Epixum/TP', default_branch: 'main' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ sha }), { status: 200 }));
    await expect(resolvePublicGithubRepository(parsed, { fetchFn })).resolves.toMatchObject({ fullName: 'Epixum/TP', commitSha: sha });
  });

  it('rechaza repositorios privados aunque el proveedor los revele', async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response(JSON.stringify({ private: true, full_name: 'epixum/tp', default_branch: 'main' }), { status: 200 }));
    await expect(resolvePublicGithubRepository(parsed, { fetchFn })).rejects.toMatchObject({ category: 'github_private' });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('clasifica inexistencia y rate limit', async () => {
    await expect(resolvePublicGithubRepository(parsed, { fetchFn: vi.fn().mockResolvedValue(new Response('', { status: 404 })) })).rejects.toMatchObject({ category: 'github_not_found' });
    await expect(resolvePublicGithubRepository(parsed, { fetchFn: vi.fn().mockResolvedValue(new Response('', { status: 403, headers: { 'x-ratelimit-remaining': '0' } })) })).rejects.toMatchObject({ category: 'github_rate_limit' });
  });

  it('cancela por timeout', async () => {
    const fetchFn = vi.fn((_url, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
    })) as unknown as typeof fetch;
    await expect(resolvePublicGithubRepository(parsed, { fetchFn, timeoutMs: 1 })).rejects.toMatchObject({ category: 'github_timeout' });
  });

  it('sigue solo la redirección oficial y no propaga el token', async () => {
    const fetchFn = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: `https://codeload.github.com/epixum/tp/legacy.zip/${sha}` } }))
      .mockResolvedValueOnce(new Response(new Uint8Array([1, 2, 3]), { status: 200, headers: { 'content-length': '3' } }));
    await expect(downloadGithubZipball('epixum/tp', sha, { fetchFn, token: 'secret' })).resolves.toEqual(new Uint8Array([1, 2, 3]));
    expect(fetchFn.mock.calls[0][1].headers.Authorization).toBe('Bearer secret');
    expect(fetchFn.mock.calls[1][1].headers.Authorization).toBeUndefined();
  });

  it('rechaza redirecciones hostiles antes de consultarlas', async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response(null, { status: 302, headers: { location: 'https://evil.example/archive.zip' } }));
    await expect(downloadGithubZipball('epixum/tp', sha, { fetchFn })).rejects.toBeInstanceOf(GithubRepositoryError);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('rechaza descargas que declaran superar el límite', async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response(new Uint8Array([1]), { status: 200, headers: { 'content-length': '20' } }));
    await expect(downloadGithubZipball('epixum/tp', sha, { fetchFn, maxBytes: 10 })).rejects.toMatchObject({ category: 'repository_limits' });
  });
});

describe('preparación de evidencia', () => {
  async function archive(files: Record<string, string>) {
    const zip = new JSZip();
    for (const [path, content] of Object.entries(files)) zip.file(`epixum-tp-${sha}/${path}`, content);
    return zip.generateAsync({ type: 'uint8array' });
  }

  it('selecciona fuentes y documentación con cobertura determinista', async () => {
    const bytes = await archive({
      'README.md': '# Trabajo práctico',
      'src/index.ts': 'export const answer = 42;',
      'tests/index.test.ts': 'expect(answer).toBe(42);',
      'node_modules/pkg/index.js': 'ignorado',
      '.env': 'SECRET=no-enviar',
      'logo.png': 'binario',
    });
    const result = await prepareRepositoryEvidence(bytes, sha);
    expect(result.coverage.includedFiles).toEqual(['README.md', 'src/index.ts', 'tests/index.test.ts']);
    expect(result.text).toContain('answer = 42');
    expect(result.text).not.toContain('SECRET=no-enviar');
    expect(result.coverage.omittedFiles).toEqual(expect.arrayContaining([
      { path: '.env', reason: 'archivo sensible' },
      { path: 'node_modules/pkg/index.js', reason: 'directorio excluido' },
    ]));
  });

  it('rechaza zip-slip aunque JSZip sanee el nombre visible', async () => {
    const zip = new JSZip();
    zip.file(`epixum-tp-${sha}/../secret.ts`, 'export const secret = true;');
    const bytes = await zip.generateAsync({ type: 'uint8array' });
    await expect(prepareRepositoryEvidence(bytes, sha)).rejects.toMatchObject({ category: 'repository_limits' });
  });

  it('rechaza proyectos sin evidencia suficiente', async () => {
    const bytes = await archive({ '.env': 'SECRET=x', 'logo.png': 'x' });
    await expect(prepareRepositoryEvidence(bytes, sha)).rejects.toMatchObject({ category: 'insufficient_evidence' });
  });
});
