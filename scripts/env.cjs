const { loadEnvFile } = require('node:process');
const { resolve } = require('node:path');

const repoDir = resolve(__dirname, '..');

function loadEnvironment() {
  try {
    loadEnvFile(resolve(repoDir, 'infra/.env'));
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(
        'Crie infra/.env copiando infra/.env.example antes de executar.',
      );
    }
    throw error;
  }
}

exports.repoDir = repoDir;
exports.loadEnvironment = loadEnvironment;
