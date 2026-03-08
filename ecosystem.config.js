export default {
  apps: [
    {
      name: "school-saas-server",
      script: "server/server.js",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "development",
      },
      env_production: {
        NODE_ENV: "production",
      },
    },
    {
      name: "school-saas-client",
      script: "C:\\Program Files\\nodejs\\npm.cmd",
      args: "run dev",
      cwd: "client",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "development",
      },
      env_production: {
        NODE_ENV: "production",
      },
    },
  ],
};
