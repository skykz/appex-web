import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import Quiz from "./pages/Quiz.tsx";
import QuizResult from "./pages/QuizResult.tsx";
import Paywall from "./pages/Paywall.tsx";
import NotFound from "./pages/NotFound.tsx";
import RoleDetail from "./pages/RoleDetail.tsx";
import Terms from "./pages/Terms.tsx";
import Privacy from "./pages/Privacy.tsx";
import Subscription from "./pages/Subscription.tsx";
import SettingsCheckoutReturn from "./pages/SettingsCheckoutReturn.tsx";
import CheckoutSuccess from "./pages/CheckoutSuccess.tsx";
import { QuizProvider } from "./quiz/QuizContext";
import QuizOverlay from "./quiz/QuizOverlay";
import { initMetaPixel, trackPageView, trackViewContent } from "@/lib/meta-pixel";
import { captureAttribution } from "@/lib/attribution";

const queryClient = new QueryClient();

/**
 * Fires Meta PageView on every route change, and ViewContent on content pages
 * (landing home + role landings). Renders nothing; mounted inside the router.
 */
function RouteAnalytics() {
  const location = useLocation();

  useEffect(() => {
    // Capture first-touch creative/UTM tags BEFORE the pixel fires its first event.
    captureAttribution();
    initMetaPixel();
  }, []);

  useEffect(() => {
    captureAttribution();
    trackPageView();
    if (location.pathname === "/" || location.pathname.startsWith("/ai-skills-for/")) {
      trackViewContent({ content_name: location.pathname });
    }
  }, [location.pathname]);

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
            <Route path="/quiz" element={<Quiz />} />
            <Route path="/quiz/result" element={<QuizResult />} />
            <Route path="/paywall" element={<Paywall />} />
            <Route path="/checkout/success" element={<CheckoutSuccess />} />
            <Route path="/ai-skills-for/:slug" element={<RoleDetail />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/subscription" element={<Subscription />} />
            <Route path="/settings" element={<SettingsCheckoutReturn />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <QuizOverlay />
        </QuizProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
