import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/db"

// GET /api/users/[id] - get single user details (admin only)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session || session.role !== "admin") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 })
    }

    const { id } = await params

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        status: true,
        phone: true,
        department: true,
        bio: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            requestsCreated: true,
            requestsAssigned: true,
            comments: true,
            assetsUploaded: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, user })
  } catch (error) {
    console.error("Get user error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

// PATCH /api/users/[id] - update user (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session || session.role !== "admin") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { action, role, status, username } = body

    // Find the target user
    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, username: true, email: true, role: true, status: true },
    })

    if (!targetUser) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
    }

    // Prevent admin from modifying themselves through this endpoint
    if (targetUser.id === session.id) {
      return NextResponse.json(
        { success: false, error: "Cannot modify your own account through admin panel" },
        { status: 400 }
      )
    }

    let updateData: Record<string, any> = {}
    let auditAction = ""
    let auditDetails: Record<string, any> = {}

    switch (action) {
      case "change_role": {
        const validRoles = ["admin", "designer", "requester"]
        if (!role || !validRoles.includes(role)) {
          return NextResponse.json({ success: false, error: "Invalid role" }, { status: 400 })
        }
        if (role === targetUser.role) {
          return NextResponse.json({ success: false, error: "User already has this role" }, { status: 400 })
        }
        updateData = { role }
        auditAction = "user.role_changed"
        auditDetails = { previousRole: targetUser.role, newRole: role }

        // Notify the user
        await prisma.notification.create({
          data: {
            type: "status_change",
            title: "Role Changed",
            message: `Your role has been changed from ${targetUser.role} to ${role} by an administrator.`,
            userId: targetUser.id,
            fromUserId: session.id,
          },
        })
        break
      }

      case "change_status": {
        const validStatuses = ["active", "inactive"]
        if (!status || !validStatuses.includes(status)) {
          return NextResponse.json({ success: false, error: "Invalid status" }, { status: 400 })
        }
        if (status === targetUser.status) {
          return NextResponse.json(
            { success: false, error: `User is already ${status}` },
            { status: 400 }
          )
        }
        updateData = { status }
        auditAction = status === "active" ? "user.activated" : "user.deactivated"
        auditDetails = { previousStatus: targetUser.status, newStatus: status }

        await prisma.notification.create({
          data: {
            type: "status_change",
            title: status === "active" ? "Account Activated" : "Account Deactivated",
            message:
              status === "active"
                ? "Your account has been activated by an administrator."
                : "Your account has been deactivated by an administrator. Please contact support.",
            userId: targetUser.id,
            fromUserId: session.id,
          },
        })
        break
      }

      case "edit_user": {
        if (username !== undefined) {
          if (!username || username.trim().length === 0) {
            return NextResponse.json({ success: false, error: "Username cannot be empty" }, { status: 400 })
          }
          const existing = await prisma.user.findFirst({
            where: { username: username.trim(), NOT: { id } },
          })
          if (existing) {
            return NextResponse.json({ success: false, error: "Username already taken" }, { status: 400 })
          }
          updateData.username = username.trim()
        }
        auditAction = "user.edited"
        auditDetails = { changes: updateData }
        break
      }

      default:
        return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 })
    }

    // Update the user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        status: true,
        lastLogin: true,
        createdAt: true,
        _count: {
          select: { requestsCreated: true, requestsAssigned: true },
        },
      },
    })

    // Record audit log
    await prisma.auditLog.create({
      data: {
        action: auditAction,
        targetType: "user",
        targetId: targetUser.id,
        details: {
          ...auditDetails,
          targetUsername: targetUser.username,
          targetEmail: targetUser.email,
        },
        performedById: session.id,
      },
    })

    return NextResponse.json({ success: true, user: updatedUser })
  } catch (error) {
    console.error("Update user error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
