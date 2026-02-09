# Environment Variables Setup

## Required Environment Variables for Supabase Auth

Add these to your `.env` file (or `.env.local`):

```env
# Supabase Project URL
# Get from: Supabase Dashboard → Settings → API → Project URL
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co

# Supabase Publishable Key (Anon Key)
# Get from: Supabase Dashboard → Settings → API → Project API keys → anon/public key
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your_anon_key_here

# Supabase Service Role Key (REQUIRED for seed script)
# Get from: Supabase Dashboard → Settings → API → Project API keys → service_role key
# ⚠️ KEEP THIS SECRET - Never commit to git!
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Database Connection URLs
DATABASE_URL=postgresql://postgres.tgslczdanvsaowlzbdbf:[YOUR-PASSWORD]@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.tgslczdanvsaowlzbdbf:[YOUR-PASSWORD]@aws-1-ap-south-1.pooler.supabase.com:5432/postgres
```

## How to Find Your Supabase Keys

### 1. Go to Supabase Dashboard
- Visit: https://supabase.com/dashboard
- Select your project

### 2. Navigate to API Settings
- Click **Settings** (gear icon) in the left sidebar
- Click **API** in the settings menu

### 3. Copy the Required Values

**Project URL:**
- Look for "Project URL" section
- Copy the URL (e.g., `https://xxxxx.supabase.co`)
- This goes in `NEXT_PUBLIC_SUPABASE_URL`

**API Keys:**
- Scroll to "Project API keys" section
- You'll see two keys:
  - **`anon` / `public`** key → Use for `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`
  - **`service_role`** key → Use for `SUPABASE_SERVICE_ROLE_KEY` (⚠️ Keep secret!)

### 4. Database Connection Strings

**Pooled Connection (for app):**
- Go to **Settings** → **Database**
- Scroll to "Connection string" section
- Select **URI** format
- Select **Connection pooling** mode
- Copy the connection string → Use for `DATABASE_URL`

**Direct Connection (for migrations):**
- Same location as above
- Select **Direct connection** mode
- Copy the connection string → Use for `DIRECT_URL`

## Example .env File

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://tgslczdanvsaowlzbdbf.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=sb_publishable_gQBrFg8L64GvlNztz17KCQ_Cbky7tpq
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (your actual key)

# Database Connections
DATABASE_URL=postgresql://postgres.tgslczdanvsaowlzbdbf:your_password@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.tgslczdanvsaowlzbdbf:your_password@aws-1-ap-south-1.pooler.supabase.com:5432/postgres
```

## Security Notes

1. **Never commit `.env` to git** - It's already in `.gitignore`
2. **Service Role Key is powerful** - It bypasses Row Level Security (RLS)
3. **Use different keys for different environments** - Dev, staging, production
4. **Rotate keys regularly** - Especially if exposed

## Verifying Your Setup

After adding the variables, test them:

```bash
# Check if variables are loaded (in Node.js/TypeScript)
node -e "require('dotenv').config(); console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing'); console.log('Service Key:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing');"
```

Or run the seed script:
```bash
npm run db:seed
```

If variables are set correctly, the seed script will proceed. If not, you'll see an error message.

## Troubleshooting

### "Missing Supabase environment variables" error
- Make sure your `.env` file is in the project root
- Check that variable names match exactly (case-sensitive)
- Restart your terminal/IDE after adding variables
- Make sure there are no spaces around the `=` sign

### Variables not loading
- Try using `.env.local` instead of `.env` (Next.js prioritizes `.env.local`)
- Make sure you're running commands from the project root
- Check for syntax errors in `.env` file (no quotes needed for values)

### Service Role Key not working
- Make sure you copied the **service_role** key, not the anon key
- Verify the key hasn't been rotated in Supabase dashboard
- Check that the key doesn't have extra spaces or newlines
