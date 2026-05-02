import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config as loadDotenv } from "dotenv";

const DEFAULT_FILES = [".env", ".env.local"];

export function loadEnvFiles(baseDir = process.cwd()) {
  const loadedFiles = [];

  for (const fileName of DEFAULT_FILES) {
    const filePath = resolve(baseDir, fileName);
    if (!existsSync(filePath)) {
      continue;
    }

    loadDotenv({
      path: filePath,
      override: fileName === ".env.local",
    });
    loadedFiles.push(fileName);
  }

  return loadedFiles;
}

export function requireEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. Copy .env.example to .env.local or .env and set ${name}.`,
    );
  }

  return value;
}
