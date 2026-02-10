import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/db"

// GET /api/profile - get current user profile
export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        status: true,
        phone: true,
        department: true,
        bio: true,
        createdAt: true,
        lastLogin: true,
      },
    })

    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, user })
  } catch (error) {
    console.error("Profile GET error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

// PUT /api/profile - update current user profile
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { username, phone, department, bio } = body

    // Validate username if provided
    if (username !== undefined) {
      if (!username || username.trim().length === 0) {
        return NextResponse.json({ success: false, error: "Username cannot be empty" }, { status: 400 })
      }

      // Check if username is taken by another user
      const existing = await prisma.user.findFirst({
        where: {
          username: username.trim(),
          NOT: { id: session.id },
        },
      })

      if (existing) {
        return NextResponse.json({ success: false, error: "Username already taken" }, { status: 400 })
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.id },
      data: {
        ...(username !== undefined && { username: username.trim() }),
        ...(phone !== undefined && { phone: phone?.trim() || null }),
        ...(department !== undefined && { department: department?.trim() || null }),
        ...(bio !== undefined && { bio: bio?.trim() || null }),
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        status: true,
        phone: true,
        department: true,
        bio: true,
        createdAt: true,
        lastLogin: true,
      },
    })

    return NextResponse.json({ success: true, user: updatedUser })
  } catch (error) {
    console.error("Profile PUT error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
