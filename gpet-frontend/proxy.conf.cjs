const { loadEnvironment } = require('../scripts/env.cjs');

loadEnvironment();
module.exports = {
  '/api/**': {
    target: `http://127.0.0.1:${process.env.GPET_BACKEND_PORT}`,
    secure: false,
  },
};
