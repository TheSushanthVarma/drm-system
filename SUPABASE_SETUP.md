# Supabase Database Setup Guide

## Step 1: Get Your Database Connection String

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **Settings** → **Database**
4. Scroll down to the **Connection string** section
5. Select **URI** format
6. Copy the connection string (it will look like):
   ```
   postgresql://postgres.your-project-ref:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
   ```

## Step 2: Update Your .env File

Add or update these variables in your `drm-system/.env` file:

```env
# Database Connection Type
# Set to "supabase" to use Supabase database, or "local" (or leave unset) to use local DATABASE_URL
DB_CONNECTION=supabase

# Supabase Client Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your_publishable_key_here

# Supabase Database Connection (used when DB_CONNECTION=supabase)
# Replace the SUPABASE_DATABASE_URL below with the connection string from Step 1
SUPABASE_DATABASE_URL=postgresql://postgres.your-project-ref:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1

# Local Database Connection (used when DB_CONNECTION=local or not set)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/drm-system?schema=public
```

**Important Notes:**
- Replace `[YOUR-PASSWORD]` with your actual database password
- Replace `[REGION]` with your actual region (e.g., `us-east-1`, `eu-west-1`)
- The connection string uses port `6543` for pooled connections (recommended)
- For direct connections, use port `5432` instead

## How Database Connection Works

The application uses the `DB_CONNECTION` environment variable to determine which database to connect to:

- **`DB_CONNECTION=supabase`**: Connects to Supabase using `SUPABASE_DATABASE_URL`
- **`DB_CONNECTION=local`** or **unset**: Connects to local database using `DATABASE_URL`

This allows you to easily switch between local development and Supabase production databases without changing your code.

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
DATABASE_URL=postgresql://postgres.your-project-ref:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
```

## Troubleshooting

- **Connection timeout**: Make sure your IP is allowed in Supabase dashboard (Settings → Database → Connection Pooling)
- **Authentication failed**: Double-check your password in the connection string
- **Schema not found**: Ensure `?schema=public` is included or matches your Supabase schema name
