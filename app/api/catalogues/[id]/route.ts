import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession()
    const { id } = await params

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const catalogue = await prisma.catalogue.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, username: true, email: true },
        },
        requests: {
          include: {
            requester: {
              select: { id: true, username: true, email: true },
            },
            designer: {
              select: { id: true, username: true, email: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        _count: {
          select: { requests: true },
        },
      },
    })

    if (!catalogue) {
      return NextResponse.json(
        { success: false, error: "Catalogue not found" },
        { status: 404 }
      )
    }

    // Check permissions - requesters can only see their own catalogues
    if (user.role === "requester" && catalogue.createdById !== user.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      catalogue,
    })
  } catch (error) {
    console.error("Get catalogue error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession()
    const { id } = await params

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const catalogue = await prisma.catalogue.findUnique({
      where: { id },
    })

    if (!catalogue) {
      return NextResponse.json(
        { success: false, error: "Catalogue not found" },
        { status: 404 }
      )
    }

    // Check permissions - only creator or admin can update
    if (user.role !== "admin" && catalogue.createdById !== user.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
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

    const updated = await prisma.catalogue.update({
      where: { id },
      data: {
        name: name.trim(),
        description: description?.trim() || null,
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
      catalogue: updated,
    })
  } catch (error) {
    console.error("Update catalogue error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession()
    const { id } = await params

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const catalogue = await prisma.catalogue.findUnique({
      where: { id },
    })

    if (!catalogue) {
      return NextResponse.json(
        { success: false, error: "Catalogue not found" },
        { status: 404 }
      )
    }

    // Check permissions - only creator or admin can delete
    if (user.role !== "admin" && catalogue.createdById !== user.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 }
      )
    }

    await prisma.catalogue.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error("Delete catalogue error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}
