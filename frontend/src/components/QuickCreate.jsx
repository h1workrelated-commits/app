import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sparkles, ArrowLeft, Loader2, Plus } from "lucide-react";
import { api, formatApiError } from "@/lib/api";
import { toast } from "sonner";

const STAGES = { INPUT: "input", LOADING: "loading", PREVIEW: "preview" };

export default function QuickCreate({ onCreated }) {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState(STAGES.INPUT);
  const [text, setText] = useState("");
  const [draft, setDraft] = useState({ title: "", one_liner: "", cta_text: "Join waitlist" });
  const [publishing, setPublishing] = useState(false);

  const reset = () => { setStage(STAGES.INPUT); setText(""); setDraft({ title: "", one_liner: "", cta_text: "Join waitlist" }); };
  const close = () => { setOpen(false); setTimeout(reset, 300); };

  const onImprove = async (e) => {
    e.preventDefault();
    setStage(STAGES.LOADING);
    try {
      const { data } = await api.post("/ai/improve-idea", { text });
      setDraft({
        title: data.title || "",
        one_liner: data.one_liner || "",
        cta_text: data.cta_text || "Join waitlist",
      });
      setStage(STAGES.PREVIEW);
    } catch (err) {
      toast.error(formatApiError(err));
      setStage(STAGES.INPUT);
    }
  };

  const onPublish = async () => {
    setPublishing(true);
    try {
      await api.post("/products", {
        type: "lead_magnet",
        cta_type: "waitlist",
        title: draft.title,
        one_liner: draft.one_liner,
        description: draft.one_liner,
        cta_text: draft.cta_text,
        price: 0,
        is_active: true,
      });
      toast.success("Live on your board");
      close();
      onCreated?.();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally { setPublishing(false); }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-30 group flex items-center gap-2 rounded-full bg-[#003CFF] hover:bg-[#002ED6] text-white pl-4 pr-5 py-3.5 shadow-[0_8px_24px_rgba(0,60,255,0.35)] transition-all"
        data-testid="quick-create-fab"
      >
        <Sparkles className="w-5 h-5" />
        <span className="font-medium text-sm">Quick idea</span>
      </button>

      <Dialog open={open} onOpenChange={(v) => { if (!v) close(); else setOpen(true); }}>
        <DialogContent className="rounded-2xl max-w-md" data-testid="quick-create-modal">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2">
              {stage === STAGES.PREVIEW && (
                <button onClick={() => setStage(STAGES.INPUT)} className="p-1 rounded-lg hover:bg-zinc-100" data-testid="quick-create-back">
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}
              <Sparkles className="w-5 h-5 text-[#003CFF]" />
              {stage === STAGES.PREVIEW ? "Looks good?" : "What's the idea?"}
            </DialogTitle>
          </DialogHeader>

          {stage === STAGES.INPUT && (
            <form onSubmit={onImprove} className="space-y-3 mt-2">
              <Textarea
                autoFocus
                required
                minLength={3}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="A community for indie founders. Monthly meetups, AMAs, and a private channel..."
                className="rounded-xl min-h-32 text-base"
                data-testid="quick-create-input"
              />
              <Button disabled={!text.trim()} type="submit" className="w-full rounded-full bg-[#003CFF] hover:bg-[#002ED6] h-12 text-base" data-testid="quick-create-submit">
                <Sparkles className="w-4 h-4 mr-2" /> Clean it up
              </Button>
              <p className="text-xs text-zinc-500 text-center">AI rewrites it sharp. You approve before it goes live.</p>
            </form>
          )}

          {stage === STAGES.LOADING && (
            <div className="py-12 flex flex-col items-center text-zinc-500">
              <Loader2 className="w-8 h-8 animate-spin text-[#003CFF]" />
              <p className="mt-3 text-sm">Sharpening your idea…</p>
            </div>
          )}

          {stage === STAGES.PREVIEW && (
            <div className="space-y-3 mt-2">
              <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-5" data-testid="quick-create-preview">
                <div className="text-xs font-semibold tracking-wider uppercase text-zinc-500 mb-2">Preview</div>
                <div className="font-heading font-bold text-lg text-zinc-900">{draft.title}</div>
                <div className="text-sm text-zinc-700 mt-1">{draft.one_liner}</div>
                <button className="mt-3 inline-flex items-center rounded-full bg-[#003CFF] text-white px-4 py-2 text-sm font-medium pointer-events-none">
                  {draft.cta_text}
                </button>
              </div>
              <div>
                <Label className="text-xs font-semibold tracking-wider uppercase text-zinc-700">Title</Label>
                <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className="mt-1.5 h-11 rounded-xl" data-testid="quick-create-title" />
              </div>
              <div>
                <Label className="text-xs font-semibold tracking-wider uppercase text-zinc-700">One-liner</Label>
                <Input value={draft.one_liner} onChange={(e) => setDraft({ ...draft, one_liner: e.target.value })} className="mt-1.5 h-11 rounded-xl" data-testid="quick-create-oneliner" />
              </div>
              <div>
                <Label className="text-xs font-semibold tracking-wider uppercase text-zinc-700">Button text</Label>
                <Input value={draft.cta_text} onChange={(e) => setDraft({ ...draft, cta_text: e.target.value })} className="mt-1.5 h-11 rounded-xl" data-testid="quick-create-cta" />
              </div>
              <Button disabled={publishing || !draft.title} onClick={onPublish} className="w-full rounded-full bg-[#003CFF] hover:bg-[#002ED6] h-12 text-base" data-testid="quick-create-publish">
                {publishing ? "Publishing…" : <><Plus className="w-4 h-4 mr-2" /> Publish to my board</>}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
