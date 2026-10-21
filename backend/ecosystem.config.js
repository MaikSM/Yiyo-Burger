module.exports = {
  apps: [{
    name: 'restausync-backend',
    script: './dist/app.js',
    cwd: 'C:\\Users\\Administrator\\Desktop\\Restausync Oficcial\\Restausync Oficcial v1\\backend',
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
