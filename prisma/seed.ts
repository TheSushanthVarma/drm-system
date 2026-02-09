import { PrismaClient } from "@prisma/client"
import { createClient } from "@supabase/supabase-js"
import "dotenv/config"

const prisma = new PrismaClient()

// Initialize Supabase Admin Client for user creation
// Note: You'll need to set SUPABASE_SERVICE_ROLE_KEY in your environment
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing Supabase environment variables:")
  console.error("   - NEXT_PUBLIC_SUPABASE_URL")
  console.error("   - SUPABASE_SERVICE_ROLE_KEY")
  console.error("\nPlease add these to your .env or .env.local file")
  console.error("\nYou can find these values in:")
  console.error("   - Supabase Dashboard → Settings → API")
  console.error("   - NEXT_PUBLIC_SUPABASE_URL: Project URL")
  console.error("   - SUPABASE_SERVICE_ROLE_KEY: service_role key (keep secret!)")
  process.exit(1)
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

interface UserSeedData {
  username: string
  email: string
  password: string
  role: "admin" | "designer" | "requester"
  status: "active" | "inactive"
  lastLogin?: Date
}

const userSeedData: UserSeedData[] = [
  {
    username: "admin",
    email: "admin@drm-system.com",
    password: "testuser123",
    role: "admin",
    status: "active",
    lastLogin: new Date("2026-01-08T09:00:00Z"),
  },
  {
    username: "sarah.designer",
    email: "sarah@drm-system.com",
    password: "testuser123",
    role: "designer",
    status: "active",
    lastLogin: new Date("2026-01-07T14:30:00Z"),
  },
  {
    username: "mike.creative",
    email: "mike@drm-system.com",
    password: "testuser123",
    role: "designer",
    status: "active",
    lastLogin: new Date("2026-01-08T08:15:00Z"),
  },
  {
    username: "emma.graphics",
    email: "emma@drm-system.com",
    password: "testuser123",
    role: "designer",
    status: "active",
    lastLogin: new Date("2026-01-06T16:45:00Z"),
  },
  {
    username: "john.marketing",
    email: "john@company.com",
    password: "testuser123",
    role: "requester",
    status: "active",
    lastLogin: new Date("2026-01-08T10:00:00Z"),
  },
  {
    username: "lisa.sales",
    email: "lisa@company.com",
    password: "testuser123",
    role: "requester",
    status: "active",
    lastLogin: new Date("2026-01-07T11:20:00Z"),
  },
  {
    username: "david.product",
    email: "david@company.com",
    password: "testuser123",
    role: "requester",
    status: "active",
    lastLogin: new Date("2026-01-05T09:30:00Z"),
  },
  {
    username: "alex.events",
    email: "alex@company.com",
    password: "testuser123",
    role: "requester",
    status: "inactive",
    lastLogin: new Date("2025-12-20T14:00:00Z"),
  },
  {
    username: "rachel.hr",
    email: "rachel@company.com",
    password: "testuser123",
    role: "requester",
    status: "active",
    lastLogin: new Date("2026-01-08T07:45:00Z"),
  },
  {
    username: "superadmin",
    email: "superadmin@drm-system.com",
    password: "testuser123",
    role: "admin",
    status: "active",
    lastLogin: new Date("2026-01-08T06:00:00Z"),
  },
]

async function main() {
  console.log("🌱 Starting database seed...")

  // Clear existing data
  console.log("🧹 Clearing existing data...")
  await prisma.comment.deleteMany()
  await prisma.asset.deleteMany()
  await prisma.request.deleteMany()
  await prisma.catalogue.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.user.deleteMany()

  // Create users in Supabase Auth and our database
  console.log("👥 Creating users in Supabase Auth and database...")
  const createdUsers: Record<string, { id: string; username: string; email: string }> = {}

  for (const userData of userSeedData) {
    try {
      // Create user in Supabase Auth
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          username: userData.username,
        },
      })

      if (authError) {
        // If user already exists, try to get them
        if (authError.message.includes("already registered")) {
          console.log(`   ⚠️  User ${userData.email} already exists in Supabase Auth, fetching...`)
          const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers()
          const foundUser = existingUser?.users.find((u) => u.email === userData.email)
          if (foundUser) {
            // Create user profile in our database
            const dbUser = await prisma.user.create({
              data: {
                id: foundUser.id,
                username: userData.username,
                email: userData.email,
                role: userData.role,
                status: userData.status,
                lastLogin: userData.lastLogin,
              },
            })
            createdUsers[userData.username] = {
              id: dbUser.id,
              username: dbUser.username,
              email: dbUser.email,
            }
            console.log(`   ✅ User profile created: ${userData.username}`)
            continue
          }
        }
        throw authError
      }

      if (!authUser.user) {
        throw new Error(`Failed to create auth user for ${userData.email}`)
      }

      // Create user profile in our database
      const dbUser = await prisma.user.create({
        data: {
          id: authUser.user.id,
          username: userData.username,
          email: userData.email,
          role: userData.role,
          status: userData.status,
          lastLogin: userData.lastLogin,
        },
      })

      createdUsers[userData.username] = {
        id: dbUser.id,
        username: dbUser.username,
        email: dbUser.email,
      }

      console.log(`   ✅ Created: ${userData.username} (${userData.role})`)
    } catch (error) {
      console.error(`   ❌ Error creating user ${userData.username}:`, error)
      throw error
    }
  }

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
        requesterId: createdUsers["john.marketing"].id,
        designerId: createdUsers["sarah.designer"].id,
      },
      {
        drmCode: "DRM-2026-002",
        name: "Sales Presentation Template",
        description: "PowerPoint template for the sales team with updated brand guidelines and new logo placement.",
        referenceLink: "https://drive.google.com/file/d/brand-guidelines-2026",
        status: "submitted",
        priority: "medium",
        dueDate: new Date("2026-01-20"),
        requesterId: createdUsers["lisa.sales"].id,
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
        requesterId: createdUsers["john.marketing"].id,
        designerId: createdUsers["mike.creative"].id,
      },
      {
        drmCode: "DRM-2026-004",
        name: "Trade Show Booth Design",
        description: "Booth graphics and signage for the upcoming industry trade show. Includes backdrop, table covers, and standee designs.",
        referenceLink: "https://pinterest.com/boards/trade-show-booth-inspiration-very-long-url-example-for-testing",
        status: "in_review",
        priority: "high",
        dueDate: new Date("2026-02-01"),
        requesterId: createdUsers["david.product"].id,
        designerId: createdUsers["emma.graphics"].id,
      },
      {
        drmCode: "DRM-2026-005",
        name: "Social Media Content Pack",
        description: "Monthly social media graphics package including Instagram posts, stories, and LinkedIn banners.",
        status: "assigned",
        priority: "medium",
        dueDate: new Date("2026-01-25"),
        requesterId: createdUsers["john.marketing"].id,
        designerId: createdUsers["sarah.designer"].id,
      },
      {
        drmCode: "DRM-2026-006",
        name: "Employee Handbook Redesign",
        description: "Complete redesign of the employee handbook with new brand colors and improved layout.",
        status: "draft",
        priority: "low",
        dueDate: new Date("2026-02-28"),
        requesterId: createdUsers["rachel.hr"].id,
        designerId: null,
      },
      {
        drmCode: "DRM-2026-007",
        name: "Website Hero Section Update",
        description: "New hero section graphics for homepage refresh with animated elements.",
        status: "changes_requested",
        priority: "high",
        dueDate: new Date("2026-01-12"),
        requesterId: createdUsers["david.product"].id,
        designerId: createdUsers["mike.creative"].id,
      },
      {
        drmCode: "DRM-2026-008",
        name: "Customer Newsletter Template",
        description: "Monthly newsletter template with modular design for easy content updates.",
        status: "published",
        priority: "medium",
        dueDate: new Date("2026-01-05"),
        requesterId: createdUsers["lisa.sales"].id,
        designerId: createdUsers["sarah.designer"].id,
      },
      {
        drmCode: "DRM-2026-009",
        name: "Annual Report 2025",
        description: "Design and layout of the 2025 annual report including infographics and data visualizations.",
        status: "in_design",
        priority: "campaign_critical",
        dueDate: new Date("2026-01-30"),
        requesterId: createdUsers["rachel.hr"].id,
        designerId: createdUsers["emma.graphics"].id,
      },
      {
        drmCode: "DRM-2026-010",
        name: "Mobile App Onboarding Screens",
        description: "Onboarding illustration screens for the new mobile app launch.",
        status: "submitted",
        priority: "high",
        dueDate: new Date("2026-01-18"),
        requesterId: createdUsers["david.product"].id,
        designerId: null,
      },
      {
        drmCode: "DRM-2025-089",
        name: "Holiday Campaign Graphics",
        description: "Holiday-themed marketing materials for winter campaign.",
        status: "archived",
        priority: "medium",
        dueDate: new Date("2025-12-20"),
        requesterId: createdUsers["alex.events"].id,
        designerId: createdUsers["mike.creative"].id,
      },
      {
        drmCode: "DRM-2026-011",
        name: "Product Packaging Mockups",
        description: "3D packaging mockups for new product line presentation.",
        status: "draft",
        priority: "medium",
        dueDate: new Date("2026-02-15"),
        requesterId: createdUsers["david.product"].id,
        designerId: null,
      },
      {
        drmCode: "DRM-2026-012",
        name: "Webinar Promotional Graphics",
        description: "Banner and social graphics for upcoming webinar series.",
        status: "in_review",
        priority: "high",
        dueDate: new Date("2026-01-14"),
        requesterId: createdUsers["john.marketing"].id,
        designerId: createdUsers["sarah.designer"].id,
      },
      {
        drmCode: "DRM-2026-013",
        name: "Brand Guidelines Document",
        description: "Updated brand guidelines PDF with new visual identity elements.",
        status: "assigned",
        priority: "low",
        dueDate: new Date("2026-03-01"),
        requesterId: createdUsers["rachel.hr"].id,
        designerId: createdUsers["emma.graphics"].id,
      },
      {
        drmCode: "DRM-2026-014",
        name: "Video Thumbnail Templates",
        description: "YouTube thumbnail templates for video marketing team.",
        status: "ready_to_publish",
        priority: "medium",
        dueDate: new Date("2026-01-08"),
        requesterId: createdUsers["john.marketing"].id,
        designerId: createdUsers["mike.creative"].id,
      },
    ],
  })

  console.log("✅ Created 15 design requests")

  // Create some comments on requests
  console.log("💬 Creating comments...")

  const requests = await prisma.request.findMany()

  const requestDRM001 = requests.find((r) => r.drmCode === "DRM-2026-001")
  const requestDRM004 = requests.find((r) => r.drmCode === "DRM-2026-004")
  const requestDRM007 = requests.find((r) => r.drmCode === "DRM-2026-007")

  if (requestDRM001) {
    await prisma.comment.createMany({
      data: [
        {
          content: "Please make sure to use the new brand colors from the 2026 guidelines.",
          requestId: requestDRM001.id,
          authorId: createdUsers["john.marketing"].id,
        },
        {
          content: "Got it! I'll also include the gradient overlay as discussed. First draft coming soon.",
          requestId: requestDRM001.id,
          authorId: createdUsers["sarah.designer"].id,
        },
        {
          content: "First draft looks great! Can we make the CTA button more prominent?",
          requestId: requestDRM001.id,
          authorId: createdUsers["john.marketing"].id,
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
          authorId: createdUsers["david.product"].id,
        },
        {
          content: "Thanks! Working on the initial concepts. Should have something by end of week.",
          requestId: requestDRM004.id,
          authorId: createdUsers["emma.graphics"].id,
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
          authorId: createdUsers["david.product"].id,
        },
        {
          content: "Also, the headline text needs to be larger for mobile devices.",
          requestId: requestDRM007.id,
          authorId: createdUsers["david.product"].id,
        },
        {
          content: "Will make those adjustments and send updated version tomorrow.",
          requestId: requestDRM007.id,
          authorId: createdUsers["mike.creative"].id,
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
          uploadedById: createdUsers["sarah.designer"].id,
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
          uploadedById: createdUsers["sarah.designer"].id,
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
          uploadedById: createdUsers["sarah.designer"].id,
        },
      ],
    })
  }

  const requestDRM003 = requests.find((r) => r.drmCode === "DRM-2026-003")
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
          uploadedById: createdUsers["mike.creative"].id,
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
          uploadedById: createdUsers["mike.creative"].id,
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
          uploadedById: createdUsers["mike.creative"].id,
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
