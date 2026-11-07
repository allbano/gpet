const { resolve } = require('node:path');
const { repoDir } = require('./env.cjs');

function assertDisposableEnvironment(env) {
  if (env.GPET_E2E_DISPOSABLE !== 'true' || !env.COMPOSE_PROJECT_NAME || env.COMPOSE_PROJECT_NAME === 'gpet') {
    throw new Error('E2E altera usuários e senhas. Use GPET_E2E_DISPOSABLE=true e um COMPOSE_PROJECT_NAME de teste, diferente de gpet.');
  }
  if (!env.GPET_POSTGRES_DATA_DIR || [resolve(repoDir, 'infra/data/postgres'), '/var/lib/gpet/postgres'].includes(resolve(repoDir, env.GPET_POSTGRES_DATA_DIR))) {
    throw new Error('Configure GPET_POSTGRES_DATA_DIR em um diretório descartável separado dos dados da instalação.');
  }
  const url = new URL(env.GPET_E2E_URL);
  if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
    throw new Error('Os testes E2E devem usar uma instalação descartável em loopback.');
  }
}

exports.assertDisposableEnvironment = assertDisposableEnvironment;
