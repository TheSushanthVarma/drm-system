# Complete Supabase Connection Guide

This guide will walk you through connecting your DRM system to Supabase step by step.

## What You Need to Do in Supabase

### Step 1: Create/Open Your Supabase Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Either:
   - **Create a new project** (if you don't have one)
   - **Open your existing project** (if you already have one)

### Step 2: Get Your Database Connection String

1. In your Supabase project dashboard, go to **Settings** (gear icon in sidebar)
2. Click on **Database** in the settings menu
3. Scroll down to the **Connection string** section
4. Select **URI** format (not JDBC or other formats)
5. Choose **Connection pooling** (recommended) - this uses port 6543
6. Copy the connection string - it will look like:
   ```
   postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
   ```

**Important:** 
- Replace `[YOUR-PASSWORD]` with your actual database password
- The password is the one you set when creating the project (or you can reset it in Settings → Database)

### Step 3: Get Your Project URL and API Keys

1. Still in **Settings** → **API**
2. Copy these values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon/public key** (this is your publishable key - starts with `eyJ...`)

### Step 4: Set Up Database Schema

Your Supabase database needs to have the same schema as your local database. You have two options:

#### Option A: Push Schema Using Prisma (Recommended)
After setting up your `.env` file (see below), run:
```bash
npx prisma db push
```

This will create all tables, relationships, and enums in your Supabase database.

#### Option B: Run Migrations
```bash
npx prisma migrate dev --name init
```

## What I Need From You

Please provide me with the following information from your Supabase dashboard:

1. **Database Connection String** (from Settings → Database → Connection string → URI format)
   - It should look like: `postgresql://postgres.xxxxx:password@aws-0-region.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1`

2. **Project URL** (from Settings → API)
   - It should look like: `https://xxxxx.supabase.co`

3. **Anon/Public Key** (from Settings → API)
   - It's a long string starting with `eyJ...`

## What I'll Do For You

Once you provide the information above, I will:

1. ✅ Update your `.env` file with the correct values
2. ✅ Set `DB_CONNECTION=supabase` to enable Supabase connection
3. ✅ Configure all environment variables properly
4. ✅ Help you push the database schema to Supabase
5. ✅ Test the connection

## Manual Setup (If You Prefer)

If you want to set it up yourself, here's what to add to your `.env` file:

```env
# Database Connection Type
DB_CONNECTION=supabase

# Supabase Database Connection String
# Get this from: Supabase Dashboard → Settings → Database → Connection string (URI format)
SUPABASE_DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1

# Supabase Client Configuration
# Get these from: Supabase Dashboard → Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://[YOUR-PROJECT-REF].supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=[YOUR-ANON-KEY]

# Local Database (keep this for fallback)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/drm-system?schema=public
```

## After Setup - Push Your Schema

Once your `.env` is configured:

1. **Push the schema to Supabase:**
   ```bash
   npx prisma db push
   ```

2. **Generate Prisma client:**
   ```bash
   npx prisma generate
   ```

3. **(Optional) Seed your database:**
   ```bash
   npm run db:seed
   ```

## Testing the Connection

After setup, you can test if everything works:

1. Start your development server:
   ```bash
   npm run dev
   ```

2. The app should now connect to Supabase instead of your local database.

3. Check the console for any connection errors.

## Troubleshooting

### Connection Timeout
- Make sure your IP is allowed in Supabase (Settings → Database → Connection Pooling)
- For development, you might need to allow all IPs temporarily

### Authentication Failed
- Double-check your database password in the connection string
- You can reset your password in Supabase Dashboard → Settings → Database

### Schema Errors
- Make sure you've run `npx prisma db push` to create tables
- Check that the schema matches between your Prisma schema and Supabase

### Port Issues
- Use port **6543** for pooled connections (recommended)
- Use port **5432** for direct connections (if pooling doesn't work)

## Quick Checklist

- [ ] Created/opened Supabase project
- [ ] Got database connection string (URI format)
- [ ] Got Project URL from Settings → API
- [ ] Got Anon/Public key from Settings → API
- [ ] Updated `.env` file with all values
- [ ] Set `DB_CONNECTION=supabase`
- [ ] Ran `npx prisma db push`
- [ ] Ran `npx prisma generate`
- [ ] Tested the connection

---

**Ready?** Just share the three pieces of information mentioned above, and I'll set everything up for you! 🚀
