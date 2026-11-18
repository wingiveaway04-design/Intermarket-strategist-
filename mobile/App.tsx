import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, BackHandler, Linking, SafeAreaView, StatusBar, StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";

const AIS_URL = "https://intermarket-strategist.vercel.app";
const BRAND = "ABDULKADIR INTERMARKET STRATEGIES";

function BrandScreen({ message }: { message: string }) {
  return <View style={styles.brandScreen}>
    <View style={styles.logo}><Text style={styles.logoText}>AIS</Text></View>
    <Text style={styles.brand}>{BRAND}</Text>
    <Text style={styles.tagline}>SEE THE BIGGER PICTURE.</Text>
    <ActivityIndicator color="#79E3F5" size="small" style={{ marginTop: 30 }} />
    <Text style={styles.message}>{message}</Text>
  </View>;
}

export default function App() {
  const web = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const retry = useCallback(() => { setError(""); setLoading(true); web.current?.reload(); }, []);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!canGoBack) return false;
      web.current?.goBack();
      return true;
    });
    return () => sub.remove();
  }, [canGoBack]);

  const allowNavigation = useCallback((request: { url: string }) => {
    if (/^(mailto:|tel:|sms:|whatsapp:|intent:)/i.test(request.url)) {
      void Linking.openURL(request.url).catch(() => undefined);
      return false;
    }
    return true;
  }, []);

  return <SafeAreaView style={styles.safe}>
    <StatusBar barStyle="light-content" />
    <View style={styles.container}>
      <WebView
        ref={web}
        source={{ uri: AIS_URL }}
        style={styles.web}
        originWhitelist={["http://*", "https://*"]}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        cacheEnabled
        pullToRefreshEnabled
        allowsBackForwardNavigationGestures
        setSupportMultipleWindows={false}
        onNavigationStateChange={(state) => setCanGoBack(state.canGoBack)}
        onShouldStartLoadWithRequest={allowNavigation}
        onLoadStart={() => { setLoading(true); setError(""); }}
        onLoadEnd={() => setLoading(false)}
        onError={({ nativeEvent }) => { setLoading(false); setError(nativeEvent.description || "Unable to connect to AIS."); }}
        onHttpError={({ nativeEvent }) => { if (nativeEvent.statusCode >= 500) { setLoading(false); setError("AIS is temporarily unavailable. Please try again."); } }}
        onContentProcessDidTerminate={retry}
        onRenderProcessGone={retry}
      />
      {loading && <View pointerEvents="none" style={styles.loading}><BrandScreen message="Loading your market workspace…" /></View>}
      {!!error && <View style={styles.error}>
        <View style={styles.logo}><Text style={styles.logoText}>AIS</Text></View>
        <Text style={styles.errorTitle}>Connection interrupted</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <Text accessibilityRole="button" onPress={retry} style={styles.retry}>TRY AGAIN</Text>
      </View>}
    </View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe:{flex:1,backgroundColor:"#061321"},container:{flex:1,backgroundColor:"#061321"},web:{flex:1,backgroundColor:"#07111F"},
  brandScreen:{...StyleSheet.absoluteFill,zIndex:3,alignItems:"center",justifyContent:"center",padding:28,backgroundColor:"#061321"},
  logo:{width:82,height:82,borderRadius:24,borderWidth:1,borderColor:"rgba(121,227,245,.5)",backgroundColor:"#0D293D",alignItems:"center",justifyContent:"center"},
  logoText:{color:"#A2EFFB",fontSize:28,fontWeight:"900",letterSpacing:1.5},
  brand:{marginTop:22,color:"#EAF5FF",fontSize:13,fontWeight:"800",letterSpacing:1.1,textAlign:"center"},
  tagline:{marginTop:8,color:"#79DFF2",fontSize:9,fontWeight:"700",letterSpacing:2.2},
  message:{marginTop:12,color:"#829BB2",fontSize:12,textAlign:"center"},
  loading:{...StyleSheet.absoluteFill,zIndex:3},
  error:{...StyleSheet.absoluteFill,zIndex:8,alignItems:"center",justifyContent:"center",padding:32,backgroundColor:"#061321"},
  errorTitle:{marginTop:24,color:"#F2F7FC",fontSize:20,fontWeight:"800"},
  errorMessage:{marginTop:10,color:"#9CB0C4",fontSize:13,lineHeight:21,textAlign:"center"},
  retry:{marginTop:24,overflow:"hidden",borderRadius:12,backgroundColor:"#8BE8F7",color:"#061321",paddingHorizontal:22,paddingVertical:13,fontSize:11,fontWeight:"900",letterSpacing:1}
});
