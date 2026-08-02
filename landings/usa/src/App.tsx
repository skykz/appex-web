import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import Paywall from "./pages/Paywall.tsx";
import NotFound from "./pages/NotFound.tsx";
import RoleDetail from "./pages/RoleDetail.tsx";
import Terms from "./pages/Terms.tsx";
import Privacy from "./pages/Privacy.tsx";
import Subscription from "./pages/Subscription.tsx";
import SettingsCheckoutReturn from "./pages/SettingsCheckoutReturn.tsx";
import CheckoutSuccess from "./pages/CheckoutSuccess.tsx";
import ConfirmEmail from "./pages/ConfirmEmail.tsx";
import { QuizProvider } from "./quiz/QuizContext";
import QuizOverlay from "./quiz/QuizOverlay";
import ActivityToasts from "./components/landing/ActivityToasts";
import { initMetaPixel, trackPageView, trackViewContent } from "@/lib/meta-pixel";
import { initGa4, ga4PageView, ga4LandingView } from "@/lib/ga4";
import { pushToDataLayer } from "@/lib/gtm";
import { captureAttribution } from "@/lib/attribution";

const queryClient = new QueryClient();

/**
 * Fires Meta PageView on every route change, and ViewContent on content pages
 * (landing home + role landings). Renders nothing; mounted inside the router.
 */
function RouteAnalytics() {
  const location = useLocation();

  useEffect(() => {
    // Capture first-touch creative/UTM tags BEFORE any pixel fires its first event.
    captureAttribution();
    initMetaPixel();
    initGa4();
  }, []);

  useEffect(() => {
    captureAttribution();
    trackPageView();
    ga4PageView(location.pathname);
    pushToDataLayer("page_view", { page_path: location.pathname });
    if (location.pathname === "/" || location.pathname.startsWith("/ai-skills-for/")) {
      trackViewContent({ content_name: location.pathname });
      ga4LandingView({ item_name: location.pathname });
      pushToDataLayer("landing_view", { item_name: location.pathname });
    }
  }, [location.pathname]);

  return null;
}

/**
 * Renders the live-activity toasts on browsing/landing pages and during the
 * quiz flow (with quiz-relevant copy). Hidden on checkout and legal pages where
 * they'd be a distraction.
 */
function ActivityToastsGate() {
  const location = useLocation();
  const path = location.pathname;

  const onLanding = path === "/" || path.startsWith("/ai-skills-for/");
  const onQuiz = path === "/quiz" || path.startsWith("/quiz/");

  if (onQuiz) return <ActivityToasts variant="quiz" />;
  if (onLanding) return <ActivityToasts variant="landing" />;
  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <RouteAnalytics />
        <QuizProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            {/* Legacy 45-screen quiz route, replaced by the QuizOverlay. Kept as a
                redirect (not a 404) so old bookmarks/pixels/ads land on the
                overlay-driven experience instead of the retired flow. */}
            <Route path="/quiz" element={<Navigate to="/" replace />} />
            <Route path="/quiz/result" element={<Navigate to="/" replace />} />
            <Route path="/paywall" element={<Paywall />} />
            <Route path="/checkout/success" element={<CheckoutSuccess />} />
            {/* Target of the "Confirm email" link in the lead confirmation mail. */}
            <Route path="/confirm-email" element={<ConfirmEmail />} />
            <Route path="/ai-skills-for/:slug" element={<RoleDetail />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/subscription" element={<Subscription />} />
            <Route path="/settings" element={<SettingsCheckoutReturn />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <QuizOverlay />
          <ActivityToastsGate />
        </QuizProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
