export interface ParsedGithubRepositoryUrl {
  owner: string;
  repository: string;
  fullName: string;
  canonicalUrl: string;
}

const OWNER_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
const REPOSITORY_PATTERN = /^(?!\.)(?!.*\.\.)(?!.*\.git$)[A-Za-z0-9._-]{1,100}$/i;

export function parseGithubRepositoryUrl(value: string): ParsedGithubRepositoryUrl | null {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || url.hostname.toLowerCase() !== 'github.com' || url.port) return null;
  if (url.username || url.password || url.search || url.hash) return null;
  if (/%2f|%5c/i.test(url.pathname)) return null;

  const segments = url.pathname.split('/').filter(Boolean);
  if (segments.length !== 2) return null;
  const decodedSegments = segments.map((segment) => {
    try { return decodeURIComponent(segment); } catch { return ''; }
  });
  const owner = decodedSegments[0];
  let repository = decodedSegments[1];
  repository = repository.replace(/\.git$/i, '');
  if (!OWNER_PATTERN.test(owner) || !REPOSITORY_PATTERN.test(repository)) return null;

  return {
    owner,
    repository,
    fullName: `${owner}/${repository}`,
    canonicalUrl: `https://github.com/${owner}/${repository}`,
  };
}
