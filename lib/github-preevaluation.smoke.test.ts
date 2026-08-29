import { describe, expect, it } from 'vitest';
import { downloadGithubZipball, prepareRepositoryEvidence, resolvePublicGithubRepository } from './github-repository';
import { parseGithubRepositoryUrl } from './github-url';

describe.skipIf(process.env.RUN_GITHUB_AI_SMOKE !== '1')('smoke GitHub público', () => {
  it('captura SHA, descarga por commit y genera cobertura sin OpenAI', async () => {
    const parsed = parseGithubRepositoryUrl('https://github.com/octocat/Spoon-Knife');
    expect(parsed).not.toBeNull();
    const repository = await resolvePublicGithubRepository(parsed!);
    const zip = await downloadGithubZipball(repository.fullName, repository.commitSha);
    const evidence = await prepareRepositoryEvidence(zip, repository.commitSha);
    expect(evidence.coverage.commitSha).toBe(repository.commitSha);
    expect(evidence.coverage.includedFiles.length).toBeGreaterThan(0);
  }, 60_000);
});
