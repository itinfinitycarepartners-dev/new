import React, { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";
import {
  HashRouter as Router,
  Route,
  Routes
} from "react-router-dom";
import PageNotFound from "./lib/PageNotFound";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "./components/Layout";
import { isPipelineCategoryEnabled } from "@/config/releaseConfig";

// ─── Lazy-loaded pages for code splitting ────────────────────────────────────
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Profile = lazy(() => import("./pages/Profile"));
const Documents = lazy(() => import("./pages/Documents"));
const Updates = lazy(() => import("./pages/Updates"));
const WelcomePacket = lazy(() => import("./pages/WelcomePacket"));
const RelocationHub = lazy(() => import("./pages/RelocationHub"));
const Pipeline = lazy(() => import("./pages/Pipeline"));
const Aftercare = lazy(() => import("./pages/Aftercare"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Resource = lazy(() => import("./pages/Resource"));
const RAndL = lazy(() => import("./pages/RAndL"));
const Admin = lazy(() => import("./pages/overal"));
const Forms = lazy(() => import("./pages/Forms"));
const MakeRequest = lazy(() => import("./pages/MakeRequest"));
const Messages = lazy(() => import("./pages/Messages"));
const MessageList = lazy(() => import("./components/messaging/MessageList"));

// ─── Loading fallback ─────────────────────────────────────────────────────────
const LoadingSpinner = () => (
  <div className="fixed inset-0 flex items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" />
  </div>
);

// ─── Messaging imports ────────────────────────────────────────────────────────
import {
  initMessaging,
  websocket,
  tokenStorage
} from "@/api/icpClient";

const MessagingInitializer = ({ children }) => {
  const {
    isAuthenticated,
    isLoadingAuth
  } = useAuth();

  useEffect(() => {
    let idleCallbackId;
    let fallbackTimerId;

    if (isLoadingAuth) {
      return undefined;
    }

    if (!isAuthenticated) {
      websocket.disconnect();
      return undefined;
    }

    const startMessaging = () => {
      const token = tokenStorage.get();
      if (token) {
        initMessaging(token);
      }
    };

    // Keep WebSocket negotiation off the critical render path. requestIdleCallback
    // runs after the first frame; the timeout keeps older browsers supported.
    if ("requestIdleCallback" in window) {
      idleCallbackId = window.requestIdleCallback(startMessaging, { timeout: 2000 });
    } else {
      fallbackTimerId = window.setTimeout(startMessaging, 250);
    }

    return () => {
      if (idleCallbackId !== undefined) {
        window.cancelIdleCallback(idleCallbackId);
      }
      if (fallbackTimerId !== undefined) {
        window.clearTimeout(fallbackTimerId);
      }
    };
  }, [
    isAuthenticated,
    isLoadingAuth
  ]);

  return children;
};

const ReleasedAftercareRoute = () => {
  if (!isPipelineCategoryEnabled("Aftercare")) {
    return <PageNotFound />;
  }

  return <Aftercare />;
};

const AuthenticatedApp = () => {
  const {
    isLoadingAuth
  } = useAuth();

  if (isLoadingAuth) {
    return <LoadingSpinner />;
  }

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
      {/* Public Routes */}
      <Route
        path="/login"
        element={<Login />}
      />
      <Route
        path="/register"
        element={<Register />}
      />
      <Route
        path="/forgot-password"
        element={<ForgotPassword />}
      />
      <Route
        path="/reset-password"
        element={<ResetPassword />}
      />

      {/* Admin Routes */}
      <Route
        path="/admin"
        element={<Admin />}
      />
      <Route
        path="/manage"
        element={<Admin />}
      />

      {/* Protected Routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route
            path="/"
            element={<Dashboard />}
          />
          <Route
            path="/profile"
            element={<Profile />}
          />
          <Route
            path="/documents"
            element={<Documents />}
          />

          {/* Forms was imported before but had no route. */}
          <Route
            path="/forms"
            element={<Forms />}
          />

          <Route
            path="/make-request"
            element={<MakeRequest />}
          />

          <Route
            path="/updates"
            element={<Updates />}
          />
          <Route
            path="/welcome-packet"
            element={<WelcomePacket />}
          />
          <Route
            path="/relocation"
            element={<RelocationHub />}
          />
          <Route
            path="/pipeline"
            element={<Pipeline />}
          />
          <Route
            path="/aftercare"
            element={<ReleasedAftercareRoute />}
          />
          <Route
            path="/resource"
            element={<Resource />}
          />
          <Route
            path="/randl"
            element={<RAndL />}
          />

          <Route
            path="/messages"
            element={<Messages />}
          />
          <Route
            path="/messages/:conversationId"
            element={<MessageList />}
          />
        </Route>
      </Route>

      <Route
        path="*"
        element={<PageNotFound />}
      />
    </Routes>
    </Suspense>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider
        client={queryClientInstance}
      >
        <Router>
          <MessagingInitializer>
            <AuthenticatedApp />
          </MessagingInitializer>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
