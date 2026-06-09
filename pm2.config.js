module.exports = {
  apps: [
    {
      name: 'ubek-next',
      cwd: './next',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      env: { PORT: 3000, NODE_ENV: 'production' },
      max_restarts: 10,
      restart_delay: 3000,
      // Health check: curl localhost:3000/api/health every 30s
    },
    {
      name: 'ubek-agent',
      cwd: './agent',
      script: 'dist/index.js',
      env: { PORT: 4000, NODE_ENV: 'production' },
      max_restarts: 10,
      restart_delay: 3000,
      // Health check: curl localhost:4000/api/health every 30s
    },
  ],
};
