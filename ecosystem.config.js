module.exports = {
  apps: [
    {
      name: "realtime-collector",
      script: "build/index.js",
      watch: false,
      autorestart: false,
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 5000,
      },
    },
  ],
};
