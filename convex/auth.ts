import Google from "@auth/core/providers/google";
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import type { AuthProviderConfig } from "@convex-dev/auth/server";

const providers: AuthProviderConfig[] = [Password];

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(Google);
}

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers,
});
