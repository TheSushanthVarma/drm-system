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

    const requestData = await prisma.request.findUnique({
      where: { id },
      include: {
        requester: {
          select: { id: true, username: true, email: true },
        },
        designer: {
          select: { id: true, username: true, email: true },
        },
        catalogue: {
          select: { id: true, name: true },
        },
        comments: {
          include: {
            author: {
              select: { id: true, username: true, email: true, role: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        assets: {
          include: {
            uploadedBy: {
              select: { id: true, username: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    })

    if (!requestData) {
      return NextResponse.json(
        { success: false, error: "Request not found" },
        { status: 404 }
      )
    }

    // Check access permissions
    if (user.role === "requester" && requestData.requesterId !== user.id) {
      return NextResponse.json(
        { success: false, error: "Access denied" },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      request: requestData,
      userRole: user.role,
      userId: user.id,
    })
  } catch (error) {
    console.error("Get request error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PATCH(
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
    const body = await request.json()

    const existingRequest = await prisma.request.findUnique({
      where: { id },
    })

    if (!existingRequest) {
      return NextResponse.json(
        { success: false, error: "Request not found" },
        { status: 404 }
      )
    }

    // Check permissions based on role and action
    const { status, designerId, ...otherFields } = body

    // Designer permissions
    if (user.role === "designer") {
      // Designer can self-assign to unassigned requests that are submitted
      const isSelfAssigning = designerId === user.id && existingRequest.designerId === null
      const canSelfAssign = isSelfAssigning && ["submitted"].includes(existingRequest.status)
      
      // Designer can change status if assigned to the request
      const canChangeStatus = existingRequest.designerId === user.id && status
      
      if (designerId !== undefined && !canSelfAssign) {
        return NextResponse.json(
          { success: false, error: "You can only assign yourself to unassigned submitted requests" },
          { status: 403 }
        )
      }
      
      if (status && !canChangeStatus && !canSelfAssign) {
        return NextResponse.json(
          { success: false, error: "You can only change status for requests assigned to you" },
          { status: 403 }
        )
      }
      
      // Designer can only update status or self-assign, not other fields
      if (Object.keys(otherFields).length > 0) {
        return NextResponse.json(
          { success: false, error: "Designers can only update request status or self-assign" },
          { status: 403 }
        )
      }
    }

    // Requester can only update their own draft requests
    if (user.role === "requester") {
      if (existingRequest.requesterId !== user.id) {
        return NextResponse.json(
          { success: false, error: "Access denied" },
          { status: 403 }
        )
      }
      if (existingRequest.status !== "draft" && Object.keys(otherFields).length > 0) {
        return NextResponse.json(
          { success: false, error: "You can only edit draft requests" },
          { status: 403 }
        )
      }
      // Requester cannot assign designer or change status beyond submit
      if (designerId !== undefined) {
        return NextResponse.json(
          { success: false, error: "You cannot assign a designer" },
          { status: 403 }
        )
      }
      if (status && !["draft", "submitted"].includes(status)) {
        return NextResponse.json(
          { success: false, error: "Invalid status change" },
          { status: 403 }
        )
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {}
    
    if (body.name !== undefined) updateData.name = body.name
    if (body.description !== undefined) updateData.description = body.description
    if (body.priority !== undefined) updateData.priority = body.priority
    if (body.dueDate !== undefined) updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null
    if (status !== undefined) updateData.status = status
    
    // Handle designer assignment
    if (designerId !== undefined) {
      // Admin can assign any designer
      // Designer can self-assign to unassigned submitted requests
      const canAssign = user.role === "admin" || 
        (user.role === "designer" && designerId === user.id && existingRequest.designerId === null)
      
      if (canAssign) {
        updateData.designerId = designerId
        // Auto-change status to assigned if assigning designer to submitted request
        if (designerId && existingRequest.status === "submitted") {
          updateData.status = "assigned"
        }
      }
    }

    const updatedRequest = await prisma.request.update({
      where: { id },
      data: updateData,
      include: {
        requester: {
          select: { id: true, username: true, email: true },
        },
        designer: {
          select: { id: true, username: true, email: true },
        },
      },
    })

    // Create notification when designer is assigned
    if (designerId !== undefined && updateData.designerId && existingRequest.designerId !== designerId) {
      try {
        // Notify the requester that a designer has been assigned
        const designerName = updatedRequest.designer?.username || "A designer"
        await prisma.notification.create({
          data: {
            type: "assignment",
            title: "Designer Assigned 🎨",
            message: `${designerName} has been assigned to your request "${existingRequest.name}"`,
            link: `/dashboard/requests/${id}`,
            userId: existingRequest.requesterId,
            fromUserId: user.id,
            requestId: id,
          },
        })
        console.log(`Assignment notification created for requester ${existingRequest.requesterId}`)
      } catch (notifyError) {
        console.error("Failed to create assignment notification:", notifyError)
      }
    }

    return NextResponse.json({
      success: true,
      request: updatedRequest,
    })
  } catch (error) {
    console.error("Update request error:", error)
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

    // Only admins can delete requests
    if (user.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Only admins can delete requests" },
        { status: 403 }
      )
    }

    const { id } = await params

    await prisma.request.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error("Delete request error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}

