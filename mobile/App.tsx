import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import type { Session } from "@supabase/supabase-js";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { supabase } from "./lib/supabase";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true
  })
});

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  href: string;
  read_at: string | null;
  created_at: string;
};

type Profile = { username: string; display_name: string | null; role: "user" | "admin" };
type WorkspaceTab = "home" | "research" | "ideas" | "journal" | "community" | "messages" | "notifications";
type ResearchItem = { id: string; title: string; excerpt: string | null; category: string; published_at: string | null; is_premium_only: boolean };
type TradeIdea = { id: string; instrument: string; market: string; direction: string; status: string; entry_price: number | null; stop_loss: number | null; thesis: string | null; published_at: string | null };
type JournalTrade = { id: string; instrument: string; market: string; direction: string; status: string; entry_price: number | null; stop_loss: number | null; thesis: string | null; opened_at: string | null; closed_at: string | null; realized_r: number | null; created_at: string };

const webModules = [
  { number: "01", title: "Research Desk", detail: "Fundamental and intermarket analysis", screen: "research" as const },
  { number: "02", title: "Trade Ideas", detail: "Published calls and status updates", screen: "ideas" as const },
  { number: "03", title: "Trading Journal", detail: "Your private records and performance", screen: "journal" as const },
  { number: "04", title: "Premium Lounge", detail: "Member discussions and shared ideas", screen: "community" as const },
  { number: "05", title: "Private Messages", detail: "Direct conversations with the analyst", screen: "messages" as const },
  { number: "06", title: "Video Sessions", detail: "Live sessions and recordings" }
];

function formatDate(value: string) {
  return new Date(value).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [booting, setBooting] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tab, setTab] = useState<WorkspaceTab>("home");
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [researchItems, setResearchItems] = useState<ResearchItem[]>([]);
  const [tradeIdeas, setTradeIdeas] = useState<TradeIdea[]>([]);
  const [journalTrades, setJournalTrades] = useState<JournalTrade[]>([]);
  const [moduleLoading, setModuleLoading] = useState(false);
  const [moduleError, setModuleError] = useState<string | null>(null);

  const loadNotifications = useCallback(async (userId: string) => {
    if (!supabase) return;
    setLoadingNotifications(true);
    const { data, error } = await supabase
      .from("notifications")
      .select("id,title,body,href,read_at,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(60);
    if (error) {
      Alert.alert("Notifications unavailable", error.message);
    } else {
      setNotifications((data ?? []) as NotificationItem[]);
    }
    setLoadingNotifications(false);
  }, []);

  const loadProfile = useCallback(async (userId: string) => {
    if (!supabase) return;
    const { data } = await supabase
      .from("profiles")
      .select("username,display_name,role")
      .eq("id", userId)
      .maybeSingle();
    setProfile(data as Profile | null);
  }, []);

  useEffect(() => {
    if (!supabase) {
      setBooting(false);
      return;
    }
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setBooting(false);
      if (data.session?.user.id) {
        void loadProfile(data.session.user.id);
        void loadNotifications(data.session.user.id);
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      if (nextSession?.user.id) {
        void loadProfile(nextSession.user.id);
        void loadNotifications(nextSession.user.id);
      } else {
        setProfile(null);
        setNotifications([]);
        setTab("home");
      }
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [loadNotifications, loadProfile]);

  useEffect(() => {
    if (!supabase || !session?.user.id) return;
    const channel = supabase
      .channel(`mobile-notifications-${session.user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${session.user.id}` },
        (payload) => setNotifications((current) => [payload.new as NotificationItem, ...current].slice(0, 60))
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [session?.user.id]);

  useEffect(() => {
    if (!supabase || !session?.user.id || tab === "home" || tab === "notifications") return;
    let active = true;
    const loadModule = async () => {
      setModuleLoading(true);
      setModuleError(null);
      try {
        if (tab === "research") {
          const { data, error } = await supabase
            .from("analysis_articles")
            .select("id,title,excerpt,category,published_at,is_premium_only")
            .eq("content_state", "published")
            .order("published_at", { ascending: false })
            .limit(40);
          if (error) throw error;
          if (active) setResearchItems((data ?? []) as ResearchItem[]);
        } else if (tab === "ideas") {
          const { data, error } = await supabase
            .from("public_trades")
            .select("id,instrument,market,direction,status,entry_price,stop_loss,thesis,published_at")
            .eq("content_state", "published")
            .order("published_at", { ascending: false })
            .limit(40);
          if (error) throw error;
          if (active) setTradeIdeas((data ?? []) as TradeIdea[]);
        } else if (tab === "journal") {
          const { data, error } = await supabase
            .from("private_trades")
            .select("id,instrument,market,direction,status,entry_price,stop_loss,thesis,opened_at,closed_at,realized_r,created_at")
            .eq("owner_id", session.user.id)
            .order("created_at", { ascending: false })
            .limit(100);
          if (error) throw error;
          if (active) setJournalTrades((data ?? []) as JournalTrade[]);
        }
      } catch (error) {
        if (active) setModuleError(error instanceof Error ? error.message : "This workspace could not be loaded.");
      } finally {
        if (active) setModuleLoading(false);
      }
    };
    void loadModule();
    return () => { active = false; };
  }, [tab, session?.user.id]);

  const unreadCount = useMemo(() => notifications.filter((item) => !item.read_at).length, [notifications]);

  useEffect(() => {
    if (!session?.user.id) return;
    const responseListener = Notifications.addNotificationResponseReceivedListener(() => {
      setTab("notifications");
      void loadNotifications(session.user.id);
    });
    return () => responseListener.remove();
  }, [session?.user.id, loadNotifications]);

  const enablePushNotifications = async () => {
    if (!supabase || !session?.user.id) return;
    if (Platform.OS !== "android" && Platform.OS !== "ios") {
      Alert.alert("Mobile device required", "Push notifications are available in the Android and iOS app.");
      return;
    }
    if (!Device.isDevice) {
      Alert.alert("Physical device required", "Push notifications need a real Android or iPhone device.");
      return;
    }
    const projectId = Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId ?? process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
    if (!projectId) {
      Alert.alert("Push setup in progress", "The Expo application project must be linked before this device can register for push alerts. Your in-app notification inbox is already connected.");
      return;
    }
    setPushBusy(true);
    try {
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("market-updates", {
          name: "Market updates",
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 180, 250],
          sound: "default",
          lightColor: "#67DDF3"
        });
      }
      const current = await Notifications.getPermissionsAsync();
      const permission = current.status === "granted" ? current : await Notifications.requestPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert("Notifications not enabled", "You can enable notifications later in your phone's app settings.");
        return;
      }
      const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      const { error } = await supabase.from("user_push_tokens").upsert({
        user_id: session.user.id,
        expo_push_token: token,
        platform: Platform.OS,
        device_id: Device.modelId ?? null,
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: "expo_push_token" });
      if (error) throw error;
      Alert.alert("Push alerts enabled", "This device is registered for Intermarket Strategist notifications. Sound and vibration still follow your phone settings.");
    } catch (error) {
      Alert.alert("Could not enable push alerts", error instanceof Error ? error.message : "Please try again later.");
    } finally {
      setPushBusy(false);
    }
  };

  const confirmSignOut = () => {
    Alert.alert("Sign out", "Sign out of this Intermarket Strategist account on this device?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => {
        void (async () => {
          if (supabase && session) {
            const projectId = Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;
            if (projectId) {
              try {
                const permission = await Notifications.getPermissionsAsync();
                if (permission.status === "granted") {
                  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
                  await supabase.from("user_push_tokens").delete().eq("user_id", session.user.id).eq("expo_push_token", token);
                }
              } catch {
                // A failed token cleanup must not prevent a normal sign-out.
              }
            }
            await supabase.auth.signOut();
          }
        })();
      } }
    ]);
  };

  const markRead = async (item: NotificationItem) => {
    if (!supabase || item.read_at) return;
    const readAt = new Date().toISOString();
    const { error } = await supabase.from("notifications").update({ read_at: readAt }).eq("id", item.id);
    if (error) {
      Alert.alert("Could not update notification", error.message);
      return;
    }
    setNotifications((current) => current.map((row) => row.id === item.id ? { ...row, read_at: readAt } : row));
  };

  if (booting) {
    return <SafeAreaView style={styles.safe}><StatusBar barStyle="light-content" /><View style={styles.center}><ActivityIndicator color="#75DDF1" /><Text style={styles.muted}>Preparing your secure workspace…</Text></View></SafeAreaView>;
  }

  if (!supabase) {
    return <SafeAreaView style={styles.safe}><StatusBar barStyle="light-content" /><View style={styles.center}><Brand /><Text style={styles.title}>Connect your account</Text><Text style={styles.body}>The mobile build needs its Supabase project URL and public anon key in the app environment before sign-in can be enabled.</Text></View></SafeAreaView>;
  }

  if (!session) {
    return <AuthScreen />;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#07111F" />
      <View style={styles.topbar}>
        <Brand />
        <Pressable style={styles.bellButton} onPress={() => { setTab("notifications"); void loadNotifications(session.user.id); }} accessibilityRole="button" accessibilityLabel={`Notifications, ${unreadCount} unread`}>
          <Text style={styles.bellIcon}>🔔</Text>
          {unreadCount > 0 && <View style={styles.unreadBadge}><Text style={styles.unreadBadgeText}>{unreadCount > 99 ? "99+" : unreadCount}</Text></View>}
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {tab === "home" ? (
          <>
            <View style={styles.hero}>
              <Text style={styles.eyebrow}>MARKET INTELLIGENCE · ON THE MOVE</Text>
              <Text style={styles.title}>Welcome back{profile?.display_name ? `, ${profile.display_name.split(" ")[0]}` : ""}.</Text>
              <Text style={styles.body}>Your research, trade ideas and trading workspace — connected in one secure mobile experience.</Text>
              <View style={styles.sessionPill}><View style={styles.onlineDot} /><Text style={styles.sessionText}>Signed in as @{profile?.username ?? session.user.email}</Text></View>
            </View>
            <SectionTitle title="YOUR WORKSPACE" meta="MEMBER ACCESS" />
            <View style={styles.moduleList}>
              {webModules.map((item) => (
                <Pressable key={item.number} style={styles.moduleCard} onPress={() => {
                  if (item.screen) setTab(item.screen);
                  else Alert.alert(item.title, "This native workspace is scheduled for the next development stage.");
                }}>
                  <Text style={styles.moduleNumber}>{item.number}</Text>
                  <View style={styles.moduleCopy}><Text style={styles.moduleTitle}>{item.title}</Text><Text style={styles.moduleDetail}>{item.detail}</Text></View>
                  <Text style={styles.moduleArrow}>›</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>Your account is connected</Text>
              <Text style={styles.infoBody}>This app uses the same Intermarket Strategist account and secure backend as the website. More native workspaces are being added in stages.</Text>
              <Pressable style={[styles.pushButton, pushBusy && styles.buttonDisabled]} onPress={() => void enablePushNotifications()} disabled={pushBusy}>
                {pushBusy ? <ActivityIndicator color="#B7F1FB" /> : <Text style={styles.pushButtonText}>Enable device notifications</Text>}
              </Pressable>
            </View>
          </>
        ) : tab === "notifications" ? (
          <>
            <Pressable onPress={() => setTab("home")}><Text style={styles.backLink}>‹  Workspace</Text></Pressable>
            <Text style={styles.pageTitle}>Notifications</Text>
            <Text style={styles.pageSubtitle}>{unreadCount} unread {unreadCount === 1 ? "update" : "updates"}</Text>
            {loadingNotifications && <ActivityIndicator color="#75DDF1" style={{ marginTop: 22 }} />}
            {!loadingNotifications && notifications.length === 0 && <View style={styles.emptyCard}><Text style={styles.emptyTitle}>You're all caught up</Text><Text style={styles.moduleDetail}>New research, trade publications and relevant member activity will appear here.</Text></View>}
            <View style={styles.notificationList}>
              {notifications.map((item) => (
                <Pressable key={item.id} style={[styles.notificationCard, !item.read_at && styles.notificationUnread]} onPress={() => void markRead(item)}>
                  <View style={styles.notificationTop}><Text style={styles.notificationTitle}>{item.title}</Text>{!item.read_at && <View style={styles.notificationDot} />}</View>
                  <Text style={styles.notificationBody}>{item.body}</Text>
                  <Text style={styles.notificationDate}>{formatDate(item.created_at)}</Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : tab === "community" ? (
          <CommunityScreen userId={session.user.id} onBack={() => setTab("home")} />
        ) : tab === "messages" ? (
          <DirectMessagesScreen userId={session.user.id} isAdmin={profile?.role === "admin"} onBack={() => setTab("home")} />
        ) : (
          <>
            <Pressable onPress={() => setTab("home")}><Text style={styles.backLink}>‹  Workspace</Text></Pressable>
            <Text style={styles.pageTitle}>{tab === "research" ? "Research Desk" : tab === "ideas" ? "Trade Ideas" : "Trading Journal"}</Text>
            <Text style={styles.pageSubtitle}>{tab === "research" ? "Published fundamental and intermarket research" : tab === "ideas" ? "Official published trade setups" : "Private records visible only to your account"}</Text>
            {moduleLoading && <ActivityIndicator color="#75DDF1" style={{ marginTop: 22 }} />}
            {moduleError && <View style={styles.emptyCard}><Text style={styles.emptyTitle}>Workspace unavailable</Text><Text style={styles.moduleDetail}>{moduleError}</Text></View>}
            {!moduleLoading && !moduleError && tab === "research" && researchItems.length === 0 && <EmptyState title="No published research yet" detail="New analyst research will appear here when it is published." />}
            {!moduleLoading && !moduleError && tab === "ideas" && tradeIdeas.length === 0 && <EmptyState title="No published trade ideas yet" detail="Official trade ideas will appear here when they are published." />}
            {!moduleLoading && !moduleError && tab === "journal" && journalTrades.length === 0 && <EmptyState title="Your journal is ready" detail="Your private trade records will appear here. They are not visible to other members." />}
            {tab === "research" && researchItems.map((item) => (
              <View key={item.id} style={styles.dataCard}>
                <Text style={styles.dataEyebrow}>{item.category.replaceAll("_", " ").toUpperCase()}{item.is_premium_only ? "  ·  PREMIUM" : ""}</Text>
                <Text style={styles.dataTitle}>{item.title}</Text>
                {!!item.excerpt && <Text style={styles.dataBody}>{item.excerpt}</Text>}
                {!!item.published_at && <Text style={styles.notificationDate}>{formatDate(item.published_at)}</Text>}
              </View>
            ))}
            {tab === "ideas" && tradeIdeas.map((item) => (
              <View key={item.id} style={styles.dataCard}>
                <View style={styles.notificationTop}><Text style={styles.dataTitle}>{item.instrument}</Text><Text style={styles.statusPill}>{item.status.replaceAll("_", " ").toUpperCase()}</Text></View>
                <Text style={styles.dataEyebrow}>{item.market.toUpperCase()}  ·  {item.direction.toUpperCase()}</Text>
                <Text style={styles.dataBody}>Entry: {item.entry_price ?? "—"}  ·  Stop: {item.stop_loss ?? "—"}</Text>
                {!!item.thesis && <Text style={styles.dataBody}>{item.thesis}</Text>}
                {!!item.published_at && <Text style={styles.notificationDate}>{formatDate(item.published_at)}</Text>}
              </View>
            ))}
            {tab === "journal" && journalTrades.map((item) => (
              <View key={item.id} style={styles.dataCard}>
                <View style={styles.notificationTop}><Text style={styles.dataTitle}>{item.instrument}</Text><Text style={styles.statusPill}>{item.status.replaceAll("_", " ").toUpperCase()}</Text></View>
                <Text style={styles.dataEyebrow}>{item.market.toUpperCase()}  ·  {item.direction.toUpperCase()}</Text>
                <Text style={styles.dataBody}>Entry: {item.entry_price ?? "—"}  ·  Stop: {item.stop_loss ?? "—"}</Text>
                <Text style={styles.dataBody}>Realized R: {item.realized_r ?? "Not closed"}</Text>
                {!!item.thesis && <Text style={styles.dataBody}>{item.thesis}</Text>}
                <Text style={styles.notificationDate}>Recorded {formatDate(item.created_at)}</Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>
      <View style={styles.bottomNav}>
        <Pressable style={styles.navItem} onPress={() => setTab("home")}><Text style={[styles.navText, tab === "home" && styles.navActive]}>Workspace</Text></Pressable>
        <Pressable style={styles.navItem} onPress={() => { setTab("notifications"); void loadNotifications(session.user.id); }}><Text style={[styles.navText, tab === "notifications" && styles.navActive]}>Alerts{unreadCount > 0 ? ` · ${unreadCount}` : ""}</Text></Pressable>
        <Pressable style={styles.navItem} onPress={confirmSignOut}><Text style={styles.navText}>Account</Text></Pressable>
      </View>
    </SafeAreaView>
  );
}


type CommunityMessage = {
  id: string; user_id: string; body: string; message_type: string;
  created_at: string; is_pinned: boolean; edited_at: string | null;
};
type DirectConversation = {
  id: string; admin_id: string; member_id: string; updated_at: string;
  otherName: string; lastMessage: string; lastAt: string;
};
type DirectMessage = {
  id: string; conversation_id: string; sender_id: string; body: string;
  message_type: string; created_at: string; read_at: string | null;
};

function CommunityScreen({ userId, onBack }: { userId: string; onBack: () => void }) {
  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [authors, setAuthors] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    setError(null);
    const { data, error: queryError } = await supabase
      .from("premium_chat_messages")
      .select("id,user_id,body,message_type,created_at,is_pinned,edited_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (queryError) {
      setError(queryError.message);
      setMessages([]);
      setLoading(false);
      return;
    }
    const rows = (data ?? []).reverse() as CommunityMessage[];
    setMessages(rows);
    const ids = [...new Set(rows.map((row) => row.user_id))];
    if (ids.length) {
      const { data: people } = await supabase.from("profiles").select("id,username,display_name").in("id", ids);
      const names: Record<string, string> = {};
      (people ?? []).forEach((person: { id: string; username: string; display_name: string | null }) => {
        names[person.id] = person.display_name || person.username;
      });
      setAuthors(names);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    if (!supabase) return;
    const channel = supabase.channel("mobile-premium-lounge")
      .on("postgres_changes", { event: "*", schema: "public", table: "premium_chat_messages" }, () => { void load(); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [load]);

  const send = async () => {
    const body = draft.trim();
    if (!supabase || !body || sending) return;
    setSending(true);
    const { error: insertError } = await supabase.from("premium_chat_messages").insert({
      user_id: userId, body, message_type: "text"
    });
    if (insertError) {
      Alert.alert("Message not sent", insertError.message);
    } else {
      setDraft("");
      await load();
    }
    setSending(false);
  };

  return (
    <View>
      <Pressable onPress={onBack}><Text style={styles.backLink}>‹  Workspace</Text></Pressable>
      <View style={styles.screenHeadingRow}>
        <View style={{ flex: 1 }}><Text style={styles.pageTitle}>Premium Lounge</Text><Text style={styles.pageSubtitle}>Shared member discussion · latest 100 messages</Text></View>
        <Pressable style={styles.refreshButton} onPress={() => void load()}><Text style={styles.refreshText}>Refresh</Text></Pressable>
      </View>
      {loading && <ActivityIndicator color="#75DDF1" style={{ marginTop: 18 }} />}
      {error && <View style={styles.emptyCard}><Text style={styles.emptyTitle}>Lounge unavailable</Text><Text style={styles.moduleDetail}>{error}</Text></View>}
      {!loading && !error && messages.length === 0 && <EmptyState title="The lounge is quiet" detail="New messages from eligible members will appear here." />}
      <View style={styles.chatList}>
        {messages.map((item) => (
          <View key={item.id} style={[styles.chatBubble, item.user_id === userId && styles.chatBubbleMine]}>
            <View style={styles.notificationTop}>
              <Text style={styles.chatAuthor}>{item.user_id === userId ? "You" : authors[item.user_id] || "Member"}</Text>
              {item.is_pinned && <Text style={styles.pinnedLabel}>PINNED</Text>}
            </View>
            <Text style={styles.chatBody}>{item.body || (item.message_type === "text" ? "" : "Shared " + item.message_type)}</Text>
            <Text style={styles.notificationDate}>{formatDate(item.created_at)}{item.edited_at ? " · edited" : ""}</Text>
          </View>
        ))}
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.composer}>
          <TextInput value={draft} onChangeText={setDraft} placeholder="Write to the lounge…" placeholderTextColor="#61788F" multiline style={styles.composerInput} />
          <Pressable style={[styles.sendButton, (!draft.trim() || sending) && styles.buttonDisabled]} onPress={() => void send()} disabled={!draft.trim() || sending}>
            {sending ? <ActivityIndicator color="#071522" /> : <Text style={styles.sendButtonText}>Send</Text>}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function DirectMessagesScreen({ userId, isAdmin, onBack }: { userId: string; isAdmin: boolean; onBack: () => void }) {
  const [conversations, setConversations] = useState<DirectConversation[]>([]);
  const [selected, setSelected] = useState<DirectConversation | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadConversations = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    setError(null);
    const { data, error: queryError } = await supabase
      .from("premium_direct_conversations")
      .select("id,admin_id,member_id,updated_at")
      .order("updated_at", { ascending: false });
    if (queryError) {
      setError(queryError.message);
      setLoading(false);
      return;
    }
    const rows = data ?? [];
    const otherIds = [...new Set(rows.map((row: { admin_id: string; member_id: string }) => isAdmin ? row.member_id : row.admin_id))];
    const { data: people } = otherIds.length
      ? await supabase.from("profiles").select("id,username,display_name").in("id", otherIds)
      : { data: [] as { id: string; username: string; display_name: string | null }[] };
    const peopleById: Record<string, string> = {};
    (people ?? []).forEach((person: { id: string; username: string; display_name: string | null }) => {
      peopleById[person.id] = person.display_name || person.username;
    });
    const conversationIds = rows.map((row: { id: string }) => row.id);
    const { data: recentMessages } = conversationIds.length
      ? await supabase.from("premium_direct_messages")
          .select("id,conversation_id,sender_id,body,message_type,created_at,read_at")
          .in("conversation_id", conversationIds)
          .order("created_at", { ascending: false })
          .limit(300)
      : { data: [] as DirectMessage[] };
    const latest: Record<string, DirectMessage> = {};
    (recentMessages ?? []).forEach((message: DirectMessage) => {
      if (!latest[message.conversation_id]) latest[message.conversation_id] = message;
    });
    const mapped = rows.map((row: { id: string; admin_id: string; member_id: string; updated_at: string }) => ({
      ...row,
      otherName: peopleById[isAdmin ? row.member_id : row.admin_id] || (isAdmin ? "Member" : "Analyst"),
      lastMessage: latest[row.id]?.body || (latest[row.id] ? "Shared " + latest[row.id].message_type : "No messages yet"),
      lastAt: latest[row.id]?.created_at || row.updated_at
    }));
    mapped.sort((a, b) => Date.parse(b.lastAt) - Date.parse(a.lastAt));
    setConversations(mapped);
    if (selected) {
      const refreshed = mapped.find((item) => item.id === selected.id);
      if (refreshed) setSelected(refreshed);
    }
    setLoading(false);
  }, [isAdmin, selected?.id]);

  const loadMessages = useCallback(async (conversationId: string) => {
    if (!supabase) return;
    const { data, error: queryError } = await supabase
      .from("premium_direct_messages")
      .select("id,conversation_id,sender_id,body,message_type,created_at,read_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(150);
    if (queryError) {
      setError(queryError.message);
      return;
    }
    setMessages(((data ?? []) as DirectMessage[]).reverse());
  }, []);

  useEffect(() => { void loadConversations(); }, [loadConversations]);

  useEffect(() => {
    if (!selected || !supabase) return;
    void loadMessages(selected.id);
    const channel = supabase.channel("mobile-dm-" + selected.id)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "premium_direct_messages", filter: "conversation_id=eq." + selected.id }, (payload) => {
        const next = payload.new as DirectMessage;
        setMessages((current) => current.some((item) => item.id === next.id) ? current : [...current, next]);
        void loadConversations();
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [selected?.id, loadMessages, loadConversations]);

  const send = async () => {
    const body = draft.trim();
    if (!supabase || !selected || !body || sending) return;
    setSending(true);
    const { error: insertError } = await supabase.from("premium_direct_messages").insert({
      conversation_id: selected.id, sender_id: userId, body, message_type: "text"
    });
    if (insertError) {
      Alert.alert("Message not sent", insertError.message);
    } else {
      setDraft("");
      await loadMessages(selected.id);
      await loadConversations();
    }
    setSending(false);
  };

  if (selected) {
    return (
      <View>
        <Pressable onPress={() => { setSelected(null); setMessages([]); void loadConversations(); }}><Text style={styles.backLink}>‹  All conversations</Text></Pressable>
        <Text style={styles.pageTitle}>{selected.otherName}</Text>
        <Text style={styles.pageSubtitle}>Private conversation · visible only to its participants</Text>
        <View style={styles.chatList}>
          {messages.map((item) => (
            <View key={item.id} style={[styles.chatBubble, item.sender_id === userId && styles.chatBubbleMine]}>
              <Text style={styles.chatBody}>{item.body || "Shared " + item.message_type}</Text>
              <Text style={styles.notificationDate}>{formatDate(item.created_at)}{item.sender_id === userId ? " · You" : ""}</Text>
            </View>
          ))}
        </View>
        <View style={styles.composer}>
          <TextInput value={draft} onChangeText={setDraft} placeholder="Write a private message…" placeholderTextColor="#61788F" multiline style={styles.composerInput} />
          <Pressable style={[styles.sendButton, (!draft.trim() || sending) && styles.buttonDisabled]} onPress={() => void send()} disabled={!draft.trim() || sending}>
            {sending ? <ActivityIndicator color="#071522" /> : <Text style={styles.sendButtonText}>Send</Text>}
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View>
      <Pressable onPress={onBack}><Text style={styles.backLink}>‹  Workspace</Text></Pressable>
      <View style={styles.screenHeadingRow}>
        <View style={{ flex: 1 }}><Text style={styles.pageTitle}>Private Messages</Text><Text style={styles.pageSubtitle}>Direct conversations with the analyst</Text></View>
        <Pressable style={styles.refreshButton} onPress={() => void loadConversations()}><Text style={styles.refreshText}>Refresh</Text></Pressable>
      </View>
      {loading && <ActivityIndicator color="#75DDF1" style={{ marginTop: 18 }} />}
      {error && <View style={styles.emptyCard}><Text style={styles.emptyTitle}>Messages unavailable</Text><Text style={styles.moduleDetail}>{error}</Text></View>}
      {!loading && !error && conversations.length === 0 && <EmptyState title="No conversations yet" detail={isAdmin ? "Member conversations created from the website will appear here." : "Your private conversation will appear here once it has been opened for your account."} />}
      <View style={styles.moduleList}>
        {conversations.map((item) => (
          <Pressable key={item.id} style={styles.conversationCard} onPress={() => { setSelected(item); setError(null); }}>
            <View style={styles.conversationAvatar}><Text style={styles.conversationAvatarText}>{item.otherName.slice(0,1).toUpperCase()}</Text></View>
            <View style={styles.moduleCopy}><Text style={styles.moduleTitle}>{item.otherName}</Text><Text style={styles.moduleDetail} numberOfLines={1}>{item.lastMessage}</Text><Text style={styles.notificationDate}>{formatDate(item.lastAt)}</Text></View>
            <Text style={styles.moduleArrow}>›</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function AuthScreen() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!supabase) return;
    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim().toLowerCase();
    if (!cleanEmail || !password) {
      Alert.alert("Missing details", "Enter your email address and password.");
      return;
    }
    if (mode === "signup" && (cleanUsername.length < 3 || cleanUsername.length > 30)) {
      Alert.alert("Username required", "Choose a username between 3 and 30 characters.");
      return;
    }
    setBusy(true);
    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
      if (error) Alert.alert("Sign in failed", error.message);
    } else {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: { data: { username: cleanUsername, display_name: displayName.trim() || cleanUsername } }
      });
      if (error) {
        Alert.alert("Account creation failed", error.message);
      } else if (!data.session) {
        Alert.alert("Check your email", "Your account request was received. Confirm your email address, then return here to sign in.");
        setMode("signin");
      }
    }
    setBusy(false);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#07111F" />
      <KeyboardAvoidingView style={styles.authKeyboard} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.authContent} keyboardShouldPersistTaps="handled">
          <Brand />
          <View style={styles.authHero}>
            <Text style={styles.eyebrow}>YOUR MARKET INTELLIGENCE TERMINAL</Text>
            <Text style={styles.title}>{mode === "signin" ? "Welcome back." : "Create your account."}</Text>
            <Text style={styles.body}>{mode === "signin" ? "Sign in with the same account you use on Intermarket Strategist." : "Use your existing member details or create a new website account."}</Text>
          </View>
          <View style={styles.authCard}>
            <View style={styles.modeSwitch}>
              <Pressable onPress={() => setMode("signin")} style={[styles.modeButton, mode === "signin" && styles.modeSelected]}><Text style={[styles.modeText, mode === "signin" && styles.modeTextSelected]}>Sign in</Text></Pressable>
              <Pressable onPress={() => setMode("signup")} style={[styles.modeButton, mode === "signup" && styles.modeSelected]}><Text style={[styles.modeText, mode === "signup" && styles.modeTextSelected]}>Create account</Text></Pressable>
            </View>
            {mode === "signup" && <>
              <Field label="USERNAME" value={username} onChangeText={setUsername} placeholder="Choose a username" autoCapitalize="none" />
              <Field label="DISPLAY NAME" value={displayName} onChangeText={setDisplayName} placeholder="Your name" />
            </>}
            <Field label="EMAIL ADDRESS" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" />
            <Field label="PASSWORD" value={password} onChangeText={setPassword} placeholder="Enter your password" secureTextEntry />
            <Pressable style={[styles.primaryButton, busy && styles.buttonDisabled]} onPress={() => void submit()} disabled={busy}>
              {busy ? <ActivityIndicator color="#06111D" /> : <Text style={styles.primaryButtonText}>{mode === "signin" ? "Sign in securely" : "Create account"}</Text>}
            </Pressable>
            <Text style={styles.authFootnote}>Protected by the Intermarket Strategist account system.</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Brand() {
  return <View style={styles.brandRow}><View style={styles.logo}><Text style={styles.logoText}>AIS</Text></View><View><Text style={styles.brandTitle}>INTERMARKET STRATEGIST</Text><Text style={styles.brandSub}>MOBILE TERMINAL</Text></View></View>;
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return <View style={styles.emptyCard}><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.moduleDetail}>{detail}</Text></View>;
}

function SectionTitle({ title, meta }: { title: string; meta: string }) {
  return <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>{title}</Text><Text style={styles.sectionMeta}>{meta}</Text></View>;
}

function Field(props: React.ComponentProps<typeof TextInput> & { label: string }) {
  const { label, ...inputProps } = props;
  return <View style={styles.field}><Text style={styles.fieldLabel}>{label}</Text><TextInput {...inputProps} placeholderTextColor="#61788F" style={styles.input} /></View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#07111F" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28, gap: 14 },
  content: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 32 },
  topbar: { paddingHorizontal: 20, paddingVertical: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: "#172B40" },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 11 },
  logo: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, borderColor: "#27617A", backgroundColor: "#102A40", alignItems: "center", justifyContent: "center" },
  logoText: { color: "#8BE8F7", fontSize: 12, fontWeight: "900", letterSpacing: 1 },
  brandTitle: { color: "#EAF2FF", fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  brandSub: { color: "#7892A9", fontSize: 8, letterSpacing: 2, marginTop: 4 },
  bellButton: { width: 42, height: 42, borderRadius: 13, backgroundColor: "#102438", borderWidth: 1, borderColor: "#25435C", alignItems: "center", justifyContent: "center" },
  bellIcon: { color: "#8BE8F7", fontSize: 21 },
  unreadBadge: { position: "absolute", top: -5, right: -5, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, backgroundColor: "#E5A44D", alignItems: "center", justifyContent: "center" },
  unreadBadgeText: { color: "#111827", fontSize: 9, fontWeight: "900" },
  hero: { borderWidth: 1, borderColor: "#1C3A51", borderRadius: 22, padding: 19, backgroundColor: "#0B1B2D", marginBottom: 27 },
  eyebrow: { color: "#67DDF3", fontSize: 9, fontWeight: "800", letterSpacing: 1.4 },
  title: { color: "#F3F7FC", fontSize: 29, fontWeight: "800", letterSpacing: -0.8, marginTop: 13 },
  body: { color: "#A7B8CA", fontSize: 13, lineHeight: 21, marginTop: 9 },
  sessionPill: { flexDirection: "row", alignItems: "center", gap: 8, borderTopWidth: 1, borderTopColor: "#20364B", marginTop: 18, paddingTop: 14 },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#4ADE80" },
  sessionText: { color: "#91A9BF", fontSize: 10 },
  sectionHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  sectionTitle: { color: "#DDE9F5", fontSize: 10, fontWeight: "800", letterSpacing: 1.4 },
  sectionMeta: { color: "#6E849B", fontSize: 8, letterSpacing: 1 },
  moduleList: { gap: 9 },
  moduleCard: { flexDirection: "row", alignItems: "center", minHeight: 72, borderRadius: 15, borderWidth: 1, borderColor: "#1B344B", backgroundColor: "#0C1C2D", paddingHorizontal: 14, paddingVertical: 12 },
  moduleNumber: { color: "#5BCBE6", fontSize: 10, fontWeight: "800", width: 32 },
  moduleCopy: { flex: 1 },
  moduleTitle: { color: "#EDF4FB", fontSize: 13, fontWeight: "700" },
  moduleDetail: { color: "#8298AE", fontSize: 10, lineHeight: 15, marginTop: 4 },
  moduleArrow: { color: "#6E91A8", fontSize: 22, paddingLeft: 8 },
  infoCard: { marginTop: 18, padding: 16, borderRadius: 15, borderWidth: 1, borderColor: "#28556B", backgroundColor: "#0D2638" },
  infoTitle: { color: "#B7F1FB", fontSize: 12, fontWeight: "700" },
  infoBody: { color: "#9AB1C3", fontSize: 10, lineHeight: 17, marginTop: 6 },
  pushButton: { alignSelf: "flex-start", marginTop: 13, borderWidth: 1, borderColor: "#32647B", borderRadius: 9, paddingHorizontal: 12, paddingVertical: 9, minWidth: 160, alignItems: "center" },
  pushButtonText: { color: "#B7F1FB", fontSize: 10, fontWeight: "800" },
  bottomNav: { flexDirection: "row", justifyContent: "space-around", paddingTop: 13, paddingBottom: Platform.OS === "ios" ? 20 : 12, borderTopWidth: 1, borderTopColor: "#1A3045", backgroundColor: "#091625" },
  navItem: { paddingHorizontal: 12, paddingVertical: 5 },
  navText: { color: "#71879C", fontSize: 11, fontWeight: "600" },
  navActive: { color: "#8BE8F7" },
  backLink: { color: "#75DDF1", fontSize: 12, marginBottom: 20 },
  pageTitle: { color: "#F3F7FC", fontSize: 28, fontWeight: "800" },
  pageSubtitle: { color: "#91A9BF", fontSize: 11, marginTop: 6, marginBottom: 18 },
  notificationList: { gap: 9, marginTop: 16 },
  notificationCard: { padding: 15, borderRadius: 14, borderWidth: 1, borderColor: "#1B344B", backgroundColor: "#0C1C2D" },
  notificationUnread: { borderColor: "#32647B", backgroundColor: "#0D2436" },
  notificationTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  notificationTitle: { color: "#EAF2FF", fontSize: 12, fontWeight: "700", flex: 1 },
  notificationDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#67DDF3" },
  notificationBody: { color: "#9AAFC2", fontSize: 11, lineHeight: 17, marginTop: 7 },
  notificationDate: { color: "#647D94", fontSize: 9, marginTop: 10 },
  dataCard: { padding: 15, borderRadius: 14, borderWidth: 1, borderColor: "#1B344B", backgroundColor: "#0C1C2D", marginBottom: 9 },
  dataEyebrow: { color: "#68CDE4", fontSize: 8, fontWeight: "800", letterSpacing: 1.1 },
  dataTitle: { color: "#EAF2FF", fontSize: 14, fontWeight: "800", flex: 1, marginTop: 7 },
  dataBody: { color: "#9AAFC2", fontSize: 11, lineHeight: 17, marginTop: 7 },
  statusPill: { color: "#B7F1FB", fontSize: 8, fontWeight: "800", backgroundColor: "#17364A", paddingHorizontal: 8, paddingVertical: 5, borderRadius: 7, overflow: "hidden" },
  emptyCard: { padding: 18, borderRadius: 15, borderWidth: 1, borderColor: "#1B344B", backgroundColor: "#0C1C2D", marginTop: 12 },
  emptyTitle: { color: "#EAF2FF", fontSize: 14, fontWeight: "700", marginBottom: 6 },
  muted: { color: "#91A9BF", fontSize: 12 },
  authKeyboard: { flex: 1 },
  authContent: { flexGrow: 1, justifyContent: "center", padding: 22, paddingVertical: 36 },
  authHero: { marginTop: 48, marginBottom: 22 },
  authCard: { borderWidth: 1, borderColor: "#1C3A51", borderRadius: 20, padding: 17, backgroundColor: "#0B1B2D" },
  modeSwitch: { flexDirection: "row", padding: 4, borderRadius: 12, backgroundColor: "#071522", marginBottom: 20 },
  modeButton: { flex: 1, alignItems: "center", paddingVertical: 11, borderRadius: 9 },
  modeSelected: { backgroundColor: "#17364A" },
  modeText: { color: "#7892A9", fontSize: 11, fontWeight: "700" },
  modeTextSelected: { color: "#B7F1FB" },
  field: { marginBottom: 14 },
  fieldLabel: { color: "#91A9BF", fontSize: 9, fontWeight: "800", letterSpacing: 1, marginBottom: 7 },
  input: { minHeight: 48, borderWidth: 1, borderColor: "#29445B", borderRadius: 11, backgroundColor: "#081624", color: "#F3F7FC", paddingHorizontal: 13, fontSize: 13 },
  primaryButton: { minHeight: 49, borderRadius: 11, backgroundColor: "#8BE8F7", alignItems: "center", justifyContent: "center", marginTop: 7 },
  primaryButtonText: { color: "#071522", fontSize: 12, fontWeight: "900" },
  buttonDisabled: { opacity: 0.65 },
  authFootnote: { color: "#637C92", fontSize: 9, textAlign: "center", marginTop: 15 },
  screenHeadingRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  refreshButton: { borderWidth: 1, borderColor: "#2A526B", borderRadius: 9, paddingHorizontal: 11, paddingVertical: 8 },
  refreshText: { color: "#AEEBF7", fontSize: 10, fontWeight: "700" },
  chatList: { gap: 9, marginTop: 8, marginBottom: 14 },
  chatBubble: { alignSelf: "flex-start", maxWidth: "90%", padding: 12, borderRadius: 13, borderWidth: 1, borderColor: "#1D3A51", backgroundColor: "#0C1C2D" },
  chatBubbleMine: { alignSelf: "flex-end", borderColor: "#28556B", backgroundColor: "#102B3E" },
  chatAuthor: { color: "#8BE8F7", fontSize: 10, fontWeight: "800" },
  pinnedLabel: { color: "#E8B66A", fontSize: 8, fontWeight: "900" },
  chatBody: { color: "#E2ECF6", fontSize: 12, lineHeight: 18, marginTop: 5 },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: 8, borderTopWidth: 1, borderTopColor: "#1A3045", paddingTop: 11, marginTop: 5 },
  composerInput: { flex: 1, minHeight: 45, maxHeight: 110, borderWidth: 1, borderColor: "#29445B", borderRadius: 11, backgroundColor: "#081624", color: "#F3F7FC", paddingHorizontal: 12, paddingVertical: 10, fontSize: 12 },
  sendButton: { minWidth: 58, height: 44, borderRadius: 10, backgroundColor: "#8BE8F7", alignItems: "center", justifyContent: "center", paddingHorizontal: 10 },
  sendButtonText: { color: "#071522", fontSize: 11, fontWeight: "900" },
  conversationCard: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 76, borderRadius: 14, borderWidth: 1, borderColor: "#1B344B", backgroundColor: "#0C1C2D", padding: 12 },
  conversationAvatar: { width: 40, height: 40, borderRadius: 14, backgroundColor: "#17364A", alignItems: "center", justifyContent: "center" },
  conversationAvatarText: { color: "#AEEBF7", fontSize: 14, fontWeight: "900" }
});
