/**
 * Setup script to create the first ORBISY admin user
 * Run this with: npm run db:create-admin
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createHash } from "crypto";
import { createInterface } from "readline";
import pg from "pg";
import { loadEnvFiles, requireEnv } from "./load-env.mjs";

const { Pool } = pg;

loadEnvFiles();

const pool = new Pool({
  connectionString: requireEnv("DATABASE_URL"),
});

const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
});

function hashPassword(password) {
  return createHash("sha256").update(password).digest("hex");
}

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function main() {
  console.log("=== Create ORBISY Admin User ===\n");

  const loadedFiles = loadEnvFiles();
  console.log(
    `Loaded environment from: ${loadedFiles.length > 0 ? loadedFiles.join(", ") : "none"}`,
  );

  const name = await question("Enter admin name: ");
  const email = await question("Enter admin email: ");
  const password = await question("Enter admin password: ");

  // Check if user already exists
  const existing = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (existing) {
    console.error(`\n❌ User with email ${email} already exists!`);
    process.exit(1);
  }

  // Create admin user
  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      password: hashPassword(password),
      name,
      role: "ORBISY_ADMIN",
      isActive: true,
    },
  });

  console.log(`\n✅ ORBISY admin user created successfully!`);
  console.log(`\nUser Details:`);
  console.log(`- Name: ${user.name}`);
  console.log(`- Email: ${user.email}`);
  console.log(`- Role: ${user.role}`);
  console.log(`\nYou can now log in at /login`);
}

main()
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  })
  .finally(async () => {
    rl.close();
    await prisma.$disconnect();
    await pool.end();
  });
