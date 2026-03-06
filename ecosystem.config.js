module.exports = {
  apps: [{
    name: 'backend-api',
    script: './dist/server.js',
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    env: {
      NODE_ENV: 'production',
      PORT: 4000
    },
    env_file: '.env',
    error_file: '~/.pm2/logs/backend-api-error.log',
    out_file: '~/.pm2/logs/backend-api-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    max_memory_restart: '500M'
  }]
};
