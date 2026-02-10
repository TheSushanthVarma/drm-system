"use client"

import type React from "react"

import { Suspense, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, AlertCircle, CheckCircle2, Palette, FileText } from "lucide-react"
import { useSearchParams } from "next/navigation"

function RegisterForm() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [verifiedEmail, setVerifiedEmail] = useState("")
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "requester" as "designer" | "requester",
  })
  const searchParams = useSearchParams()
  const errorCode = searchParams.get("error_code")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess(false)

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      return
    }

    // Validate password length
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long")
      return
    }

    // Validate email domain
    if (!formData.email.endsWith("@techdemocracy.com")) {
      setError("Only @techdemocracy.com email addresses are allowed")
      return
    }

    setIsLoading(true)

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formData.username.trim(),
          email: formData.email.trim(),
          password: formData.password,
          role: formData.role,
        }),
      })

      const data = await res.json()

      if (data.success) {
        setSuccess(true)
        setVerifiedEmail(formData.email.trim())
        // Reset form
        setFormData({
          username: "",
          email: "",
          password: "",
          confirmPassword: "",
          role: "requester",
        })
      } else {
        setError(data.error || "Failed to create account. Please try again.")
        setIsLoading(false)
      }
    } catch (err) {
      console.error("Signup error:", err)
      setError("An error occurred. Please try again.")
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-purple-400 to-secondary p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-10 w-72 h-72 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" />
        <div className="absolute bottom-20 left-10 w-72 h-72 bg-indigo-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" />
      </div>

      <Card className="w-full max-w-md relative z-10 bg-white/95 backdrop-blur border-0 shadow-2xl">
        <CardHeader className="space-y-2 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">DR</span>
            </div>
          </div>
          <CardTitle className="text-3xl font-bold">Create Account</CardTitle>
          <CardDescription className="text-base">Join Design Request Management</CardDescription>
        </CardHeader>

        <CardContent>
          {errorCode === "otp_expired" && (
            <div className="mb-4 flex flex-col gap-1 p-3 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span className="font-semibold">Verification link expired</span>
              </div>
              <p className="ml-6">
                The email verification link is invalid or has expired. If you&apos;ve already verified your email,
                you can go to{" "}
                <Link href="/" className="text-primary underline font-semibold">
                  Sign in
                </Link>
                . Otherwise, please register again to receive a new verification email.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="John Doe"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="pl-10 h-11 bg-muted border-0"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="you@techdemocracy.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="pl-10 h-11 bg-muted border-0"
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">Only @techdemocracy.com emails are allowed</p>
            </div>

            {/* Role Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">I am a</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: "requester" })}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                    formData.role === "requester"
                      ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                      : "border-muted bg-muted/30 hover:border-muted-foreground/30"
                  }`}
                >
                  <FileText className={`w-6 h-6 ${formData.role === "requester" ? "text-primary" : "text-muted-foreground"}`} />
                  <span className={`text-sm font-semibold ${formData.role === "requester" ? "text-primary" : "text-muted-foreground"}`}>
                    Requester
                  </span>
                  <span className="text-xs text-muted-foreground text-center">
                    Submit design requests
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: "designer" })}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                    formData.role === "designer"
                      ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                      : "border-muted bg-muted/30 hover:border-muted-foreground/30"
                  }`}
                >
                  <Palette className={`w-6 h-6 ${formData.role === "designer" ? "text-primary" : "text-muted-foreground"}`} />
                  <span className={`text-sm font-semibold ${formData.role === "designer" ? "text-primary" : "text-muted-foreground"}`}>
                    Designer
                  </span>
                  <span className="text-xs text-muted-foreground text-center">
                    Work on design tasks
                  </span>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="pl-10 pr-10 h-11 bg-muted border-0"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                <Input
                  type={showConfirm ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="pl-10 pr-10 h-11 bg-muted border-0"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                >
                  {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 rounded-lg">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="flex flex-col gap-2 p-4 text-sm text-green-700 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span className="font-semibold">Account created successfully!</span>
                </div>
                <p className="text-green-600 ml-6">
                  Please check your email ({verifiedEmail}) to verify your account before signing in.
                </p>
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading || success}
              className="w-full h-11 bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white font-semibold rounded-lg flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Create Account
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/" className="text-primary hover:underline font-semibold">
                Sign in
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-purple-400 to-secondary">
          <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  )
}
