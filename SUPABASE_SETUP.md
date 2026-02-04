# Supabase Database Setup Guide

## Step 1: Get Your Database Connection String

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/tgslczdanvsaowlzbdbf
2. Navigate to **Settings** → **Database**
3. Scroll down to the **Connection string** section
4. Select **URI** format
5. Copy the connection string (it will look like):
   ```
   postgresql://postgres.tgslczdanvsaowlzbdbf:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
   ```

## Step 2: Update Your .env File

Add or update these variables in your `drm-system/.env` file:

```env
# Supabase Client Configuration
NEXT_PUBLIC_SUPABASE_URL=https://tgslczdanvsaowlzbdbf.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=sb_publishable_gQBrFg8L64GvlNztz17KCQ_Cbky7tpq

# Database Connection (PostgreSQL via Supabase)
# Replace the DATABASE_URL below with the connection string from Step 1
DATABASE_URL=postgresql://postgres.tgslczdanvsaowlzbdbf:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
```

**Important Notes:**
- Replace `[YOUR-PASSWORD]` with your actual database password
- Replace `[REGION]` with your actual region (e.g., `us-east-1`, `eu-west-1`)
- The connection string uses port `6543` for pooled connections (recommended)
- For direct connections, use port `5432` instead

## Step 3: Run Prisma Migrations

After updating the DATABASE_URL, run Prisma migrations to sync your schema:

```bash
cd drm-system
npx prisma migrate dev
```

Or if you want to push the schema without creating a migration:

```bash
npx prisma db push
```

## Step 4: Generate Prisma Client

After migrations, regenerate the Prisma client:

```bash
npx prisma generate
```

## Alternative: Direct Connection String

If you prefer a direct connection (not pooled), use this format:

```env
DATABASE_URL=postgresql://postgres.tgslczdanvsaowlzbdbf:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
```

## Troubleshooting

- **Connection timeout**: Make sure your IP is allowed in Supabase dashboard (Settings → Database → Connection Pooling)
- **Authentication failed**: Double-check your password in the connection string
- **Schema not found**: Ensure `?schema=public` is included or matches your Supabase schema name
