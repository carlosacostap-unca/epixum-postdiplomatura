import { spawn } from 'node:child_process';

const child = spawn(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', 'lib/course-outcomes.integration.test.ts'], { stdio: 'inherit', env: { ...process.env, RUN_COURSE_OUTCOME_INTEGRATION: 'true' } });
child.on('exit', code => { process.exitCode = code ?? 1; });
child.on('error', () => { console.error('No se pudo iniciar la validación de resultados de cursada.'); process.exitCode = 1; });
