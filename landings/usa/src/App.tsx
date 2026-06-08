import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
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
import { QuizProvider } from "./quiz/QuizContext";
import QuizOverlay from "./quiz/QuizOverlay";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <QuizProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/quiz" element={<Quiz />} />
            <Route path="/quiz/result" element={<QuizResult />} />
            <Route path="/paywall" element={<Paywall />} />
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
