import { toast } from "sonner";

// navigator.clipboard only exists in a secure context (HTTPS, or localhost) —
// on a plain-HTTP LAN deployment (e.g. http://192.168.x.x:8080, flagged "Not
// secure" by the browser) it's undefined, so `navigator.clipboard.writeText`
// throws a synchronous TypeError instead of rejecting a promise. Several
// copy-to-clipboard buttons called it unguarded and crashed on this exact
// deployment. Centralizing the guard here also gives the user a way to
// actually get the value (shown in the failure toast) instead of a silent
// no-op or a crash.
export async function copyToClipboard(text: string, successMessage = "Copied"): Promise<boolean> {
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
    } else {
      const input = document.createElement("textarea");
      input.value = text;
      input.setAttribute("readonly", "");
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.select();
      const copied = document.execCommand("copy");
      input.remove();
      if (!copied) throw new Error("Clipboard fallback failed");
    }
    toast.success(successMessage);
    return true;
  } catch {
    toast.error("Couldn't copy automatically — copy manually", { description: text });
    return false;
  }
}
