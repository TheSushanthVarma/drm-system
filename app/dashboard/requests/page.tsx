"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"
import { RequestsClient } from "./requests-client"
import { useAuth, usePermissions } from "@/contexts/auth-context"
import { NewRequestDrawer } from "@/components/new-request-drawer"

interface RequestData {
  id: string
  drmCode: string
  name: string
  description: string | null
  catalogue: { id: string; name: string } | null
  status: string
  priority: string
  dueDate: string | null
  requester: { id: number; username: string; email: string }
  designer: { id: number; username: string; email: string } | null
}

export default function RequestsPage() {
  const [requests, setRequests] = useState<RequestData[]>([])
  const [loading, setLoading] = useState(true)
  const { user, isRequester } = useAuth()
  const permissions = usePermissions()

  useEffect(() => {
    fetchRequests()
  }, [])

  const fetchRequests = async () => {
    try {
      const res = await fetch("/api/requests")
      const data = await res.json()
      if (data.success) {
        // Transform data to match the expected format
        const transformedRequests = data.requests.map((r: RequestData) => ({
          id: r.drmCode,
          requestId: r.id,
          name: r.name,
          description: r.description,
          catalogue: r.catalogue,
          status: r.status,
          priority: r.priority,
          requester: r.requester.username,
          requesterId: r.requester.id,
          designer: r.designer?.username,
          designerId: r.designer?.id,
          dueDate: r.dueDate ? new Date(r.dueDate).toLocaleDateString() : "No due date",
        }))
        setRequests(transformedRequests)
      }
    } catch (error) {
      console.error("Error fetching requests:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Design Requests</h1>
          <p className="text-muted-foreground">
            {isRequester ? "Manage your design requests" : "Manage all design requests"}
          </p>
        </div>
        {permissions.canCreateRequest && (
          <NewRequestDrawer
            onCreated={fetchRequests}
            trigger={
              <Button className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white gap-2">
                <Plus className="w-4 h-4" />
                New Request
              </Button>
            }
          />
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <RequestsClient requests={requests} userId={user?.id} userRole={user?.role} />
      )}
    </div>
  )
}
