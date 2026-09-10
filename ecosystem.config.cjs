// PM2 process configuration for Vortex Panel on a Linux VPS.
// Start with: pm2 start ecosystem.config.cjs
// Save/Resurrect for boot persistence:
//   pm2 save && pm2 startup
module.exports = {
  apps: [
    {
      name: "vortex-panel",
      script: "dist/server.cjs",
      // PM2 handles --env production vs --env development via env_* blocks below.
      env: {
        NODE_ENV: "production",
      },
      // Optional overrides - export these in the shell before `pm2 start`,
      // or list them here directly (values below are placeholders).
      // Example: GEMINI_API_KEY comes from your .env file, loaded by the app itself.
      env_production: {
        NODE_ENV: "production",
      },
      instances: 1, // in-memory rate limiter + state: keep single instance
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "400M",
      watch: false,
      // Robust restart policy for crashes and reboots
      min_uptime: "10s",
      max_restarts: 10,
      restart_delay: 4000,
      out_file: "logs/vortex-out.log",
      error_file: "logs/vortex-error.log",
      merge_logs: true,
      time: true,
    },
  ],
};
