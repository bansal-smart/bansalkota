import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MonitorSmartphone, LogIn } from "lucide-react";

interface Props {
  open: boolean;
  deviceLabel: string | null;
}

/**
 * Blocking modal shown when the user's session has been taken over by a newer
 * login on another device. The only action is "Sign in again" — which signs
 * out locally and redirects to /login.
 */
export function SessionKickedModal({ open, deviceLabel }: Props) {
  const [busy, setBusy] = useState(false);

  const handleSignIn = async () => {
    setBusy(true);
    try {
      await supabase.auth.signOut();
    } catch {
      /* ignore */
    } finally {
      window.location.href = "/login";
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => { /* blocking — no dismiss */ }}>
      <DialogContent
        className="max-w-md [&>button.absolute]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-orange-50 text-bansal-orange ring-1 ring-bansal-orange/20">
            <MonitorSmartphone className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center text-xl">
            Signed in on another device
          </DialogTitle>
          <DialogDescription className="text-center text-sm">
            Your Bansal Classes account was just used to sign in on
            {deviceLabel ? <> <span className="font-medium text-foreground">{deviceLabel}</span></> : " a new device"}.
            For your security, only one device can stay signed in at a time.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-center">
          <Button
            onClick={handleSignIn}
            disabled={busy}
            className="w-full bg-bansal-orange hover:bg-bansal-orange/90"
          >
            <LogIn className="mr-2 h-4 w-4" />
            {busy ? "Signing out…" : "Sign in again"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
