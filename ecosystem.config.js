module.exports = {
  apps: [
    {
      name: "blockchain_data_collector",
      script: "build/index.js",
      watch: false,
      autorestart: false,
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 5001,
      },
    },
  ],
};
