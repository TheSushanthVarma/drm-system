import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/db"

// Valid status transitions for each role
const statusTransitions: Record<string, Record<string, string[]>> = {
  admin: {
    draft: ["submitted", "archived"],
    submitted: ["assigned", "archived"],
    assigned: ["in_design", "submitted", "archived"],
    in_design: ["in_review", "assigned", "archived"],
    in_review: ["changes_requested", "ready_to_publish", "completed", "in_design", "archived"],
    changes_requested: ["in_design", "archived"],
    ready_to_publish: ["published", "in_review", "archived"],
    completed: ["published", "in_review", "archived"],
    published: ["archived"],
    archived: ["draft"],
  },
  designer: {
    assigned: ["in_design"],
    in_design: ["in_review"],
    in_review: ["ready_to_publish", "completed", "changes_requested"], // Designer can mark ready OR mark completed (skip changes)
    changes_requested: ["in_design"],
    ready_to_publish: [], // Designer cannot change after ready_to_publish - requester's turn
    completed: [], // Designer cannot change after completed - requester's turn
  },
  requester: {
    draft: ["submitted"],
    in_review: ["ready_to_publish", "changes_requested"], // Requester can accept (ready_to_publish) or request changes when reviewing
    ready_to_publish: ["published", "changes_requested"], // Requester can publish or request more changes
    completed: ["published"], // Requester can only publish from completed
  },
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
    const { status: newStatus, publishedLink } = body

    if (!newStatus) {
      return NextResponse.json(
        { success: false, error: "Status is required" },
        { status: 400 }
      )
    }

    const existingRequest = await prisma.request.findUnique({
      where: { id },
    })

    if (!existingRequest) {
      return NextResponse.json(
        { success: false, error: "Request not found" },
        { status: 404 }
      )
    }

    // Check if user can access this request
    if (user.role === "requester" && existingRequest.requesterId !== user.id) {
      return NextResponse.json(
        { success: false, error: "Access denied" },
        { status: 403 }
      )
    }

    // Designer can only change status of assigned requests
    if (user.role === "designer" && existingRequest.designerId !== user.id) {
      return NextResponse.json(
        { success: false, error: "You can only change status of requests assigned to you" },
        { status: 403 }
      )
    }

    // Check if status transition is valid
    const allowedTransitions = statusTransitions[user.role]?.[existingRequest.status] || []
    
    if (!allowedTransitions.includes(newStatus)) {
      return NextResponse.json(
        { success: false, error: `Cannot change status from ${existingRequest.status} to ${newStatus}` },
        { status: 403 }
      )
    }

    // For "published" status, require a published link
    if (newStatus === "published") {
      if (!publishedLink || publishedLink.trim() === "") {
        return NextResponse.json(
          { success: false, error: "Published link is required to mark as published" },
          { status: 400 }
        )
      }
    }

    // Prepare update data
    const updateData: any = { status: newStatus }
    
    if (newStatus === "published" && publishedLink) {
      updateData.publishedLink = publishedLink.trim()
      updateData.publishedAt = new Date()
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

    // Create notification for status change
    try {
      let notifyUserId: number | null = null
      let notificationTitle = ""
      let notificationMessage = ""

      const statusLabels: Record<string, string> = {
        ready_to_publish: "Ready to Publish",
        completed: "Completed",
        published: "Published",
        changes_requested: "Changes Requested",
        in_review: "In Review",
      }

      if (user.role === "designer") {
        // Designer changed status - notify requester
        notifyUserId = existingRequest.requesterId
        notificationTitle = `Design ${statusLabels[newStatus] || newStatus}`
        
        if (newStatus === "ready_to_publish") {
          notificationMessage = `Your design request "${existingRequest.name}" is ready to publish! You can now publish it.`
        } else {
          notificationMessage = `Status updated to ${statusLabels[newStatus] || newStatus} for "${existingRequest.name}"`
        }
        
        // If status is "in_review", also notify admin
        if (newStatus === "in_review") {
          const adminUsers = await prisma.user.findMany({
            where: { role: "admin" },
            select: { id: true },
          })
          
          for (const admin of adminUsers) {
            await prisma.notification.create({
              data: {
                type: "status_change",
                title: "Design Ready for Review",
                message: `Design request "${existingRequest.name}" is now in review and needs your approval.`,
                link: `/dashboard/requests/${id}`,
                userId: admin.id,
                fromUserId: user.id,
                requestId: id,
              },
            })
          }
        }
      } else if (user.role === "requester") {
        // Requester changed status - notify designer
        if (existingRequest.designerId) {
          notifyUserId = existingRequest.designerId
          
          if (newStatus === "ready_to_publish") {
            // Requester accepted the design
            notificationTitle = "Design Accepted! 🎉"
            notificationMessage = `${user.username} accepted the design for "${existingRequest.name}" - ready to publish!`
          } else if (newStatus === "published") {
            notificationTitle = "Design Published! 🎉"
            notificationMessage = `"${existingRequest.name}" has been published by ${user.username}!`
          } else if (newStatus === "changes_requested") {
            notificationTitle = "Changes Requested"
            notificationMessage = `${user.username} requested changes for "${existingRequest.name}". Please review the feedback.`
          } else {
            notificationTitle = `Request ${statusLabels[newStatus] || newStatus}`
            notificationMessage = `Status updated to ${statusLabels[newStatus] || newStatus} for "${existingRequest.name}"`
          }
        }
      }

      if (notifyUserId && notifyUserId !== user.id) {
        await prisma.notification.create({
          data: {
            type: "status_change",
            title: notificationTitle,
            message: notificationMessage,
            link: `/dashboard/requests/${id}`,
            userId: notifyUserId,
            fromUserId: user.id,
            requestId: id,
          },
        })
      }
    } catch (notifyError) {
      console.error("Failed to create notification:", notifyError)
    }

    return NextResponse.json({
      success: true,
      request: updatedRequest,
    })
  } catch (error) {
    console.error("Update status error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}
