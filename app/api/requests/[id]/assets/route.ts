import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSession()

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id } = await params

    // Get the request to check permissions
    const requestData = await prisma.request.findUnique({
      where: { id },
      select: { requesterId: true },
    })

    if (!requestData) {
      return NextResponse.json(
        { success: false, error: "Request not found" },
        { status: 404 }
      )
    }

    // Requesters can only see their own requests
    if (user.role === "requester" && requestData.requesterId !== user.id) {
      return NextResponse.json(
        { success: false, error: "Access denied" },
        { status: 403 }
      )
    }

    // Get assets based on role
    let assets
    if (user.role === "requester") {
      // Requesters only see final assets
      assets = await prisma.asset.findMany({
        where: {
          requestId: id,
          assetType: "final",
        },
        include: {
          uploadedBy: {
            select: { id: true, username: true },
          },
        },
        orderBy: [{ assetType: "asc" }, { createdAt: "desc" }],
      })
    } else {
      // Admins and designers see all assets
      assets = await prisma.asset.findMany({
        where: { requestId: id },
        include: {
          uploadedBy: {
            select: { id: true, username: true },
          },
        },
        orderBy: [{ assetType: "asc" }, { createdAt: "desc" }],
      })
    }

    return NextResponse.json({
      success: true,
      assets,
      userRole: user.role,
    })
  } catch (error) {
    console.error("Get assets error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSession()

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Only designers and admins can upload assets
    if (user.role === "requester") {
      return NextResponse.json(
        { success: false, error: "Requesters cannot upload assets" },
        { status: 403 }
      )
    }

    const { id } = await params

    // Get the request to check it exists
    const requestData = await prisma.request.findUnique({
      where: { id },
      select: { id: true, designerId: true },
    })

    if (!requestData) {
      return NextResponse.json(
        { success: false, error: "Request not found" },
        { status: 404 }
      )
    }

    // Designers can only upload to requests assigned to them (or any if admin)
    if (user.role === "designer" && requestData.designerId !== user.id) {
      return NextResponse.json(
        { success: false, error: "You can only upload to requests assigned to you" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { filename, fileUrl, fileType, fileSize, assetType, versionNote } = body

    if (!filename || !fileUrl || !fileType) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Validate asset type
    if (!["source", "final"].includes(assetType)) {
      return NextResponse.json(
        { success: false, error: "Invalid asset type" },
        { status: 400 }
      )
    }

    // Get the latest version for this file type
    const latestAsset = await prisma.asset.findFirst({
      where: {
        requestId: id,
        assetType,
        filename: {
          startsWith: filename.split(".")[0], // Match by base filename
        },
      },
      orderBy: { version: "desc" },
    })

    const newVersion = latestAsset ? latestAsset.version + 1 : 1

    const asset = await prisma.asset.create({
      data: {
        filename,
        fileUrl,
        fileType,
        fileSize: fileSize || 0,
        assetType,
        version: newVersion,
        versionNote,
        requestId: id,
        uploadedById: user.id,
      },
      include: {
        uploadedBy: {
          select: { id: true, username: true },
        },
      },
    })

    return NextResponse.json({
      success: true,
      asset,
    })
  } catch (error) {
    console.error("Upload asset error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSession()

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Only admins can delete assets
    if (user.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Only admins can delete assets" },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const assetId = searchParams.get("assetId")

    if (!assetId) {
      return NextResponse.json(
        { success: false, error: "Asset ID is required" },
        { status: 400 }
      )
    }

    await prisma.asset.delete({
      where: { id: parseInt(assetId) },
    })

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error("Delete asset error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}

