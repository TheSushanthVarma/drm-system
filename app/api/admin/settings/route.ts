import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/db"

// GET /api/admin/settings - get all system settings
export async function GET() {
  try {
    const session = await getSession()
    if (!session || session.role !== "admin") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 })
    }

    const settings = await prisma.systemSetting.findMany({
      include: {
        updatedBy: {
          select: { id: true, username: true },
        },
      },
      orderBy: { key: "asc" },
    })

    // Convert to a key-value map for easy frontend consumption
    const settingsMap: Record<string, { value: string; description: string | null; updatedAt: string; updatedBy: any }> = {}
    settings.forEach((s) => {
      settingsMap[s.key] = {
        value: s.value,
        description: s.description,
        updatedAt: s.updatedAt.toISOString(),
        updatedBy: s.updatedBy,
      }
    })

    return NextResponse.json({ success: true, settings: settingsMap })
  } catch (error) {
    console.error("Get settings error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

// PUT /api/admin/settings - update system settings
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.role !== "admin") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 })
    }

    const body = await request.json()
    const { settings } = body // { key: value, key: value, ... }

    if (!settings || typeof settings !== "object") {
      return NextResponse.json({ success: false, error: "Invalid settings format" }, { status: 400 })
    }

    // Validate specific settings
    const validKeys = [
      "allowed_email_domains",
      "default_user_role",
      "max_upload_size_mb",
      "auto_archive_days",
      "maintenance_mode",
      "require_email_verification",
      "session_timeout_hours",
      "max_requests_per_user",
      "allow_self_registration",
    ]

    const updates: { key: string; value: string }[] = []
    const errors: string[] = []

    for (const [key, value] of Object.entries(settings)) {
      if (!validKeys.includes(key)) {
        errors.push(`Unknown setting: ${key}`)
        continue
      }

      const strValue = String(value)

      // Validate specific settings
      switch (key) {
        case "default_user_role":
          if (!["admin", "designer", "requester"].includes(strValue)) {
            errors.push("Invalid default role")
            continue
          }
          break
        case "max_upload_size_mb":
        case "auto_archive_days":
        case "session_timeout_hours":
        case "max_requests_per_user":
          if (isNaN(Number(strValue)) || Number(strValue) < 0) {
            errors.push(`${key} must be a non-negative number`)
            continue
          }
          break
        case "maintenance_mode":
        case "require_email_verification":
        case "allow_self_registration":
          if (!["true", "false"].includes(strValue)) {
            errors.push(`${key} must be true or false`)
            continue
          }
          break
        case "allowed_email_domains":
          if (!strValue.trim()) {
            errors.push("At least one email domain is required")
            continue
          }
          break
      }

      updates.push({ key, value: strValue })
    }

    if (errors.length > 0 && updates.length === 0) {
      return NextResponse.json({ success: false, error: errors.join(", ") }, { status: 400 })
    }

    // Apply updates
    for (const { key, value } of updates) {
      await prisma.systemSetting.upsert({
        where: { key },
        update: {
          value,
          updatedAt: new Date(),
          updatedById: session.id,
        },
        create: {
          key,
          value,
          updatedAt: new Date(),
          updatedById: session.id,
        },
      })
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: "settings.updated",
        targetType: "system",
        details: {
          updatedKeys: updates.map((u) => u.key),
          updates: updates.reduce((acc, u) => ({ ...acc, [u.key]: u.value }), {}),
        },
        performedById: session.id,
      },
    })

    return NextResponse.json({
      success: true,
      message: `${updates.length} setting(s) updated`,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error("Update settings error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
