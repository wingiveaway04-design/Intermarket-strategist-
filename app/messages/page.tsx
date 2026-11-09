import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PremiumDirectMessages from "@/components/premium-direct-messages";

export default async function PrivateMessagesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("id,role,username,display_name").eq("id", user.id).single();
  const isAdmin = profile?.role === "admin";
  const { data: premium } = await supabase.rpc("has_premium_access", { check_user_id: user.id });
  if (!premium && !isAdmin) redirect("/pricing");

  const [{ data: conversations }, { data: profiles }] = await Promise.all([
    supabase.from("premium_direct_conversations").select("id,member_id,admin_id,created_at").order("updated_at", { ascending: false }),
    supabase.from("profiles").select("id,username,display_name,role").order("username"),
  ]);

  const premiumMembers = isAdmin
    ? (await Promise.all((profiles || []).filter((member) => member.role !== "admin").map(async (member) => {
        const { data } = await supabase.rpc("has_premium_access", { check_user_id: member.id });
        return data ? member : null;
      }))).filter((member): member is NonNullable<typeof member> => Boolean(member))
    : [];

  return <main className="min-h-screen bg-[#081321]">
    <PremiumDirectMessages
      userId={user.id}
      isAdmin={isAdmin}
      members={premiumMembers.map((member) => ({ id: member.id, username: member.username, display_name: member.display_name, role: member.role }))}
      initialConversations={conversations || []}
      initiallyOpen
    />
  </main>;
}
