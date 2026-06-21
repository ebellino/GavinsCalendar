import { PrismaClient } from "@/generated/prisma/client";

// Reuses a single PrismaClient across hot reloads in dev instead of opening a
// new connection pool on every file change.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
