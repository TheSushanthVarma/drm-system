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

    // Requesters can see their own catalogues, admins can see all
    const whereClause = user.role === "admin" 
      ? {} 
      : { createdById: user.id }

    const catalogues = await prisma.catalogue.findMany({
      where: whereClause,
      include: {
        createdBy: {
          select: { id: true, username: true, email: true },
        },
        _count: {
          select: { requests: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({
      success: true,
      catalogues,
    })
  } catch (error) {
    console.error("Get catalogues error:", error)
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

    // Only requesters and admins can create catalogues
    if (user.role === "designer") {
      return NextResponse.json(
        { success: false, error: "Designers cannot create catalogues" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, description } = body

    if (!name || name.trim() === "") {
      return NextResponse.json(
        { success: false, error: "Catalogue name is required" },
        { status: 400 }
      )
    }

    const catalogue = await prisma.catalogue.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        createdById: user.id,
      },
      include: {
        createdBy: {
          select: { id: true, username: true, email: true },
        },
        _count: {
          select: { requests: true },
        },
      },
    })

    return NextResponse.json({
      success: true,
      catalogue,
    })
  } catch (error) {
    console.error("Create catalogue error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}
