/**
 * Setup script to create the first admin user
 * Run this with: node scripts/create-admin.mjs
 */

import { PrismaClient } from "@prisma/client";
import { createHash } from "crypto";
import { createInterface } from "readline";

const prisma = new PrismaClient();

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
  console.log("=== Create Admin User ===\n");

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
      role: "ADMIN",
      isActive: true,
    },
  });

  console.log(`\n✅ Admin user created successfully!`);
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
  });
