module.exports = {
  apps: [
    {
      name: 'tradepilot-api',
      script: './server/src/server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      error_file: './logs/api-err.log',
      out_file: './logs/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'tradepilot-worker',
      script: './worker/src/index.js',
      instances: 1, // Must be exactly 1 to avoid duplicate trade execution!
      autorestart: true,
      watch: false,
      max_memory_restart: '800M',
      restart_delay: 5000,
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/worker-err.log',
      out_file: './logs/worker-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};
