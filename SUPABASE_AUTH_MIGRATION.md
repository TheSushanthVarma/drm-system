# Supabase Authentication Migration Guide

This guide explains the changes made to integrate Supabase Authentication into the DRM system while maintaining role-based access control.

## Overview

The system has been migrated from custom authentication (bcrypt passwords) to Supabase Authentication. All user authentication is now handled by Supabase, while user profiles (roles, status, etc.) are stored in our database and linked to Supabase auth users via UUID.

## Key Changes

### 1. Database Schema Changes

- **User ID**: Changed from `Int` (auto-increment) to `String` (UUID from Supabase)
- **Password Field**: Removed (now handled by Supabase Auth)
- **All Foreign Keys**: Updated to use `String` (UUID) instead of `Int`

### 2. Authentication Flow

**Before:**
- Custom login with bcrypt password verification
- Session stored in cookies as base64-encoded JSON

**After:**
- Login handled by Supabase Auth
- Session managed by Supabase (JWT tokens)
- User profile fetched from database using Supabase user ID

### 3. Files Modified

#### Schema & Database
- `prisma/schema.prisma` - Updated User model and all foreign key references
- `prisma/seed.ts` - Updated to create users in Supabase Auth first, then profiles

#### Authentication
- `lib/auth.ts` - Completely rewritten to use Supabase Auth
- `contexts/auth-context.tsx` - Updated AuthUser interface (id: string)

#### API Routes
- All API routes automatically work with UUIDs (no code changes needed)
- Routes continue to use `getSession()` which now fetches from Supabase

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

This will install `@supabase/supabase-js` which is needed for the seed script.

### 2. Environment Variables

Add these to your `.env.local` file:

```env
# Supabase Configuration (already should exist)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your_anon_key

# Required for seed script (create users in Supabase Auth)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**Important:** The `SUPABASE_SERVICE_ROLE_KEY` is required for the seed script to create users in Supabase Auth. You can find this in:
- Supabase Dashboard → Settings → API → `service_role` key (keep this secret!)

### 3. Database Migration

Run the migration to update your database schema:

```bash
# Generate Prisma client with new schema
npx prisma generate

# Push schema changes to database
npx prisma db push

# Or create a migration
npx prisma migrate dev --name migrate_to_supabase_auth
```

**⚠️ Warning:** This migration will:
- Change all user IDs from integers to UUIDs
- Remove the password column
- Update all foreign key relationships

**If you have existing data:**
1. Export your data first
2. The migration will require manual data migration
3. You'll need to create users in Supabase Auth and map old IDs to new UUIDs

### 4. Seed Database

After migration, seed the database with test users:

```bash
npm run db:seed
```

This will:
1. Create users in Supabase Auth (with passwords)
2. Create user profiles in your database (linked via UUID)
3. Create sample requests, comments, and assets

**Default Password:** All seeded users have password: `testuser123`

### 5. Test Authentication

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Try logging in with:
   - Email: `admin@drm-system.com`
   - Password: `testuser123`

## User Management

### Creating New Users

Users must be created in two places:

1. **Supabase Auth** - For authentication
2. **Your Database** - For profile (role, status, etc.)

#### Option 1: Via Supabase Dashboard
1. Go to Supabase Dashboard → Authentication → Users
2. Click "Add User" → "Create new user"
3. Enter email and password
4. Copy the user's UUID
5. Create profile in your database:

```typescript
await prisma.user.create({
  data: {
    id: "uuid-from-supabase",
    username: "username",
    email: "email@example.com",
    role: "requester",
    status: "active",
  },
})
```

#### Option 2: Via API (Admin Only)
Create an admin API endpoint that:
1. Creates user in Supabase Auth using service role key
2. Creates profile in database with the returned UUID

### Updating User Roles

User roles are stored in your database, not Supabase Auth:

```typescript
await prisma.user.update({
  where: { id: userId },
  data: { role: "designer" },
})
```

### Deactivating Users

Set status to "inactive" in your database:

```typescript
await prisma.user.update({
  where: { id: userId },
  data: { status: "inactive" },
})
```

The user will still be able to authenticate in Supabase, but `getSession()` will return `null` for inactive users.

## Role-Based Access Control

Role-based access control remains unchanged:

- **Admin**: Full access to all features
- **Designer**: Can view all requests, upload assets, change status of assigned requests
- **Requester**: Can create requests, view own requests, download final assets

All permission checks continue to work as before.

## API Changes

### Authentication Endpoints

- `POST /api/auth/login` - Uses Supabase Auth (no changes needed)
- `POST /api/auth/logout` - Uses Supabase Auth (no changes needed)
- `GET /api/auth/me` - Returns user profile from database (no changes needed)

### Other Endpoints

All other API endpoints continue to work without changes. They use `getSession()` which now fetches from Supabase.

## Troubleshooting

### "User profile not found" error

This means a user exists in Supabase Auth but not in your database. Create the profile:

```typescript
const { data: { user } } = await supabase.auth.getUser()
await prisma.user.create({
  data: {
    id: user.id,
    username: user.email.split('@')[0],
    email: user.email,
    role: "requester",
    status: "active",
  },
})
```

### Seed script fails with "Missing Supabase environment variables"

Make sure you have:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

in your `.env.local` file.

### Users can't log in after migration

1. Check if users exist in Supabase Auth
2. Check if user profiles exist in your database
3. Verify the UUIDs match between Supabase Auth and your database

### TypeScript errors about user.id

Make sure you've:
1. Run `npx prisma generate` after schema changes
2. Restarted your TypeScript server
3. Updated all `AuthUser` interfaces to use `id: string` instead of `id: number`

## Migration Checklist

- [ ] Install dependencies (`npm install`)
- [ ] Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local`
- [ ] Run `npx prisma generate`
- [ ] Run database migration (`npx prisma db push` or `npx prisma migrate dev`)
- [ ] Run seed script (`npm run db:seed`)
- [ ] Test login with seeded users
- [ ] Verify role-based access still works
- [ ] Update any custom user creation flows

## Next Steps

1. **Set up email templates** in Supabase Dashboard → Authentication → Email Templates
2. **Configure password reset** flows if needed
3. **Set up OAuth providers** (Google, GitHub, etc.) if desired
4. **Configure RLS policies** in Supabase if you want database-level security

## Support

If you encounter issues:
1. Check Supabase Dashboard → Logs for authentication errors
2. Check your application logs for database errors
3. Verify environment variables are set correctly
4. Ensure Prisma client is regenerated after schema changes
