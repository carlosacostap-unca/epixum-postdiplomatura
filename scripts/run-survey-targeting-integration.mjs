import { spawn } from 'node:child_process';
const child = spawn(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', 'lib/survey-targeting.integration.test.ts'], { stdio: 'inherit', env: { ...process.env, RUN_SURVEY_TARGETING_INTEGRATION: 'true' } });
child.on('exit', code => { process.exitCode = code ?? 1; });
child.on('error', () => { console.error('No se pudo iniciar la validación de destinatarios.'); process.exitCode = 1; });
