import { cookies } from "next/headers"
import { prisma } from "./db"
import { createClient } from "@/utils/supabase/server"

export type UserRole = "admin" | "designer" | "requester"

export interface AuthUser {
  id: string // UUID from Supabase
  username: string
  email: string
  role: UserRole
  status: "active" | "inactive"
}

/**
 * Get the current authenticated user from Supabase session
 * Returns the user profile from our database linked to Supabase auth
 */
export async function getSession(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    // Get the authenticated user from Supabase
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return null
    }

    // Get the user profile from our database
    const dbUser = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        status: true,
      },
    })

    if (!dbUser || dbUser.status === "inactive") {
      return null
    }

    return {
      id: dbUser.id,
      username: dbUser.username,
      email: dbUser.email,
      role: dbUser.role as UserRole,
      status: dbUser.status as "active" | "inactive",
    }
  } catch (error) {
    console.error("Session error:", error)
    return null
  }
}

/**
 * Login using Supabase Auth
 * Note: This function is kept for API compatibility but login should be handled client-side
 * For server-side login, use Supabase client directly
 */
export async function login(email: string, password: string): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    // Sign in with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error || !data.user) {
      return { success: false, error: error?.message || "Invalid email or password" }
    }

    // Get user profile from our database
    const dbUser = await prisma.user.findUnique({
      where: { id: data.user.id },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        status: true,
      },
    })

    if (!dbUser) {
      // User exists in Supabase auth but not in our database
      // This shouldn't happen, but handle it gracefully
      return { success: false, error: "User profile not found. Please contact an administrator." }
    }

    if (dbUser.status === "inactive") {
      // Sign out from Supabase if account is inactive
      await supabase.auth.signOut()
      return { success: false, error: "Your account is inactive. Please contact an administrator." }
    }

    // Update last login
    await prisma.user.update({
      where: { id: dbUser.id },
      data: { lastLogin: new Date() },
    })

    return {
      success: true,
      user: {
        id: dbUser.id,
        username: dbUser.username,
        email: dbUser.email,
        role: dbUser.role as UserRole,
        status: dbUser.status as "active" | "inactive",
      },
    }
  } catch (error) {
    console.error("Login error:", error)
    return { success: false, error: "An error occurred during login" }
  }
}

/**
 * Signup using Supabase Auth
 * Validates email domain and creates user with email verification required
 */
export async function signup(
  username: string,
  email: string,
  password: string,
  role: "designer" | "requester" = "requester"
): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    // Validate email domain - only allow @techdemocracy.com
    if (!email.endsWith("@techdemocracy.com")) {
      return {
        success: false,
        error: "Only @techdemocracy.com email addresses are allowed",
      }
    }

    // Validate username
    if (!username || username.trim().length === 0) {
      return {
        success: false,
        error: "Username is required",
      }
    }

    // Check if username already exists
    const existingUserByUsername = await prisma.user.findUnique({
      where: { username: username.trim() },
    })

    if (existingUserByUsername) {
      return {
        success: false,
        error: "Username already taken",
      }
    }

    // Check if email already exists
    const existingUserByEmail = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    })

    if (existingUserByEmail) {
      return {
        success: false,
        error: "Email already registered",
      }
    }

    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    // Sign up with Supabase Auth
    // Email confirmation is required by default in Supabase
    const { data, error } = await supabase.auth.signUp({
      email: email.toLowerCase().trim(),
      password,
      options: {
        data: {
          username: username.trim(),
        },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_VERCEL_URL || (process.env.NODE_ENV === "production" ? "https://tdc-drm.netlify.app" : "http://localhost:3000")}/auth/callback`,
      },
    })

    if (error) {
      return {
        success: false,
        error: error.message || "Failed to create account",
      }
    }

    if (!data.user) {
      return {
        success: false,
        error: "Failed to create account",
      }
    }

    // Create user profile in our database
    // Note: User will be created with status 'active' but email verification is still required
    try {
      await prisma.user.create({
        data: {
          id: data.user.id,
          username: username.trim(),
          email: email.toLowerCase().trim(),
          role: role, // Role selected during signup
          status: "active",
        },
      })
    } catch (dbError: any) {
      // If database creation fails, try to clean up Supabase auth user
      console.error("Database user creation error:", dbError)
      
      // Check if it's a unique constraint error (user might have been created in a race condition)
      if (dbError.code === "P2002") {
        return {
          success: false,
          error: "Username or email already exists",
        }
      }

      return {
        success: false,
        error: "Failed to create user profile. Please try again.",
      }
    }

    return {
      success: true,
      message: "Account created successfully. Please check your email to verify your account.",
    }
  } catch (error) {
    console.error("Signup error:", error)
    return {
      success: false,
      error: "An error occurred during signup",
    }
  }
}

/**
 * Logout from Supabase Auth
 */
export async function logout(): Promise<void> {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    await supabase.auth.signOut()
  } catch (error) {
    console.error("Logout error:", error)
  }
}

/**
 * Require authentication - throws if user is not authenticated
 */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getSession()
  if (!user) {
    throw new Error("Unauthorized")
  }
  return user
}

/**
 * Check if user has one of the specified roles
 */
export function hasRole(user: AuthUser, roles: UserRole[]): boolean {
  return roles.includes(user.role)
}

// Role-based permissions
export const permissions = {
  // Admin has full access
  admin: {
    canViewAllRequests: true,
    canCreateRequest: true,
    canEditAnyRequest: true,
    canDeleteRequest: true,
    canAssignDesigner: true,
    canChangeStatus: true,
    canUploadAssets: true,
    canDownloadAssets: true,
    canViewAdminPanel: true,
    canManageUsers: true,
  },
  // Designer can view requests, upload designs, change status
  designer: {
    canViewAllRequests: true,
    canCreateRequest: false,
    canEditAnyRequest: false,
    canDeleteRequest: false,
    canAssignDesigner: false,
    canChangeStatus: true, // Can change status of assigned requests
    canUploadAssets: true,
    canDownloadAssets: true,
    canViewAdminPanel: false,
    canManageUsers: false,
  },
  // Requester can create requests and download final outputs
  requester: {
    canViewAllRequests: false, // Can only view own requests
    canCreateRequest: true,
    canEditAnyRequest: false, // Can edit own drafts
    canDeleteRequest: false, // Can delete own drafts
    canAssignDesigner: false,
    canChangeStatus: false,
    canUploadAssets: false,
    canDownloadAssets: true, // Can download final approved/published assets
    canViewAdminPanel: false,
    canManageUsers: false,
  },
}

export function getPermissions(role: UserRole) {
  return permissions[role]
}
