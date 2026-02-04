"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Plus, ShieldAlert } from "lucide-react"
import { AdminClient } from "./admin-client"
import { useAuth } from "@/contexts/auth-context"

interface UserData {
  id: number
  username: string
  email: string
  role: string
  status: string
  lastLogin: string | null
  createdAt: string
  _count: {
    requestsCreated: number
    requestsAssigned: number
  }
}

export default function AdminPanel() {
  const [users, setUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)
  const { user, isAdmin } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isAdmin && user) {
      // Redirect non-admins
      router.push("/dashboard")
      return
    }
    fetchUsers()
  }, [isAdmin, user, router])

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users")
      const data = await res.json()
      if (data.success) {
        const transformedUsers = data.users.map((u: UserData) => ({
          id: u.id,
          username: u.username,
          email: u.email,
          role: u.role,
          status: u.status,
          lastLogin: u.lastLogin ? new Date(u.lastLogin).toLocaleString() : "Never",
          requestsCreated: u._count.requestsCreated,
          requestsAssigned: u._count.requestsAssigned,
        }))
        setUsers(transformedUsers)
      }
    } catch (error) {
      console.error("Error fetching users:", error)
    } finally {
      setLoading(false)
    }
  }

  // Show access denied for non-admins
  if (!isAdmin && !loading) {
    return (
      <div className="p-6 md:p-8 flex flex-col items-center justify-center min-h-[60vh]">
        <ShieldAlert className="w-16 h-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold text-destructive">Access Denied</h1>
        <p className="text-muted-foreground mt-2">You don't have permission to access the Admin Panel.</p>
        <Button 
          onClick={() => router.push("/dashboard")} 
          className="mt-6"
        >
          Go to Dashboard
        </Button>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Admin Panel</h1>
          <p className="text-muted-foreground">Manage users and system settings</p>
        </div>
        <Button className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white gap-2">
          <Plus className="w-4 h-4" />
          Add User
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <AdminClient users={users} />
      )}
    </div>
  )
}
