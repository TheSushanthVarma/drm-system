import { PrismaClient } from "../lib/generated/prisma/client"
import * as bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Starting database seed...")

  // Hash the password "testuser123" for all users
  const hashedPassword = await bcrypt.hash("testuser123", 10)

  // Clear existing data
  console.log("🧹 Clearing existing data...")
  await prisma.comment.deleteMany()
  await prisma.asset.deleteMany()
  await prisma.request.deleteMany()
  await prisma.user.deleteMany()

  // Create Users
  console.log("👥 Creating users...")
  
  const adminUser = await prisma.user.create({
    data: {
      username: "admin",
      email: "admin@drm-system.com",
      password: hashedPassword,
      role: "admin",
      status: "active",
      lastLogin: new Date("2026-01-08T09:00:00Z"),
    },
  })

  const designerSarah = await prisma.user.create({
    data: {
      username: "sarah.designer",
      email: "sarah@drm-system.com",
      password: hashedPassword,
      role: "designer",
      status: "active",
      lastLogin: new Date("2026-01-07T14:30:00Z"),
    },
  })

  const designerMike = await prisma.user.create({
    data: {
      username: "mike.creative",
      email: "mike@drm-system.com",
      password: hashedPassword,
      role: "designer",
      status: "active",
      lastLogin: new Date("2026-01-08T08:15:00Z"),
    },
  })

  const designerEmma = await prisma.user.create({
    data: {
      username: "emma.graphics",
      email: "emma@drm-system.com",
      password: hashedPassword,
      role: "designer",
      status: "active",
      lastLogin: new Date("2026-01-06T16:45:00Z"),
    },
  })

  const requesterJohn = await prisma.user.create({
    data: {
      username: "john.marketing",
      email: "john@company.com",
      password: hashedPassword,
      role: "requester",
      status: "active",
      lastLogin: new Date("2026-01-08T10:00:00Z"),
    },
  })

  const requesterLisa = await prisma.user.create({
    data: {
      username: "lisa.sales",
      email: "lisa@company.com",
      password: hashedPassword,
      role: "requester",
      status: "active",
      lastLogin: new Date("2026-01-07T11:20:00Z"),
    },
  })

  const requesterDavid = await prisma.user.create({
    data: {
      username: "david.product",
      email: "david@company.com",
      password: hashedPassword,
      role: "requester",
      status: "active",
      lastLogin: new Date("2026-01-05T09:30:00Z"),
    },
  })

  const requesterAlex = await prisma.user.create({
    data: {
      username: "alex.events",
      email: "alex@company.com",
      password: hashedPassword,
      role: "requester",
      status: "inactive",
      lastLogin: new Date("2025-12-20T14:00:00Z"),
    },
  })

  const requesterRachel = await prisma.user.create({
    data: {
      username: "rachel.hr",
      email: "rachel@company.com",
      password: hashedPassword,
      role: "requester",
      status: "active",
      lastLogin: new Date("2026-01-08T07:45:00Z"),
    },
  })

  const adminSuper = await prisma.user.create({
    data: {
      username: "superadmin",
      email: "superadmin@drm-system.com",
      password: hashedPassword,
      role: "admin",
      status: "active",
      lastLogin: new Date("2026-01-08T06:00:00Z"),
    },
  })

  console.log("✅ Created 10 users")

  // Create Design Requests
  console.log("📋 Creating design requests...")

  await prisma.request.createMany({
    data: [
      {
        drmCode: "DRM-2026-001",
        name: "Q1 Marketing Campaign Banner",
        description: "Hero banner for the Q1 2026 marketing campaign featuring new product launch. Required sizes: 1920x600, 1200x628, 300x250.",
        referenceLink: "https://www.figma.com/design/abc123xyz/q1-campaign-inspiration-board?node-id=0-1",
        status: "in_design",
        priority: "high",
        dueDate: new Date("2026-01-15"),
        requesterId: requesterJohn.id,
        designerId: designerSarah.id,
      },
      {
        drmCode: "DRM-2026-002",
        name: "Sales Presentation Template",
        description: "PowerPoint template for the sales team with updated brand guidelines and new logo placement.",
        referenceLink: "https://drive.google.com/file/d/brand-guidelines-2026",
        status: "submitted",
        priority: "medium",
        dueDate: new Date("2026-01-20"),
        requesterId: requesterLisa.id,
        designerId: null,
      },
      {
        drmCode: "DRM-2026-003",
        name: "Product Launch Email Graphics",
        description: "Email header and footer graphics for the upcoming product launch email campaign.",
        referenceLink: "https://www.canva.com/design/DAGb123/email-templates-reference",
        status: "ready_to_publish",
        priority: "campaign_critical",
        dueDate: new Date("2026-01-10"),
        requesterId: requesterJohn.id,
        designerId: designerMike.id,
      },
      {
        drmCode: "DRM-2026-004",
        name: "Trade Show Booth Design",
        description: "Booth graphics and signage for the upcoming industry trade show. Includes backdrop, table covers, and standee designs.",
        referenceLink: "https://pinterest.com/boards/trade-show-booth-inspiration-very-long-url-example-for-testing",
        status: "in_review",
        priority: "high",
        dueDate: new Date("2026-02-01"),
        requesterId: requesterDavid.id,
        designerId: designerEmma.id,
      },
      {
        drmCode: "DRM-2026-005",
        name: "Social Media Content Pack",
        description: "Monthly social media graphics package including Instagram posts, stories, and LinkedIn banners.",
        status: "assigned",
        priority: "medium",
        dueDate: new Date("2026-01-25"),
        requesterId: requesterJohn.id,
        designerId: designerSarah.id,
      },
      {
        drmCode: "DRM-2026-006",
        name: "Employee Handbook Redesign",
        description: "Complete redesign of the employee handbook with new brand colors and improved layout.",
        status: "draft",
        priority: "low",
        dueDate: new Date("2026-02-28"),
        requesterId: requesterRachel.id,
        designerId: null,
      },
      {
        drmCode: "DRM-2026-007",
        name: "Website Hero Section Update",
        description: "New hero section graphics for homepage refresh with animated elements.",
        status: "changes_requested",
        priority: "high",
        dueDate: new Date("2026-01-12"),
        requesterId: requesterDavid.id,
        designerId: designerMike.id,
      },
      {
        drmCode: "DRM-2026-008",
        name: "Customer Newsletter Template",
        description: "Monthly newsletter template with modular design for easy content updates.",
        status: "published",
        priority: "medium",
        dueDate: new Date("2026-01-05"),
        requesterId: requesterLisa.id,
        designerId: designerSarah.id,
      },
      {
        drmCode: "DRM-2026-009",
        name: "Annual Report 2025",
        description: "Design and layout of the 2025 annual report including infographics and data visualizations.",
        status: "in_design",
        priority: "campaign_critical",
        dueDate: new Date("2026-01-30"),
        requesterId: requesterRachel.id,
        designerId: designerEmma.id,
      },
      {
        drmCode: "DRM-2026-010",
        name: "Mobile App Onboarding Screens",
        description: "Onboarding illustration screens for the new mobile app launch.",
        status: "submitted",
        priority: "high",
        dueDate: new Date("2026-01-18"),
        requesterId: requesterDavid.id,
        designerId: null,
      },
      {
        drmCode: "DRM-2025-089",
        name: "Holiday Campaign Graphics",
        description: "Holiday-themed marketing materials for winter campaign.",
        status: "archived",
        priority: "medium",
        dueDate: new Date("2025-12-20"),
        requesterId: requesterAlex.id,
        designerId: designerMike.id,
      },
      {
        drmCode: "DRM-2026-011",
        name: "Product Packaging Mockups",
        description: "3D packaging mockups for new product line presentation.",
        status: "draft",
        priority: "medium",
        dueDate: new Date("2026-02-15"),
        requesterId: requesterDavid.id,
        designerId: null,
      },
      {
        drmCode: "DRM-2026-012",
        name: "Webinar Promotional Graphics",
        description: "Banner and social graphics for upcoming webinar series.",
        status: "in_review",
        priority: "high",
        dueDate: new Date("2026-01-14"),
        requesterId: requesterJohn.id,
        designerId: designerSarah.id,
      },
      {
        drmCode: "DRM-2026-013",
        name: "Brand Guidelines Document",
        description: "Updated brand guidelines PDF with new visual identity elements.",
        status: "assigned",
        priority: "low",
        dueDate: new Date("2026-03-01"),
        requesterId: requesterRachel.id,
        designerId: designerEmma.id,
      },
      {
        drmCode: "DRM-2026-014",
        name: "Video Thumbnail Templates",
        description: "YouTube thumbnail templates for video marketing team.",
        status: "ready_to_publish",
        priority: "medium",
        dueDate: new Date("2026-01-08"),
        requesterId: requesterJohn.id,
        designerId: designerMike.id,
      },
    ],
  })

  console.log("✅ Created 15 design requests")

  // Create some comments on requests
  console.log("💬 Creating comments...")

  const requests = await prisma.request.findMany()
  
  // Add comments to some requests
  const requestDRM001 = requests.find(r => r.drmCode === "DRM-2026-001")
  const requestDRM004 = requests.find(r => r.drmCode === "DRM-2026-004")
  const requestDRM007 = requests.find(r => r.drmCode === "DRM-2026-007")

  if (requestDRM001) {
    await prisma.comment.createMany({
      data: [
        {
          content: "Please make sure to use the new brand colors from the 2026 guidelines.",
          requestId: requestDRM001.id,
          authorId: requesterJohn.id,
        },
        {
          content: "Got it! I'll also include the gradient overlay as discussed. First draft coming soon.",
          requestId: requestDRM001.id,
          authorId: designerSarah.id,
        },
        {
          content: "First draft looks great! Can we make the CTA button more prominent?",
          requestId: requestDRM001.id,
          authorId: requesterJohn.id,
        },
      ],
    })
  }

  if (requestDRM004) {
    await prisma.comment.createMany({
      data: [
        {
          content: "The booth dimensions are 10x10 feet. I've attached the venue specifications.",
          requestId: requestDRM004.id,
          authorId: requesterDavid.id,
        },
        {
          content: "Thanks! Working on the initial concepts. Should have something by end of week.",
          requestId: requestDRM004.id,
          authorId: designerEmma.id,
        },
      ],
    })
  }

  if (requestDRM007) {
    await prisma.comment.createMany({
      data: [
        {
          content: "The animation feels too fast. Can we slow it down by about 30%?",
          requestId: requestDRM007.id,
          authorId: requesterDavid.id,
        },
        {
          content: "Also, the headline text needs to be larger for mobile devices.",
          requestId: requestDRM007.id,
          authorId: requesterDavid.id,
        },
        {
          content: "Will make those adjustments and send updated version tomorrow.",
          requestId: requestDRM007.id,
          authorId: designerMike.id,
        },
      ],
    })
  }

  console.log("✅ Created sample comments")

  // Create some sample assets
  console.log("📁 Creating sample assets...")

  if (requestDRM001) {
    await prisma.asset.createMany({
      data: [
        {
          filename: "hero-banner-v1.psd",
          fileUrl: "/uploads/drm-2026-001/hero-banner-v1.psd",
          fileType: "application/vnd.adobe.photoshop",
          fileSize: 15728640,
          assetType: "source",
          version: 1,
          versionNote: "Initial design draft",
          requestId: requestDRM001.id,
          uploadedById: designerSarah.id,
        },
        {
          filename: "hero-banner-v2.psd",
          fileUrl: "/uploads/drm-2026-001/hero-banner-v2.psd",
          fileType: "application/vnd.adobe.photoshop",
          fileSize: 16777216,
          assetType: "source",
          version: 2,
          versionNote: "Updated with feedback - larger CTA button",
          requestId: requestDRM001.id,
          uploadedById: designerSarah.id,
        },
        {
          filename: "hero-banner-1920x600.png",
          fileUrl: "/uploads/drm-2026-001/hero-banner-1920x600.png",
          fileType: "image/png",
          fileSize: 2457600,
          assetType: "final",
          version: 1,
          versionNote: "Final approved version - Desktop",
          requestId: requestDRM001.id,
          uploadedById: designerSarah.id,
        },
      ],
    })
  }

  const requestDRM003 = requests.find(r => r.drmCode === "DRM-2026-003")
  if (requestDRM003) {
    await prisma.asset.createMany({
      data: [
        {
          filename: "email-graphics.ai",
          fileUrl: "/uploads/drm-2026-003/email-graphics.ai",
          fileType: "application/illustrator",
          fileSize: 8388608,
          assetType: "source",
          version: 1,
          versionNote: "Source Illustrator file",
          requestId: requestDRM003.id,
          uploadedById: designerMike.id,
        },
        {
          filename: "email-header-final.png",
          fileUrl: "/uploads/drm-2026-003/email-header-final.png",
          fileType: "image/png",
          fileSize: 512000,
          assetType: "final",
          version: 1,
          versionNote: "Final email header",
          requestId: requestDRM003.id,
          uploadedById: designerMike.id,
        },
        {
          filename: "email-footer-final.png",
          fileUrl: "/uploads/drm-2026-003/email-footer-final.png",
          fileType: "image/png",
          fileSize: 256000,
          assetType: "final",
          version: 1,
          versionNote: "Final email footer",
          requestId: requestDRM003.id,
          uploadedById: designerMike.id,
        },
      ],
    })
  }

  console.log("✅ Created sample assets")

  console.log("\n🎉 Database seeding completed successfully!")
  console.log("\n📋 Summary:")
  console.log("   - 10 Users (password: testuser123)")
  console.log("   - 15 Design Requests")
  console.log("   - Sample Comments")
  console.log("   - Sample Assets")
  console.log("\n👤 User Accounts:")
  console.log("   Admins:")
  console.log("     - admin@drm-system.com")
  console.log("     - superadmin@drm-system.com")
  console.log("   Designers:")
  console.log("     - sarah@drm-system.com")
  console.log("     - mike@drm-system.com")
  console.log("     - emma@drm-system.com")
  console.log("   Requesters:")
  console.log("     - john@company.com")
  console.log("     - lisa@company.com")
  console.log("     - david@company.com")
  console.log("     - alex@company.com")
  console.log("     - rachel@company.com")
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

