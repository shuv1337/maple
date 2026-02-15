import { SignUp } from "@clerk/clerk-react"
import { Navigate, createFileRoute } from "@tanstack/react-router"
import { isClerkAuthEnabled } from "@/lib/services/common/auth-mode"

export const Route = createFileRoute("/sign-up")({
  component: SignUpPage,
})

function SignUpPage() {
  if (!isClerkAuthEnabled) {
    return <Navigate to="/" replace />
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <SignUp />
    </main>
  )
}
