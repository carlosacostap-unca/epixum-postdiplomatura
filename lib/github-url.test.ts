import { describe, expect, it } from 'vitest';
import { parseGithubRepositoryUrl } from './github-url';

describe('parseGithubRepositoryUrl', () => {
  it.each([
    ['https://github.com/epixum/trabajo', 'https://github.com/epixum/trabajo'],
    ['https://github.com/epixum/trabajo/', 'https://github.com/epixum/trabajo'],
    ['https://github.com/epixum/trabajo.git', 'https://github.com/epixum/trabajo'],
  ])('normaliza una raíz pública elegible: %s', (value, canonicalUrl) => {
    expect(parseGithubRepositoryUrl(value)).toMatchObject({ fullName: 'epixum/trabajo', canonicalUrl });
  });

  it.each([
    'http://github.com/a/b',
    'https://gitlab.com/a/b',
    'https://user:password@github.com/a/b',
    'https://github.com/a/b?tab=readme',
    'https://github.com/a/b#readme',
    'https://github.com/a/b/issues',
    'https://github.com/a/b/blob/main/index.ts',
    'https://gist.github.com/a/b',
    'https://github.com/a%2Fb/c',
    'https://github.com/a',
  ])('rechaza hosts, credenciales, parámetros o rutas no raíz: %s', (value) => {
    expect(parseGithubRepositoryUrl(value)).toBeNull();
  });
});
