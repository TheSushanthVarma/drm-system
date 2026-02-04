"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Search, UserPlus, Check, Loader2 } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

interface Designer {
  id: number
  username: string
  email: string
}

interface AssignDesignerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  requestId: string
  requestName: string
  currentDesignerId?: number | null
  onAssigned: () => void
}

export function AssignDesignerDialog({
  open,
  onOpenChange,
  requestId,
  requestName,
  currentDesignerId,
  onAssigned,
}: AssignDesignerDialogProps) {
  const [designers, setDesigners] = useState<Designer[]>([])
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [error, setError] = useState("")
  const { user, isDesigner } = useAuth()

  useEffect(() => {
    if (open) {
      fetchDesigners()
    }
  }, [open])

  const fetchDesigners = async () => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/designers")
      const data = await res.json()
      if (data.success) {
        setDesigners(data.designers)
      } else {
        setError(data.error || "Failed to load designers")
      }
    } catch (err) {
      console.error("Fetch designers error:", err)
      setError("Failed to load designers")
    } finally {
      setLoading(false)
    }
  }

  const handleAssign = async (designerId: number) => {
    setAssigning(designerId)
    setError("")
    try {
      const res = await fetch(`/api/requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ designerId }),
      })

      const data = await res.json()
      if (data.success) {
        onAssigned()
        onOpenChange(false)
      } else {
        setError(data.error || "Failed to assign designer")
      }
    } catch (err) {
      console.error("Assign error:", err)
      setError("Failed to assign designer")
    } finally {
      setAssigning(null)
    }
  }

  const handleSelfAssign = async () => {
    if (user?.id) {
      await handleAssign(user.id)
    }
  }

  const filteredDesigners = designers.filter(
    (d) =>
      d.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>Assign Designer</SheetTitle>
          <SheetDescription>
            Select a designer to assign to <span className="font-semibold">{requestName}</span>
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Self-assign option for designers */}
          {isDesigner && currentDesignerId !== user?.id && (
            <Button
              onClick={handleSelfAssign}
              disabled={assigning !== null}
              className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white gap-2"
            >
              {assigning === user?.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
              Assign to Myself
            </Button>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search designers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Error message */}
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg">
              {error}
            </div>
          )}

          {/* Designers list */}
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : filteredDesigners.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? "No designers found" : "No designers available"}
              </div>
            ) : (
              filteredDesigners.map((designer) => {
                const isCurrentlyAssigned = designer.id === currentDesignerId
                const isAssigning = assigning === designer.id

                return (
                  <div
                    key={designer.id}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                      isCurrentlyAssigned
                        ? "bg-primary/10 border-primary"
                        : "hover:bg-muted border-border"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage
                          src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${designer.username}`}
                        />
                        <AvatarFallback>
                          {designer.username.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{designer.username}</p>
                        <p className="text-sm text-muted-foreground">{designer.email}</p>
                      </div>
                    </div>

                    {isCurrentlyAssigned ? (
                      <div className="flex items-center gap-2 text-primary">
                        <Check className="w-4 h-4" />
                        <span className="text-sm font-medium">Assigned</span>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAssign(designer.id)}
                        disabled={assigning !== null}
                      >
                        {isAssigning ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "Assign"
                        )}
                      </Button>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

