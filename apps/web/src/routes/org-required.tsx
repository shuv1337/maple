import { OrganizationSwitcher, useAuth } from "@clerk/clerk-react"
import { Navigate, createFileRoute } from "@tanstack/react-router"
import { isClerkAuthEnabled } from "@/lib/services/common/auth-mode"

export const Route = createFileRoute("/org-required")({
  component: OrgRequiredPage,
})

function OrgRequiredPage() {
  if (!isClerkAuthEnabled) {
    return <Navigate to="/" replace />
  }

  return <OrgRequiredPageClerk />
}

function OrgRequiredPageClerk() {
  const { isLoaded, isSignedIn, orgId } = useAuth()

  if (!isLoaded) {
    return null
  }

  if (!isSignedIn) {
    return <Navigate to="/sign-in" replace />
  }

  if (orgId) {
    return <Navigate to="/" replace />
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-lg border bg-card p-6">
        <h1 className="text-xl font-semibold">Organization required</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Select or create an organization before entering the app.
        </p>
        <div className="mt-4">
          <OrganizationSwitcher hidePersonal />
        </div>
      </div>
    </main>
  )
}
