import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET() {
  try {
    const user = await getSession()

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Admins and designers can fetch designers list
    if (user.role === "requester") {
      return NextResponse.json(
        { success: false, error: "Access denied" },
        { status: 403 }
      )
    }

    const designers = await prisma.user.findMany({
      where: {
        role: "designer",
        status: "active",
      },
      select: {
        id: true,
        username: true,
        email: true,
      },
      orderBy: { username: "asc" },
    })

    return NextResponse.json({
      success: true,
      designers,
    })
  } catch (error) {
    console.error("Get designers error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}

