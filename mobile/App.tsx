import { useCallback, useEffect, useRef, useState } from "react";
import type { ComponentType } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Linking,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View
} from "react-native";
import { WebView } from "react-native-webview";

const WEBSITE_URL = "https://intermarket-strategist.vercel.app";
const BRAND = "ABDULKADIR INTERMARKET STRATEGIES";

// The website is the single source of truth for every screen, account and feature.
// Keeping the live site in a native WebView means website improvements appear in
// the Android/iOS app without rebuilding a second set of screens.
const WEBSITE_BRIDGE = `
(function () {
  if (window.__AIS_NATIVE_LINKS__) return true;
  window.__AIS_NATIVE_LINKS__ = true;
  var open = window.open;
  window.open = function (url) {
    if (url) window.location.href = url;
    return null;
  };
  document.addEventListener('click', function (event) {
    var anchor = event.target && event.target.closest ? event.target.closest('a[target="_blank"]') : null;
    if (anchor) anchor.removeAttribute('target');
  }, true);
  return true;
})();
true;
`;

function LaunchScreen({ message }: { message: string }) {
  return (
    <View style={styles.launch}>
      <View style={styles.logo}><Text style={styles.logoText}>AIS</Text></View>
      <Text style={styles.brand}>{BRAND}</Text>
      <Text style={styles.tagline}>SEE THE BIGGER PICTURE.</Text>
      <ActivityIndicator color="#79E3F5" size="small" style={styles.spinner} />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

export default function App() {
  const webView = useRef<any>(null);
  const NativeWebView = WebView as unknown as ComponentType<any>;
  const [canGoBack, setCanGoBack] = useState(false);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const handleNavigation = useCallback((navigation: { canGoBack: boolean }) => {
    setCanGoBack(navigation.canGoBack);
  }, []);

  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (canGoBack && webView.current) {
        webView.current.goBack();
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [canGoBack]);

  const retry = useCallback((): void => {
    setError(null);
    setLoading(true);
    setProgress(0);
    setReloadKey((value) => value + 1);
  }, []);

  const handleNavigationRequest = useCallback((request: { url: string }) => {
    const url = request.url;
    if (/^(mailto:|tel:|sms:|whatsapp:|intent:)/i.test(url)) {
      void Linking.openURL(url).catch(() => undefined);
      return false;
    }
    return true;
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />
      <View style={styles.container}>
        {loading && !error && (
          <View style={styles.progressTrack}>
            <View style={[styles.progressBar, { width: `${Math.max(progress * 100, 4)}%` }]} />
          </View>
        )}
        <WebView
          key={reloadKey}
          ref={webView}
          source={{ uri: WEBSITE_URL }}
          style={styles.webview}
          originWhitelist={["http://*", "https://*"]}
          javaScriptEnabled
          domStorageEnabled
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          cacheEnabled
          allowsBackForwardNavigationGestures
          pullToRefreshEnabled
          setSupportMultipleWindows={false}
          startInLoadingState
          renderLoading={() => <LaunchScreen message="Loading your market workspace…" />}
          injectedJavaScriptBeforeContentLoaded={WEBSITE_BRIDGE}
          onNavigationStateChange={handleNavigation}
          onShouldStartLoadWithRequest={handleNavigationRequest}
          onLoadProgress={({ nativeEvent }: { nativeEvent: { progress: number } }) => setProgress(nativeEvent.progress)}
          onLoadStart={() => {
            setLoading(true);
            setError(null);
          }}
          onLoadEnd={() => {
            setLoading(false);
            setProgress(1);
          }}
          onError={({ nativeEvent }: { nativeEvent: { description?: string } }) => {
            setLoading(false);
            setError(nativeEvent.description || "Unable to connect to the AIS website.");
          }}
          onHttpError={({ nativeEvent }: { nativeEvent: { statusCode: number } }) => {
            if (nativeEvent.statusCode >= 500) {
              setError(`The AIS website is temporarily unavailable (HTTP ${nativeEvent.statusCode}).`);
            }
          }}
          onContentProcessDidTerminate={retry}
          onRenderProcessGone={retry}
          onMessage={() => undefined}
          webviewDebuggingEnabled={__DEV__}
        />
        {error && (
          <View style={styles.errorOverlay}>
            <View style={styles.logo}><Text style={styles.logoText}>AIS</Text></View>
            <Text style={styles.errorTitle}>Connection interrupted</Text>
            <Text style={styles.errorText}>{error}</Text>
            <Text onPress={retry} accessibilityRole="button" style={styles.retry}>TRY AGAIN</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#061321" },
  container: { flex: 1, backgroundColor: "#061321" },
  webview: { flex: 1, backgroundColor: "#07111f" },
  progressTrack: { height: 2, width: "100%", backgroundColor: "#10283a" },
  progressBar: { height: 2, backgroundColor: "#79E3F5" },
  launch: {
    ...StyleSheet.absoluteFill,
    zIndex: 5,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    backgroundColor: "#061321"
  },
  logo: {
    width: 76,
    height: 76,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: "rgba(121,227,245,.42)",
    backgroundColor: "#0D293D",
    alignItems: "center",
    justifyContent: "center"
  },
  logoText: { color: "#9BEAF7", fontSize: 25, fontWeight: "900", letterSpacing: 1.5 },
  brand: {
    marginTop: 22,
    color: "#EAF5FF",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1.2,
    textAlign: "center"
  },
  tagline: { marginTop: 8, color: "#79DFF2", fontSize: 9, fontWeight: "700", letterSpacing: 2.3 },
  spinner: { marginTop: 30 },
  message: { marginTop: 12, color: "#829BB2", fontSize: 12, textAlign: "center" },
  errorOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 10,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    backgroundColor: "#061321"
  },
  errorTitle: { marginTop: 24, color: "#F2F7FC", fontSize: 20, fontWeight: "800" },
  errorText: { marginTop: 10, color: "#9CB0C4", fontSize: 13, lineHeight: 21, textAlign: "center" },
  retry: {
    marginTop: 24,
    overflow: "hidden",
    borderRadius: 12,
    backgroundColor: "#8BE8F7",
    color: "#061321",
    paddingHorizontal: 22,
    paddingVertical: 13,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1
  }
});
