const { test } = require('node:test');
const assert = require('node:assert/strict');
const { assertDisposableEnvironment } = require('./e2e-environment.cjs');
const disposable = {
  COMPOSE_PROJECT_NAME: 'gpet-ci',
  GPET_E2E_DISPOSABLE: 'true',
  GPET_POSTGRES_DATA_DIR: '/tmp/gpet-ci/postgres',
  GPET_E2E_URL: 'http://127.0.0.1:18088',
};

test('aceita somente projeto descartável com armazenamento separado', () => {
  assert.doesNotThrow(() => assertDisposableEnvironment(disposable));
});
for (const [name, changed] of Object.entries({
  'sem opt-in': { GPET_E2E_DISPOSABLE: 'false' },
  'projeto da instalação': { COMPOSE_PROJECT_NAME: 'gpet' },
  'sem projeto': { COMPOSE_PROJECT_NAME: '' },
  'diretório da instalação': { GPET_POSTGRES_DATA_DIR: './infra/data/postgres' },
  'diretório padrão de produção': { GPET_POSTGRES_DATA_DIR: '/var/lib/gpet/postgres' },
  'caminho equivalente ao da instalação': { GPET_POSTGRES_DATA_DIR: './infra/data/../data/postgres' },
  'sem armazenamento separado': { GPET_POSTGRES_DATA_DIR: '' },
  'servidor externo': { GPET_E2E_URL: 'https://gpet.example' },
})) {
  test(`bloqueia E2E: ${name}`, () => {
    assert.throws(() => assertDisposableEnvironment({ ...disposable, ...changed }));
  });
}
