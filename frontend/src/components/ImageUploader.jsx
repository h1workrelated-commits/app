import { useRef, useState } from "react";
import { api, formatApiError } from "@/lib/api";
import { Upload, Loader2, X, ImageIcon } from "lucide-react";
import { toast } from "sonner";

export default function ImageUploader({ value, onChange, label = "image", aspect = "video", testId }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const onPick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image too large (5 MB max)");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/upload", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onChange(`${process.env.REACT_APP_BACKEND_URL}${data.url}`);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const aspectClass = aspect === "square" ? "aspect-square" : "aspect-video";

  return (
    <div>
      <input ref={inputRef} type="file" accept="image/*" onChange={onPick} className="hidden" data-testid={`${testId}-input`} />
      {value ? (
        <div className={`relative group rounded-xl overflow-hidden border border-zinc-200 ${aspectClass} bg-zinc-100`} data-testid={`${testId}-preview`}>
          <img src={value} alt={label} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
          <div className="absolute top-2 right-2 flex gap-1.5 opacity-90">
            <button type="button" onClick={() => inputRef.current?.click()} className="p-1.5 rounded-full bg-white shadow-sm hover:bg-zinc-100" data-testid={`${testId}-replace`} title="Replace">
              <Upload className="w-3.5 h-3.5 text-zinc-700" />
            </button>
            <button type="button" onClick={() => onChange("")} className="p-1.5 rounded-full bg-white shadow-sm hover:bg-zinc-100" data-testid={`${testId}-remove`} title="Remove">
              <X className="w-3.5 h-3.5 text-zinc-700" />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className={`w-full ${aspectClass} border-2 border-dashed border-zinc-200 rounded-xl flex flex-col items-center justify-center text-sm text-zinc-500 hover:border-[#003CFF] hover:bg-[#003CFF]/5 hover:text-[#003CFF] transition-all`}
          data-testid={`${testId}-dropzone`}
        >
          {uploading ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="mt-2">Uploading…</span>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center mb-2">
                <ImageIcon className="w-5 h-5 text-zinc-500" />
              </div>
              <span className="font-medium">Click to upload {label}</span>
              <span className="text-xs text-zinc-400 mt-1">JPG, PNG, WEBP up to 5 MB</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
