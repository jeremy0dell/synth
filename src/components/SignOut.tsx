import { LogOut } from "lucide-react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Button } from "./ui";

export function SignOut() {
  const { signOut } = useAuthActions();

  return (
    <Button type="button" onClick={() => void signOut()}>
      <LogOut size={16} aria-hidden="true" />
      Sign out
    </Button>
  );
}
