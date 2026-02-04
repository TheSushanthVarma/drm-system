import * as dotenv from "dotenv"
import * as path from "path"
import { PrismaClient } from "./generated/prisma/client"

// Load .env file explicitly
dotenv.config({ path: path.resolve(process.cwd(), ".env") })

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Use explicit database URL - fallback to direct connection string if env var not found
const databaseUrl = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/drm-system?schema=public"

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl,
    },
  },
})

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma

