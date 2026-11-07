import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { loadEnvironment, repoDir } from './env.cjs';

loadEnvironment();
const frontendDir = resolve(repoDir, 'gpet-frontend');
const child = spawn(
  process.execPath,
  [
    resolve(frontendDir, 'node_modules/@angular/cli/bin/ng.js'),
    'serve',
    '--host',
    process.env.GPET_FRONTEND_HOST,
    '--port',
    process.env.GPET_FRONTEND_PORT,
    ...process.argv.slice(2),
  ],
  { cwd: frontendDir, env: process.env, stdio: 'inherit' },
);
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal));
}
child.on('error', (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
