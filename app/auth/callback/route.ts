import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@/utils/supabase/server"
import { type EmailOtpType } from "@supabase/supabase-js"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get("token_hash")
  const type = searchParams.get("type") as EmailOtpType | null
  const next = searchParams.get("next") || "/"

  // Create redirect link without the secret token
  const redirectTo = request.nextUrl.clone()
  redirectTo.pathname = next
  redirectTo.searchParams.delete("token_hash")
  redirectTo.searchParams.delete("type")
  redirectTo.searchParams.delete("next")

  if (token_hash && type) {
    try {
      const cookieStore = await cookies()
      const supabase = createClient(cookieStore)

      const { error } = await supabase.auth.verifyOtp({
        type,
        token_hash,
      })

      if (!error) {
        // Email verified successfully, redirect to login or dashboard
        redirectTo.pathname = "/"
        redirectTo.searchParams.set("verified", "true")
        return NextResponse.redirect(redirectTo)
      } else {
        console.error("Email verification error:", error)
        redirectTo.pathname = "/register"
        redirectTo.searchParams.set("error", "verification_failed")
        return NextResponse.redirect(redirectTo)
      }
    } catch (error) {
      console.error("Email verification error:", error)
      redirectTo.pathname = "/register"
      redirectTo.searchParams.set("error", "verification_failed")
      return NextResponse.redirect(redirectTo)
    }
  }

  // Invalid request, redirect to register page
  redirectTo.pathname = "/register"
  redirectTo.searchParams.set("error", "invalid_token")
  return NextResponse.redirect(redirectTo)
}
