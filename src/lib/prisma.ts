import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL ortam değişkeni tanımlı değil.");
  }

  const connectionUrl = new URL(databaseUrl);

  const isLocalDevelopment =
    process.env.NODE_ENV === "development" &&
    ["localhost", "127.0.0.1", "[::1]"].includes(
      connectionUrl.hostname,
    );

  if (isLocalDevelopment) {
    connectionUrl.searchParams.set(
      "allowPublicKeyRetrieval",
      "true",
    );
  }

  const adapter = new PrismaMariaDb(
    connectionUrl.toString(),
  );

  return new PrismaClient({ adapter });
}

export const prisma =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}