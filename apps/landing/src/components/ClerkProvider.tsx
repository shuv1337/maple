import { ClerkProvider as ClerkReactProvider } from "@clerk/clerk-react";
import type { ReactNode } from "react";


export default function ClerkProvider(props: {
    children: ReactNode;
}) {
    return <ClerkReactProvider publishableKey={import.meta.env.PUBLIC_CLERK_PUBLISHABLE_KEY} {...props}  />;
}