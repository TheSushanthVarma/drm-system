import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/db"

// GET /api/admin/stats - get admin dashboard statistics
export async function GET() {
  try {
    const session = await getSession()
    if (!session || session.role !== "admin") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 })
    }

    // Run all queries in parallel for performance
    const [
      totalUsers,
      activeUsers,
      inactiveUsers,
      adminCount,
      designerCount,
      requesterCount,
      totalRequests,
      pendingRequests,
      inProgressRequests,
      completedRequests,
      totalCatalogues,
      pendingRoleChanges,
      recentLogins,
      newUsersThisMonth,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: "active" } }),
      prisma.user.count({ where: { status: "inactive" } }),
      prisma.user.count({ where: { role: "admin" } }),
      prisma.user.count({ where: { role: "designer" } }),
      prisma.user.count({ where: { role: "requester" } }),
      prisma.request.count(),
      prisma.request.count({ where: { status: { in: ["submitted", "assigned"] } } }),
      prisma.request.count({ where: { status: { in: ["in_design", "in_review", "changes_requested"] } } }),
      prisma.request.count({ where: { status: { in: ["completed", "published"] } } }),
      prisma.catalogue.count(),
      prisma.roleChangeRequest.count({ where: { status: "pending" } }),
      prisma.user.count({
        where: {
          lastLogin: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // last 7 days
          },
        },
      }),
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
    ])

    return NextResponse.json({
      success: true,
      stats: {
        users: {
          total: totalUsers,
          active: activeUsers,
          inactive: inactiveUsers,
          byRole: {
            admin: adminCount,
            designer: designerCount,
            requester: requesterCount,
          },
          recentLogins,
          newThisMonth: newUsersThisMonth,
        },
        requests: {
          total: totalRequests,
          pending: pendingRequests,
          inProgress: inProgressRequests,
          completed: completedRequests,
        },
        catalogues: totalCatalogues,
        pendingRoleChanges,
      },
    })
  } catch (error) {
    console.error("Admin stats error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
