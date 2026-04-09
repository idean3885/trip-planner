import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaNeon({
      connectionString: process.env.DATABASE_URL!,
    }),
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
