import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/db"

// PATCH /api/role-change-requests/[id] - approve or reject a role change request (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    if (session.role !== "admin") {
      return NextResponse.json({ success: false, error: "Only admins can review role change requests" }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { action, reviewNote } = body // action: "approve" | "reject"

    if (!action || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 })
    }

    // Find the request
    const roleChangeRequest = await prisma.roleChangeRequest.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, username: true, role: true } },
      },
    })

    if (!roleChangeRequest) {
      return NextResponse.json({ success: false, error: "Request not found" }, { status: 404 })
    }

    if (roleChangeRequest.status !== "pending") {
      return NextResponse.json({ success: false, error: "Request has already been reviewed" }, { status: 400 })
    }

    const newStatus = action === "approve" ? "approved" : "rejected"

    // Update the request
    const updatedRequest = await prisma.roleChangeRequest.update({
      where: { id },
      data: {
        status: newStatus,
        reviewedById: session.id,
        reviewNote: reviewNote?.trim() || null,
      },
    })

    // If approved, update the user's role
    if (action === "approve") {
      await prisma.user.update({
        where: { id: roleChangeRequest.userId },
        data: { role: roleChangeRequest.requestedRole },
      })
    }

    // Record audit log
    await prisma.auditLog.create({
      data: {
        action: action === "approve" ? "role_request.approved" : "role_request.rejected",
        targetType: "user",
        targetId: roleChangeRequest.userId,
        details: {
          targetUsername: roleChangeRequest.user.username,
          currentRole: roleChangeRequest.currentRole,
          requestedRole: roleChangeRequest.requestedRole,
          reviewNote: reviewNote?.trim() || null,
        },
        performedById: session.id,
      },
    })

    // Notify the user
    await prisma.notification.create({
      data: {
        type: "status_change",
        title: `Role Change ${action === "approve" ? "Approved" : "Rejected"}`,
        message: action === "approve"
          ? `Your role has been changed to ${roleChangeRequest.requestedRole}. Please log out and log back in for changes to take effect.`
          : `Your request to change role to ${roleChangeRequest.requestedRole} was rejected.${reviewNote ? ` Reason: ${reviewNote}` : ""}`,
        userId: roleChangeRequest.userId,
        fromUserId: session.id,
      },
    })

    return NextResponse.json({ success: true, request: updatedRequest })
  } catch (error) {
    console.error("Role change request PATCH error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
