import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/db"

// GET - Fetch all comments for a request
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

    // Check if request exists
    const existingRequest = await prisma.request.findUnique({
      where: { id },
    })

    if (!existingRequest) {
      return NextResponse.json(
        { success: false, error: "Request not found" },
        { status: 404 }
      )
    }

    // Check access permissions
    if (user.role === "requester" && existingRequest.requesterId !== user.id) {
      return NextResponse.json(
        { success: false, error: "Access denied" },
        { status: 403 }
      )
    }

    const comments = await prisma.comment.findMany({
      where: { requestId: id },
      include: {
        author: {
          select: { id: true, username: true, role: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({
      success: true,
      comments,
    })
  } catch (error) {
    console.error("Fetch comments error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST - Add a new comment to a request
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

    const { id } = await params
    const body = await request.json()
    const { content } = body

    if (!content || content.trim() === "") {
      return NextResponse.json(
        { success: false, error: "Comment content is required" },
        { status: 400 }
      )
    }

    // Check if request exists
    const existingRequest = await prisma.request.findUnique({
      where: { id },
    })

    if (!existingRequest) {
      return NextResponse.json(
        { success: false, error: "Request not found" },
        { status: 404 }
      )
    }

    // Check access permissions - requesters can only comment on their own requests
    if (user.role === "requester" && existingRequest.requesterId !== user.id) {
      return NextResponse.json(
        { success: false, error: "Access denied" },
        { status: 403 }
      )
    }

    // Designers can only comment on requests assigned to them
    if (user.role === "designer" && existingRequest.designerId !== user.id) {
      return NextResponse.json(
        { success: false, error: "You can only comment on requests assigned to you" },
        { status: 403 }
      )
    }

    // Create the comment
    const comment = await prisma.comment.create({
      data: {
        content: content.trim(),
        requestId: id,
        authorId: user.id,
      },
      include: {
        author: {
          select: { id: true, username: true, role: true },
        },
      },
    })

    // Create notification for the relevant party
    try {
      let notifyUserId: number | null = null
      let notificationType: "feedback" | "comment" = "comment"
      let notificationTitle = ""
      let notificationMessage = ""

      if (user.role === "requester") {
        // Requester left feedback - notify the designer
        if (existingRequest.designerId) {
          notifyUserId = existingRequest.designerId
          notificationType = "feedback"
          notificationTitle = "New Feedback 💬"
          notificationMessage = `${user.username} left feedback on "${existingRequest.name}"`
        } else {
          console.log("No designer assigned - skipping notification")
        }
      } else {
        // Designer/Admin left comment - notify the requester
        notifyUserId = existingRequest.requesterId
        notificationType = "comment"
        notificationTitle = "New Comment 💬"
        notificationMessage = `${user.username} commented on "${existingRequest.name}"`
      }

      if (notifyUserId && notifyUserId !== user.id) {
        console.log(`Creating notification for user ${notifyUserId}: ${notificationTitle}`)
        const notification = await prisma.notification.create({
          data: {
            type: notificationType,
            title: notificationTitle,
            message: notificationMessage,
            link: `/dashboard/requests/${id}`,
            userId: notifyUserId,
            fromUserId: user.id,
            requestId: id,
          },
        })
        console.log(`Notification created with ID: ${notification.id}`)
      } else {
        console.log(`Skipping notification - notifyUserId: ${notifyUserId}, user.id: ${user.id}`)
      }
    } catch (notifyError) {
      // Don't fail the comment creation if notification fails
      console.error("Failed to create notification:", notifyError)
    }

    return NextResponse.json({
      success: true,
      comment,
    })
  } catch (error) {
    console.error("Create comment error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}

