import { useEffect, useState } from "react";
import { ActivityIndicator, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View } from "react-native";
import { supabase } from "./lib/supabase";

const modules = [
  ["Research Desk", "Fundamental and intermarket analysis"],
  ["Trade Ideas", "Published calls and status updates"],
  ["Trading Journal", "Your private records and performance"],
  ["Community", "Member discussions and shared ideas"],
  ["Private Messages", "Direct conversations with members"],
  ["Notifications", "Research, community and message alerts"]
];

export default function App() {
  const [sessionState, setSessionState] = useState<"checking" | "connected" | "setup">("checking");

  useEffect(() => {
    let active = true;
    if (!supabase) {
      setSessionState("setup");
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      if (active) setSessionState(data.session ? "connected" : "setup");
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setSessionState(session ? "connected" : "setup");
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#07111F" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View style={styles.logo}><Text style={styles.logoText}>AIS</Text></View>
          <View style={styles.brand}><Text style={styles.brandTitle}>INTERMARKET STRATEGIST</Text><Text style={styles.brandSub}>MOBILE TERMINAL</Text></View>
          <View style={styles.bell}><Text style={styles.bellText}>♧</Text></View>
        </View>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>MARKET INTELLIGENCE · ON THE MOVE</Text>
          <Text style={styles.title}>See beyond the chart.</Text>
          <Text style={styles.description}>Your research, trade ideas and trading workspace — connected in one mobile experience.</Text>
          <View style={styles.connection}>
            {sessionState === "checking" ? <ActivityIndicator color="#67DDF3" /> : <View style={[styles.dot, sessionState === "connected" ? styles.dotGood : styles.dotPending]} />}
            <Text style={styles.connectionText}>{sessionState === "checking" ? "Connecting securely…" : sessionState === "connected" ? "Supabase session connected" : "Connect your account to continue"}</Text>
          </View>
        </View>
        <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>YOUR WORKSPACE</Text><Text style={styles.sectionMeta}>CORE MODULES</Text></View>
        <View style={styles.grid}>
          {modules.map(([title, description], index) => (
            <View key={title} style={styles.card}>
              <Text style={styles.cardNumber}>0{index + 1}</Text>
              <Text style={styles.cardTitle}>{title}</Text>
              <Text style={styles.cardDescription}>{description}</Text>
            </View>
          ))}
        </View>
        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>Notifications are part of the experience</Text>
          <Text style={styles.noticeText}>A shared inbox and device push alerts will keep members informed about important publications, community activity and private messages.</Text>
        </View>
        <Text style={styles.footer}>INTERMARKET STRATEGIST · PRIVATE DEVELOPMENT BUILD</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#07111F" },
  container: { padding: 22, paddingBottom: 40 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 36 },
  logo: { width: 42, height: 42, borderRadius: 13, borderWidth: 1, borderColor: "#27617A", backgroundColor: "#102A40", alignItems: "center", justifyContent: "center" },
  logoText: { color: "#8BE8F7", fontSize: 12, fontWeight: "900", letterSpacing: 1 },
  brand: { flex: 1 },
  brandTitle: { color: "#EAF2FF", fontSize: 11, fontWeight: "800", letterSpacing: 1.1 },
  brandSub: { color: "#7892A9", fontSize: 9, letterSpacing: 2, marginTop: 4 },
  bell: { width: 38, height: 38, borderRadius: 12, backgroundColor: "#102438", borderWidth: 1, borderColor: "#25435C", alignItems: "center", justifyContent: "center" },
  bellText: { color: "#8BE8F7", fontSize: 20 },
  hero: { borderWidth: 1, borderColor: "#1C3A51", borderRadius: 24, padding: 20, backgroundColor: "#0B1B2D", marginBottom: 30 },
  eyebrow: { color: "#67DDF3", fontSize: 9, fontWeight: "800", letterSpacing: 1.5 },
  title: { color: "#F3F7FC", fontSize: 31, fontWeight: "800", letterSpacing: -1, marginTop: 14 },
  description: { color: "#A7B8CA", fontSize: 14, lineHeight: 22, marginTop: 10 },
  connection: { flexDirection: "row", alignItems: "center", gap: 9, borderTopWidth: 1, borderTopColor: "#20364B", marginTop: 20, paddingTop: 15 },
  connectionText: { color: "#A7B8CA", fontSize: 11 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotGood: { backgroundColor: "#4ADE80" },
  dotPending: { backgroundColor: "#FBBF24" },
  sectionHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  sectionTitle: { color: "#DDE9F5", fontSize: 11, fontWeight: "800", letterSpacing: 1.4 },
  sectionMeta: { color: "#6E849B", fontSize: 9, letterSpacing: 1 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  card: { width: "48%", minHeight: 126, borderRadius: 16, borderWidth: 1, borderColor: "#1B344B", backgroundColor: "#0C1C2D", padding: 14 },
  cardNumber: { color: "#5BCBE6", fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  cardTitle: { color: "#EDF4FB", fontSize: 14, fontWeight: "700", marginTop: 12 },
  cardDescription: { color: "#8298AE", fontSize: 11, lineHeight: 16, marginTop: 5 },
  notice: { marginTop: 20, padding: 17, borderRadius: 16, borderWidth: 1, borderColor: "#28556B", backgroundColor: "#0D2638" },
  noticeTitle: { color: "#B7F1FB", fontSize: 13, fontWeight: "700" },
  noticeText: { color: "#9AB1C3", fontSize: 11, lineHeight: 18, marginTop: 7 },
  footer: { color: "#526A80", fontSize: 8, letterSpacing: 1.2, textAlign: "center", marginTop: 30 }
});
