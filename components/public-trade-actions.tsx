"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = { tradeId: string; instrument: string; imagePaths: string[] };

export default function PublicTradeActions({ tradeId, instrument, imagePaths }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);

  function startPress() {
    longPressed.current = false;
    timer.current = setTimeout(() => {
      longPressed.current = true;
      setOpen(true);
    }, 550);
  }
  function cancelPress() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }
  function handleContextMenu(event: React.MouseEvent) {
    event.preventDefault();
    setOpen(true);
  }

  async function removeTrade() {
    if (!window.confirm(`Delete the public trade idea for ${instrument}? This permanently removes the publication and its linked chart records.`)) return;
    setBusy(true);
    setMessage("");
    const supabase = createClient();
    if (imagePaths.length) {
      const { error: storageError } = await supabase.storage.from("public-trade-images").remove(imagePaths);
      if (storageError) {
        setMessage("Could not remove chart files: " + storageError.message);
        setBusy(false);
        return;
      }
    }
    const { error } = await supabase.from("public_trades").delete().eq("id", tradeId);
    if (error) {
      setMessage("Could not delete this trade idea: " + error.message);
      setBusy(false);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <div className="relative flex items-center gap-2" onTouchStart={startPress} onTouchEnd={cancelPress} onTouchMove={cancelPress} onContextMenu={handleContextMenu}>
      <span className="hidden text-[10px] text-slate-600 md:inline">Right-click / long-press for actions</span>
      <button type="button" aria-label={`Actions for ${instrument}`} onClick={() => { if (!longPressed.current) setOpen((value) => !value); }} className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-slate-300 hover:border-blue-300/40 hover:bg-white/5">
        •••
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-30 mt-2 min-w-44 rounded-xl border border-white/15 bg-[#111d30] p-1.5 shadow-2xl shadow-black/50">
          <Link role="menuitem" href={`/admin/trades/${tradeId}/edit`} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm text-slate-200 hover:bg-blue-400/10 hover:text-blue-200">
            Edit trade idea
          </Link>
          <button role="menuitem" type="button" disabled={busy} onClick={removeTrade} className="block w-full rounded-lg px-3 py-2.5 text-left text-sm text-rose-300 hover:bg-rose-400/10 disabled:opacity-50">
            {busy ? "Deleting…" : "Delete trade idea"}
          </button>
          <button type="button" onClick={() => setOpen(false)} className="block w-full rounded-lg px-3 py-2 text-left text-xs text-slate-500 hover:bg-white/5">Cancel</button>
          {message && <p role="alert" className="max-w-64 px-3 py-2 text-xs text-rose-300">{message}</p>}
        </div>
      )}
    </div>
  );
}
