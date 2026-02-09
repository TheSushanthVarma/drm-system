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
