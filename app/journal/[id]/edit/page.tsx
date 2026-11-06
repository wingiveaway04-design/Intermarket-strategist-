import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import JournalTradeEditor from "@/components/journal-trade-editor";

export default async function EditJournalTradePage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: trade, error } = await supabase
    .from("private_trades")
    .select("id,instrument,status,realized_r,news_trade_attribution,news_event_type,news_event_name,news_event_at")
    .eq("id", params.id)
    .single();

  if (error || !trade) notFound();

  return <JournalTradeEditor trade={trade} />;
}
