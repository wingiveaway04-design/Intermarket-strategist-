"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function RecordDeleteButton({ kind, id }: { kind: "journal" | "research"; id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function removeRecord() {
    const label = kind === "journal" ? "private journal entry" : "public research publication";
    if (!window.confirm(`Delete this ${label}? This cannot be undone.`)) return;
    setBusy(true);
    setError("");
    const supabase = createClient();

    if (kind === "journal") {
      const { data: images } = await supabase.from("images").select("storage_path").eq("private_trade_id", id);
      const paths = (images ?? []).map((image) => image.storage_path);
      if (paths.length) {
        const { error: storageError } = await supabase.storage.from("trade-journal").remove(paths);
        if (storageError) {
          setError("Could not remove the trade screenshot(s): " + storageError.message);
          setBusy(false);
          return;
        }
      }
      const { error: deleteError } = await supabase.from("private_trades").delete().eq("id", id);
      if (deleteError) {
        setError("Could not delete this journal entry: " + deleteError.message);
        setBusy(false);
        return;
      }
    } else {
      const { data: content, error: contentError } = await supabase.from("analysis_article_content").select("video_path").eq("article_id", id).maybeSingle();
      if (contentError) {
        setError("Could not load publication media: " + contentError.message);
        setBusy(false);
        return;
      }
      if (content?.video_path) {
        const { error: storageError } = await supabase.storage.from("research-videos").remove([content.video_path]);
        if (storageError) {
          setError("Could not remove the publication video: " + storageError.message);
          setBusy(false);
          return;
        }
      }
      const { error: deleteError } = await supabase.from("analysis_articles").delete().eq("id", id);
      if (deleteError) {
        setError("Could not delete this publication: " + deleteError.message);
        setBusy(false);
        return;
      }
    }

    router.refresh();
  }

  return <div className="flex flex-col items-end gap-1">
    <button type="button" onClick={removeRecord} disabled={busy} className="rounded-lg border border-rose-400/30 px-3 py-2 text-xs font-semibold text-rose-300 transition hover:bg-rose-400/10 disabled:opacity-50">
      {busy ? "Deleting…" : "Delete"}
    </button>
    {error && <p role="alert" className="max-w-xs text-right text-xs text-rose-300">{error}</p>}
  </div>;
}
