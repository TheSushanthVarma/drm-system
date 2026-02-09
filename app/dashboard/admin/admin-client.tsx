"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, MoreVertical } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface User {
  id: string // UUID from Supabase
  username: string
  email: string
  role: string
  status: string
  lastLogin: string
}

interface AdminClientProps {
  users: User[]
}

export function AdminClient({ users }: AdminClientProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRole = roleFilter === "all" || user.role === roleFilter

    return matchesSearch && matchesRole
  })

  return (
    <>
      {/* Tabs */}
      <div className="flex gap-4 border-b border-border">
        <button className="px-4 py-2 font-medium text-primary border-b-2 border-primary">Users</button>
        <button className="px-4 py-2 font-medium text-muted-foreground hover:text-foreground">Settings</button>
        <button className="px-4 py-2 font-medium text-muted-foreground hover:text-foreground">Permissions</button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="designer">Designer</SelectItem>
                <SelectItem value="requester">Requester</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>{filteredUsers.length} total users</CardDescription>
        </CardHeader>

        <CardContent>
          <div className="rounded-lg border overflow-hidden overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted">
                <TableRow className="hover:bg-muted">
                  <TableHead className="font-semibold">User</TableHead>
                  <TableHead className="font-semibold">Email</TableHead>
                  <TableHead className="font-semibold">Role</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Last Login</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} />
                          <AvatarFallback>{user.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{user.username}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                        {user.role}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {user.status === "active" ? "Active" : "Inactive"}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{user.lastLogin}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>Edit User</DropdownMenuItem>
                          <DropdownMenuItem>Change Role</DropdownMenuItem>
                          <DropdownMenuItem>Reset Password</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">Deactivate</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Permissions Matrix */}
      <Card>
        <CardHeader>
          <CardTitle>Role Permissions Matrix</CardTitle>
          <CardDescription>Overview of what each role can do</CardDescription>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left font-semibold py-3 px-4">Permission</th>
                  <th className="text-center font-semibold py-3 px-4">Admin</th>
                  <th className="text-center font-semibold py-3 px-4">Designer</th>
                  <th className="text-center font-semibold py-3 px-4">Requester</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: "Create Requests", admin: true, designer: false, requester: true },
                  { name: "View All Requests", admin: true, designer: true, requester: false },
                  { name: "Edit Requests", admin: true, designer: false, requester: true },
                  { name: "Assign Designers", admin: true, designer: false, requester: false },
                  { name: "Upload Assets", admin: true, designer: true, requester: false },
                  { name: "Approve Designs", admin: true, designer: false, requester: true },
                  { name: "Publish Designs", admin: true, designer: false, requester: true },
                  { name: "Manage Users", admin: true, designer: false, requester: false },
                  { name: "View Analytics", admin: true, designer: true, requester: true },
                ].map((perm) => (
                  <tr key={perm.name} className="border-b border-border hover:bg-muted/50">
                    <td className="py-3 px-4 font-medium">{perm.name}</td>
                    <td className="text-center py-3 px-4">
                      {perm.admin ? (
                        <span className="text-green-600 font-semibold">✓</span>
                      ) : (
                        <span className="text-gray-300">✗</span>
                      )}
                    </td>
                    <td className="text-center py-3 px-4">
                      {perm.designer ? (
                        <span className="text-green-600 font-semibold">✓</span>
                      ) : (
                        <span className="text-gray-300">✗</span>
                      )}
                    </td>
                    <td className="text-center py-3 px-4">
                      {perm.requester ? (
                        <span className="text-green-600 font-semibold">✓</span>
                      ) : (
                        <span className="text-gray-300">✗</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
