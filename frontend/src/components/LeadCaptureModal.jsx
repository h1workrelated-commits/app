import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, formatApiError } from "@/lib/api";
import { track } from "@/lib/telemetry";
import { toast } from "sonner";

export default function LeadCaptureModal({ open, onOpenChange, item, boardUsername, accent = "#003CFF" }) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/subscribe", {
        email,
        store_username: boardUsername,
        product_id: item?.id,
      });
      track("email_submit", { item_id: item?.id, board_username: boardUsername });
      setDone(true);
      toast.success("You're on the list!");
      setTimeout(() => { onOpenChange(false); setDone(false); setEmail(""); }, 1500);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-sm" data-testid="lead-capture-modal">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">{done ? "You're in." : `Get notified when ${item?.title || "this"} launches`}</DialogTitle>
        </DialogHeader>
        {!done && (
          <form onSubmit={onSubmit} className="space-y-3 mt-2">
            <Input required type="email" autoFocus placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 rounded-xl" data-testid="lead-email-input" />
            <Button disabled={submitting} type="submit" className="w-full rounded-full h-12 text-base" style={{ backgroundColor: accent }} data-testid="lead-submit-button">
              {submitting ? "…" : (item?.cta_text || "Join waitlist")}
            </Button>
            <p className="text-xs text-zinc-500 text-center">No spam. Unsubscribe anytime.</p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
