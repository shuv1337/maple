import { ClerkProvider, Waitlist } from "@clerk/clerk-react";

export default function WaitlistForm() {
  return (
    <ClerkProvider publishableKey={import.meta.env.PUBLIC_CLERK_PUBLISHABLE_KEY}>
      <Waitlist />
    </ClerkProvider>
  );
}
