import { cookies } from "next/headers"
import { prisma } from "./db"
import * as bcrypt from "bcryptjs"

export type UserRole = "admin" | "designer" | "requester"

export interface AuthUser {
  id: number
  username: string
  email: string
  role: UserRole
  status: "active" | "inactive"
}

const SESSION_COOKIE_NAME = "drm_session"

// Simple encoding/decoding for session data (in production, use proper JWT)
function encodeSession(user: AuthUser): string {
  return Buffer.from(JSON.stringify(user)).toString("base64")
}

function decodeSession(token: string): AuthUser | null {
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8")
    return JSON.parse(decoded) as AuthUser
  } catch {
    return null
  }
}

export async function login(email: string, password: string): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        username: true,
        email: true,
        password: true,
        role: true,
        status: true,
      },
    })

    if (!user) {
      return { success: false, error: "Invalid email or password" }
    }

    if (user.status === "inactive") {
      return { success: false, error: "Your account is inactive. Please contact an administrator." }
    }

    const passwordMatch = await bcrypt.compare(password, user.password)
    if (!passwordMatch) {
      return { success: false, error: "Invalid email or password" }
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    })

    const authUser: AuthUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role as UserRole,
      status: user.status as "active" | "inactive",
    }

    // Encode user data and store in cookie
    const sessionToken = encodeSession(authUser)

    // Set cookie
    const cookieStore = await cookies()
    cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    })

    return { success: true, user: authUser }
  } catch (error) {
    console.error("Login error:", error)
    return { success: false, error: "An error occurred during login" }
  }
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
}

export async function getSession(): Promise<AuthUser | null> {
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value
  
  if (!sessionToken) {
    return null
  }

  // Decode session from cookie
  const user = decodeSession(sessionToken)
  
  // Optionally verify user still exists and is active in database
  if (user) {
    try {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { id: true, status: true },
      })
      
      if (!dbUser || dbUser.status === "inactive") {
        return null
      }
    } catch {
      // If DB check fails, still return the cached user data
      // This allows the app to work even if DB is temporarily unavailable
    }
  }
  
  return user
}

export async function requireAuth(): Promise<AuthUser> {
  const user = await getSession()
  if (!user) {
    throw new Error("Unauthorized")
  }
  return user
}

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

