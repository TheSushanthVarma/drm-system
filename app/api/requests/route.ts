import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const user = await getSession()

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const viewAll = searchParams.get("all") === "true"
    const viewMine = searchParams.get("mine") === "true"

    let requests
    const includeFields = {
      requester: {
        select: { id: true, username: true, email: true },
      },
      designer: {
        select: { id: true, username: true, email: true },
      },
      catalogue: {
        select: { id: true, name: true },
      },
      _count: {
        select: { comments: true, assets: true },
      },
    }

    if (user.role === "admin") {
      // Admin can see all requests
      requests = await prisma.request.findMany({
        include: includeFields,
        orderBy: { createdAt: "desc" },
      })
    } else if (user.role === "designer") {
      if (viewMine) {
        // Designer's assigned requests only
        requests = await prisma.request.findMany({
          where: {
            designerId: user.id,
          },
          include: includeFields,
          orderBy: { createdAt: "desc" },
        })
      } else {
        // Designer can see all requests (but will have limited actions)
        requests = await prisma.request.findMany({
          include: includeFields,
          orderBy: { createdAt: "desc" },
        })
      }
    } else {
      // Requester
      if (viewAll) {
        // Requester can view all team requests (read-only visibility)
        requests = await prisma.request.findMany({
          include: includeFields,
          orderBy: { createdAt: "desc" },
        })
      } else {
        // Default or ?mine=true: Requester sees only their own requests
        requests = await prisma.request.findMany({
          where: {
            requesterId: user.id,
          },
          include: includeFields,
          orderBy: { createdAt: "desc" },
        })
      }
    }

    return NextResponse.json({
      success: true,
      requests,
      userRole: user.role,
    })
  } catch (error) {
    console.error("Get requests error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSession()

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Only admins and requesters can create requests
    if (user.role === "designer") {
      return NextResponse.json(
        { success: false, error: "Designers cannot create requests" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, description, referenceLink, priority, dueDate, status, catalogueId } = body

    if (!name) {
      return NextResponse.json(
        { success: false, error: "Request name is required" },
        { status: 400 }
      )
    }

    // Generate DRM code
    const year = new Date().getFullYear()
    const count = await prisma.request.count({
      where: {
        drmCode: {
          startsWith: `DRM-${year}`,
        },
      },
    })
    const drmCode = `DRM-${year}-${String(count + 1).padStart(3, "0")}`

    // Validate status - requesters can only create draft or submitted requests
    const validStatus = status === "submitted" ? "submitted" : "draft"

    const newRequest = await prisma.request.create({
      data: {
        drmCode,
        name,
        description,
        referenceLink: referenceLink || null,
        priority: priority || "medium",
        dueDate: dueDate ? new Date(dueDate) : null,
        status: validStatus,
        requesterId: user.id,
        catalogueId: catalogueId || null,
      },
      include: {
        requester: {
          select: { id: true, username: true, email: true },
        },
      },
    })

    return NextResponse.json({
      success: true,
      request: newRequest,
    })
  } catch (error) {
    console.error("Create request error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}

