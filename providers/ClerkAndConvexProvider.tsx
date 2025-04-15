import { ClerkLoaded, ClerkProvider, useAuth } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/dist/token-cache";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";


const convex=new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!,{
    unsavedChangesWarning: false
})

const publishableKey=process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!

if(!publishableKey){
  throw new Error(
    "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is not defined"
  )
}


export default function ClerkAndConvexProvider({children}:{children:React.ReactNode}) {
  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
        <ConvexProviderWithClerk useAuth={useAuth} client={convex}>
            <ClerkLoaded>{children}</ClerkLoaded>
        </ConvexProviderWithClerk>
    </ClerkProvider>
  )
}