import { createClient } from "npm:@supabase/supabase-js@2";

type NotificationWebhook = {
  type: "INSERT";
  table: "notifications";
  schema: "public";
  record: {
    id: string;
    user_id: string;
    title: string;
    body: string;
    href: string;
  };
};

function getServiceKey(): string | null {
  const direct = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (direct) return direct;
  const secretKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (!secretKeys) return null;
  try {
    const parsed = JSON.parse(secretKeys) as Record<string, string>;
    return parsed.default ?? Object.values(parsed)[0] ?? null;
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const expoAccessToken = Deno.env.get("EXPO_ACCESS_TOKEN");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = getServiceKey();

  if (!expoAccessToken || !supabaseUrl || !serviceKey) {
    console.error("Push delivery is not configured: required server secrets are missing.");
    return Response.json({ error: "Push delivery is not configured" }, { status: 503 });
  }

  let payload: NotificationWebhook;
  try {
    payload = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  if (
    payload.type !== "INSERT" ||
    payload.schema !== "public" ||
    payload.table !== "notifications" ||
    !payload.record?.id ||
    !payload.record?.user_id
  ) {
    return Response.json({ error: "Unsupported database event" }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: devices, error: tokenError } = await supabase
    .from("user_push_tokens")
    .select("expo_push_token")
    .eq("user_id", payload.record.user_id);

  if (tokenError) {
    console.error("Could not load push tokens:", tokenError.message);
    return Response.json({ error: "Could not load recipient devices" }, { status: 500 });
  }

  if (!devices?.length) {
    return Response.json({ sent: 0, reason: "No registered devices" });
  }

  const messages = devices.map(({ expo_push_token }) => ({
    to: expo_push_token,
    title: payload.record.title,
    body: payload.record.body,
    sound: "default",
    priority: "high",
    channelId: "market-updates",
    data: {
      notificationId: payload.record.id,
      href: payload.record.href
    }
  }));

  const invalidTokens: string[] = [];
  let sent = 0;

  for (let offset = 0; offset < messages.length; offset += 100) {
    const batch = messages.slice(offset, offset + 100);
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${expoAccessToken}`
      },
      body: JSON.stringify(batch)
    });

    const result = await response.json();
    if (!response.ok) {
      console.error("Expo push request failed:", response.status, JSON.stringify(result));
      return Response.json({ error: "Expo push delivery failed" }, { status: 502 });
    }

    const tickets = Array.isArray(result?.data) ? result.data : [];
    tickets.forEach((ticket: { status?: string; details?: { error?: string } }, index: number) => {
      if (ticket.status === "ok") sent += 1;
      if (ticket.details?.error === "DeviceNotRegistered") {
        invalidTokens.push(batch[index].to);
      }
    });
  }

  if (invalidTokens.length) {
    const { error } = await supabase
      .from("user_push_tokens")
      .delete()
      .in("expo_push_token", invalidTokens);
    if (error) console.error("Could not remove expired push tokens:", error.message);
  }

  return Response.json({ sent, removedExpiredTokens: invalidTokens.length });
});
