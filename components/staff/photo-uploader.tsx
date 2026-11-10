"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2 } from "lucide-react";
import { useToast } from "@/components/toast";

export function PhotoUploader({ staffId, hasPhoto }: { staffId: string; hasPhoto: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  async function upload(file: File) {
    setLoading(true);
    try {
      const form = new FormData();
      form.append("photo", file);
      const res = await fetch(`/api/staff/${staffId}/photo`, { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed.");
      toast.push("success", "Photo updated", "Profile photograph saved.");
      router.refresh();
    } catch (err) {
      toast.push("error", "Upload failed", err instanceof Error ? err.message : undefined);
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full border-2 border-white bg-navy-900 text-white shadow-sm hover:bg-navy-800"
        title={hasPhoto ? "Change photo" : "Upload photo"}
      >
        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload(file);
        }}
      />
    </>
  );
}
