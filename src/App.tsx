import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LMSProvider } from "@/context/LMSContext";
import { AppLayout } from "@/components/AppLayout";
import Dashboard from "./pages/Dashboard";
import Topics from "./pages/Topics";
import Announcements from "./pages/Announcements";
import Discussions from "./pages/Discussions";
import Grades from "./pages/Grades";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <LMSProvider>
        <BrowserRouter>
          <AppLayout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/topics" element={<Topics />} />
              <Route path="/announcements" element={<Announcements />} />
              <Route path="/discussions" element={<Discussions />} />
              <Route path="/grades" element={<Grades />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppLayout>
        </BrowserRouter>
      </LMSProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
