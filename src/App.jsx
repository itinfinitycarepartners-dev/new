import React, { useEffect } from "react";
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
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Documents from "./pages/Documents";
import Updates from "./pages/Updates";
import WelcomePacket from "./pages/WelcomePacket";
import RelocationHub from "./pages/RelocationHub";
import Pipeline from "./pages/Pipeline";
import Aftercare from "./pages/Aftercare";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Resource from "./pages/Resource";
import RAndL from "./pages/RAndL";
import Admin from "./pages/overal";
import Forms from "./pages/Forms";
import MakeRequest from "./pages/MakeRequest";

// ─── Messaging imports ────────────────────────────────────────────────────────
import Messages from "./pages/Messages";
import MessageList from "./components/messaging/MessageList";
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
    if (
      !isLoadingAuth &&
      isAuthenticated
    ) {
      const token =
        tokenStorage.get();

      if (token) {
        console.log(
          "[App] Initializing WebSocket connection"
        );

        initMessaging(token);
      }
    }

    return () => {
      if (!isAuthenticated) {
        websocket.disconnect();
      }
    };
  }, [
    isAuthenticated,
    isLoadingAuth
  ]);

  return children;
};

const AuthenticatedApp = () => {
  const {
    isLoadingAuth
  } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" />
      </div>
    );
  }

  return (
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
            element={<Aftercare />}
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