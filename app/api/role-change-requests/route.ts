import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/db"

// GET /api/role-change-requests - get role change requests
// For admins: get all pending requests
// For users: get their own requests
export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const isAdmin = session.role === "admin"

    const requests = await prisma.roleChangeRequest.findMany({
      where: isAdmin
        ? {} // Admins see all
        : { userId: session.id }, // Users see only their own
      include: {
        user: {
          select: { id: true, username: true, email: true, role: true },
        },
        reviewedBy: {
          select: { id: true, username: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ success: true, requests })
  } catch (error) {
    console.error("Role change requests GET error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/role-change-requests - submit a role change request
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { requestedRole, reason } = body

    // Validate requested role
    if (!requestedRole || !["designer", "requester"].includes(requestedRole)) {
      return NextResponse.json(
        { success: false, error: "Invalid role. Must be 'designer' or 'requester'" },
        { status: 400 }
      )
    }

    // Can't request the same role
    if (requestedRole === session.role) {
      return NextResponse.json(
        { success: false, error: "You already have this role" },
        { status: 400 }
      )
    }

    // Admins can't change their own role via this flow
    if (session.role === "admin") {
      return NextResponse.json(
        { success: false, error: "Admins cannot change roles via this flow" },
        { status: 400 }
      )
    }

    // Check for existing pending request
    const existingPending = await prisma.roleChangeRequest.findFirst({
      where: {
        userId: session.id,
        status: "pending",
      },
    })

    if (existingPending) {
      return NextResponse.json(
        { success: false, error: "You already have a pending role change request" },
        { status: 400 }
      )
    }

    const roleChangeRequest = await prisma.roleChangeRequest.create({
      data: {
        userId: session.id,
        currentRole: session.role as any,
        requestedRole: requestedRole as any,
        reason: reason?.trim() || null,
      },
      include: {
        user: {
          select: { id: true, username: true, email: true, role: true },
        },
      },
    })

    // Notify all admins
    const admins = await prisma.user.findMany({
      where: { role: "admin", status: "active" },
      select: { id: true },
    })

    if (admins.length > 0) {
      await prisma.notification.createMany({
        data: admins.map((admin) => ({
          type: "status_change" as any,
          title: "Role Change Request",
          message: `${session.username} requested to change role from ${session.role} to ${requestedRole}`,
          userId: admin.id,
          fromUserId: session.id,
        })),
      })
    }

    return NextResponse.json({ success: true, request: roleChangeRequest })
  } catch (error) {
    console.error("Role change request POST error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
