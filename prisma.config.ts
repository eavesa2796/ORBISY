import { defineConfig, env } from "prisma/config";
import { loadEnvFiles } from "./scripts/load-env.mjs";

loadEnvFiles();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
