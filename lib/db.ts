import * as dotenv from "dotenv"
import * as path from "path"
import { PrismaClient } from "./generated/prisma/client"

// Load .env file explicitly
dotenv.config({ path: path.resolve(process.cwd(), ".env") })

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Determine database connection based on DB_CONNECTION environment variable
function getDatabaseUrl(): string {
  const dbConnection = process.env.DB_CONNECTION?.toLowerCase()

  // If DB_CONNECTION is set to "supabase", use Supabase connection
  if (dbConnection === "supabase") {
    // For Supabase, prefer SUPABASE_DATABASE_URL, fallback to DATABASE_URL
    const supabaseUrl = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL
    if (!supabaseUrl) {
      throw new Error(
        "DB_CONNECTION is set to 'supabase' but neither SUPABASE_DATABASE_URL nor DATABASE_URL is defined in environment variables"
      )
    }
    return supabaseUrl
  }

  // Otherwise, use local DATABASE_URL (default behavior)
  const localUrl = process.env.DATABASE_URL
  if (!localUrl) {
    // Fallback to default local connection string
    return "postgresql://postgres:postgres@localhost:5432/drm-system?schema=public"
  }
  return localUrl
}

const databaseUrl = getDatabaseUrl()

// Prisma client configuration
// If DIRECT_URL is provided, Prisma will use it for migrations and direct connections
// DATABASE_URL is used for connection pooling
const prismaConfig: any = {
  datasources: {
    db: {
      url: databaseUrl,
    },
  },
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient(prismaConfig)

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma

