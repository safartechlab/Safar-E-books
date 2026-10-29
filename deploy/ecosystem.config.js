// PM2 keeps the Node server running, restarts it if it crashes and starts
// it again after the VPS reboots.
//   pm2 start deploy/ecosystem.config.js
module.exports = {
  apps: [
    {
      name: "safar-ebooks",
      cwd: __dirname + "/../server",
      script: "server.js",
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "400M",
      env: {
        NODE_ENV: "production",
        SERVE_CLIENT: "true",
      },
    },
  ],
};
