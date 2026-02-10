import { NextRequest, NextResponse } from "next/server"
import { signup } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, email, password, role } = body

    if (!username || !email || !password) {
      return NextResponse.json(
        { success: false, error: "Username, email, and password are required" },
        { status: 400 }
      )
    }

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 6 characters long" },
        { status: 400 }
      )
    }

    // Validate role
    const validRoles = ["designer", "requester"]
    const selectedRole = validRoles.includes(role) ? role : "requester"

    const result = await signup(username, email, password, selectedRole)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: result.message || "Account created successfully. Please check your email to verify your account.",
    })
  } catch (error) {
    console.error("Signup API error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}
