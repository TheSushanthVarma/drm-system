"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { useRouter } from "next/navigation"

export type UserRole = "admin" | "designer" | "requester"

export interface AuthUser {
  id: string // UUID from Supabase
  username: string
  email: string
  role: UserRole
  status: "active" | "inactive"
}

interface AuthContextType {
  user: AuthUser | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  isAdmin: boolean
  isDesigner: boolean
  isRequester: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  // Check session on mount
  useEffect(() => {
    checkSession()
  }, [])

  const checkSession = async () => {
    try {
      const res = await fetch("/api/auth/me")
      const data = await res.json()
      
      if (data.success && data.user) {
        setUser(data.user)
      } else {
        setUser(null)
      }
    } catch (error) {
      console.error("Session check error:", error)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (data.success && data.user) {
        setUser(data.user)
        return { success: true }
      }

      return { success: false, error: data.error || "Login failed" }
    } catch (error) {
      console.error("Login error:", error)
      return { success: false, error: "An error occurred during login" }
    }
  }

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
      setUser(null)
      router.push("/")
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    isAdmin: user?.role === "admin",
    isDesigner: user?.role === "designer",
    isRequester: user?.role === "requester",
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

// Permission helpers
export function usePermissions() {
  const { user } = useAuth()

  const permissions = {
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
    designer: {
      canViewAllRequests: true,
      canCreateRequest: false,
      canEditAnyRequest: false,
      canDeleteRequest: false,
      canAssignDesigner: false,
      canChangeStatus: true,
      canUploadAssets: true,
      canDownloadAssets: true,
      canViewAdminPanel: false,
      canManageUsers: false,
    },
    requester: {
      canViewAllRequests: false,
      canCreateRequest: true,
      canEditAnyRequest: false,
      canDeleteRequest: false,
      canAssignDesigner: false,
      canChangeStatus: false,
      canUploadAssets: false,
      canDownloadAssets: true,
      canViewAdminPanel: false,
      canManageUsers: false,
    },
  }

  if (!user) return permissions.requester
  return permissions[user.role]
}

