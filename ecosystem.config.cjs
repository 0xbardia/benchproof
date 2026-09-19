module.exports = {
  apps: [
    {
      name: "benchproof",
      cwd: "/root/benchproof",
      script: "node_modules/srvx/bin/srvx.mjs",
      interpreter: "/root/.nvm/versions/node/v22.23.2/bin/node",
      args: "serve --prod --host 127.0.0.1 --port 4300 --static /root/benchproof/.vercel/output/static --entry /root/benchproof/.vercel/output/functions/__server.func/index.mjs",
      env: {
        NODE_ENV: "production",
        PGLITE_DATA_DIR: "/root/benchproof/.data/pglite",
      },
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      watch: false,
    },
  ],
};
