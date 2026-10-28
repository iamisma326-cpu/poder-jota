import { defineConfig } from "@neon/config/v1";

export default defineConfig({
  // Declare your Neon services here
  auth: true,
  dataApi: {
    enabled: true,
    authProvider: "neon",
    settings: {
      dbSchemas: ["public"],
      serverCorsAllowedOrigins:
        "https://poder-jota.vercel.app,http://localhost:5173,http://localhost:4173",
    },
  },
  functions: {
    hello: { name: "Hello World", source: "./hello.ts" },
    // Sella la consulta de pagos en vivo (Neon Realtime).
    // El secreto se resuelve al hacer `neon deploy --env .env.local`.
    seal: {
      name: "Sellar consulta de pagos",
      source: "./seal.ts",
      env: { NEON_REALTIME_SECRET: process.env.NEON_REALTIME_SECRET! },
    },
  },
  buckets: {
    // "private" is the default; use "public_read" for anonymous reads
    assets: { access: "private" },
  },
  // Live SQL queries (notificaciones de pagos en vivo)
  preview: {
    realtime: {
      allowedOrigins: [
        "https://poder-jota.vercel.app",
        "http://localhost:5173",
        "http://localhost:4173",
      ],
    },
  },
  // Branch policy: per-branch tuning
  branch: (branch) => {
    if (branch.isDefault) {
      // Default branch: no overrides, uses project defaults
      return {};
    }
    if (!branch.exists) {
      // New non-default branches: auto-expire
      // Run `neon checkout <name>` to create a new branch with these settings
      return { ttl: "7d" };
    }
    // Existing branch: no changes
    return {};
  },
});
