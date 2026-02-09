# Netlify Deployment Guide

This guide explains how to deploy this Next.js application to Netlify with proper routing support.

## Prerequisites

1. A GitHub account with this repository
2. A Netlify account (free tier works)
3. Environment variables configured in Netlify

## Deployment Steps

### 1. Connect GitHub Repository to Netlify

1. Log in to [Netlify](https://app.netlify.com)
2. Click "Add new site" → "Import an existing project"
3. Choose "GitHub" and authorize Netlify to access your repositories
4. Select your repository (`drm-system`)
5. Configure the build settings:
   - **Branch to deploy**: `main` (or `master` if that's your default branch)
   - **Build command**: `npm run build` (already configured in `netlify.toml`)
   - **Publish directory**: `.next` (already configured in `netlify.toml`)

### 2. Configure Environment Variables

In Netlify dashboard, go to:
**Site settings** → **Environment variables**

Add all your required environment variables:

**For Supabase (Recommended):**
- `DATABASE_URL` - **Required!** Set this to your Supabase database connection string
  - Get it from: Supabase Dashboard → Settings → Database → Connection string → URI format
  - **Pooled connection (recommended)**: `postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1`
  - **Direct connection**: `postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres`
- `SUPABASE_DATABASE_URL` - Your Supabase database connection string (same as `DATABASE_URL`)
- `DIRECT_URL` - (Optional) Direct connection string for Prisma migrations (use port 5432, not 6543)
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL (e.g., `https://[PROJECT-REF].supabase.co`)
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` - Your Supabase publishable key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (for server-side operations)
- `DB_CONNECTION` - Set to `supabase`

**Important:** 
- `DATABASE_URL` **must** be set to your Supabase connection string, as Prisma needs it during the build process to generate the client
- You can use the same value for both `DATABASE_URL` and `SUPABASE_DATABASE_URL`
- Use port `6543` for pooled connections (recommended) or port `5432` for direct connections

### 3. Deploy

Netlify will automatically:
- Detect the `netlify.toml` configuration
- Install the `@netlify/plugin-nextjs` plugin automatically
- Build and deploy your site
- Set up proper routing for Next.js App Router

### 4. Custom Domain (Optional)

If you want to use `tdc-drm.netlify.app`:
1. Go to **Site settings** → **Domain management**
2. Click **Options** next to your Netlify subdomain
3. Click **Edit site name**
4. Change it to `tdc-drm`

Or add a custom domain:
1. Click **Add custom domain**
2. Enter your domain name
3. Follow DNS configuration instructions

## How It Works

### Routing Configuration

The `netlify.toml` file configures:
- **Build command**: `npm run build` - Builds your Next.js app
- **Publish directory**: `.next` - Where Next.js outputs the build
- **Next.js Plugin**: `@netlify/plugin-nextjs` - Handles all Next.js routing automatically

### Automatic Deployments

- **Main branch**: Every push to `main` branch triggers a new deployment
- **Pull requests**: Netlify creates preview deployments for PRs
- **Build status**: Check build logs in the Netlify dashboard

## Troubleshooting

### Routing Issues

If routes aren't working:
1. Ensure `netlify.toml` is in the root directory
2. Check that `@netlify/plugin-nextjs` is being used (check build logs)
3. Verify environment variables are set correctly

### Build Failures

1. Check build logs in Netlify dashboard
2. Ensure Node.js version matches (configured as 20 in `netlify.toml`)
3. Verify all dependencies are in `package.json`
4. Ensure `DATABASE_URL` is set in Netlify environment variables (required for Prisma Client generation)

### Environment Variables

If the app isn't working:
1. Double-check all environment variables are set in Netlify
2. Redeploy after adding new environment variables
3. Ensure variable names match exactly (case-sensitive)

## File Structure

```
.
├── netlify.toml          # Netlify configuration
├── next.config.mjs       # Next.js configuration
├── package.json          # Dependencies and scripts
└── ...
```

## Support

For issues specific to:
- **Netlify**: Check [Netlify Documentation](https://docs.netlify.com/)
- **Next.js**: Check [Next.js Documentation](https://nextjs.org/docs)
- **Next.js on Netlify**: Check [Netlify Next.js Plugin](https://github.com/netlify/netlify-plugin-nextjs)
