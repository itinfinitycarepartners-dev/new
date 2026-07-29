//@ts-nocheck
// Login.jsx - Fixed with proper password step navigation
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { Loader2, ArrowRight, Shield, User } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

const API_BASE = "https://fictional-carnival-3inv.onrender.com";

export default function Login() {
  const { loginSuccess, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // ─── State ──────────────────────────────────────────────────────────────
  const [loginType, setLoginType] = useState("user");
  
  // User login state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [debugInfo, setDebugInfo] = useState("");
  
  // Admin login state
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState("");

  // ─── If already authenticated, redirect ──────────────────────────────
  useEffect(() => {
    if (isAuthenticated) {
      console.log("[Login] Already authenticated, redirecting to /");
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  // ─── User Login Handlers ──────────────────────────────────────────────
  const handleCheckEmail = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setInfo("");
    setDebugInfo("");
    console.log("[Login] Checking email:", email);
    
    try {
      const response = await fetch(`${API_BASE}/api/auth/check-email`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ email }),
      });
      
      const data = await response.json();
      console.log("[Login] Check email response:", data);
      setDebugInfo(`Response: ${JSON.stringify(data, null, 2)}`);

      if (data.success) {
        // Log all the conditions for debugging
        console.log("[Login] requiresOTP:", data.requiresOTP);
        console.log("[Login] hasPassword:", data.hasPassword);
        
        if (data.requiresOTP) {
          setStep("otp");
          setInfo("A verification code has been sent to your email.");
          console.log("[Login] OTP required, step set to otp");
        } else if (data.hasPassword === true) {
          // Explicit check for true boolean
          setStep("password");
          setInfo(""); // Clear any info messages
          console.log("[Login] Password exists, step set to password");
        } else if (data.hasPassword === false) {
          // User exists but no password set - maybe needs OTP or setup
          if (data.requiresOTP) {
            setStep("otp");
            setInfo("A verification code has been sent to your email.");
          } else {
            setError("This account needs to be set up. Please contact support.");
          }
          console.log("[Login] No password set for user");
        } else {
          // Fallback - if we're not sure, try OTP
          setStep("otp");
          setInfo("A verification code has been sent to your email.");
          console.log("[Login] Fallback to OTP");
        }
      } else {
        setError(data.message || "Email not found");
        console.log("[Login] Email check failed:", data.message);
      }
    } catch (err) {
      console.error("[Login] Check email error:", err);
      setError("Connection failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    console.log("[Login] Attempting password login for:", email);
    
    try {
      const response = await fetch(`${API_BASE}/api/auth/login-with-password`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await response.json();
      console.log("[Login] Password login response:", data);
      
      if (data.success && data.token) {
        console.log("[Login] Login successful, calling loginSuccess");
        await loginSuccess(data.token, email, data.user?.name);
        console.log("[Login] loginSuccess completed");
        navigate("/");
      } else {
        setError(data.message || "Invalid credentials");
        console.log("[Login] Password login failed:", data.message);
      }
    } catch (err) {
      console.error("[Login] Password login error:", err);
      setError("Connection failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otp.length < 6) {
      setError("Please enter the 6-digit code");
      return;
    }
    setLoading(true);
    setError("");
    console.log("[Login] Verifying OTP for:", email);
    
    try {
      const response = await fetch(`${API_BASE}/api/auth/verify-otp`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ email, otp, isNewApp: true }),
      });
      
      const data = await response.json();
      console.log("[Login] OTP verify response:", data);
      
      if (data.success && data.token) {
        console.log("[Login] OTP verified, calling loginSuccess");
        await loginSuccess(data.token, email, data.user?.name);
        console.log("[Login] loginSuccess completed");
        navigate("/");
      } else if (data.needsPasswordSetup) {
        setStep("setup-password");
        setInfo("Please set up your password.");
        console.log("[Login] Needs password setup");
      } else {
        setError(data.message || "Invalid code");
        console.log("[Login] OTP verify failed:", data.message);
      }
    } catch (err) {
      console.error("[Login] OTP verify error:", err);
      setError("Connection failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSetupPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    setError("");
    console.log("[Login] Setting up password for:", email);
    
    try {
      const response = await fetch(`${API_BASE}/api/auth/setup-password`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ email, password: newPassword, confirmPassword }),
      });
      
      const data = await response.json();
      console.log("[Login] Setup password response:", data);
      
      if (data.success && data.token) {
        console.log("[Login] Password setup complete, calling loginSuccess");
        await loginSuccess(data.token, email, data.user?.name);
        console.log("[Login] loginSuccess completed");
        navigate("/");
      } else {
        setError(data.message || "Failed to set password");
        console.log("[Login] Setup password failed:", data.message);
      }
    } catch (err) {
      console.error("[Login] Setup password error:", err);
      setError("Connection failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setInfo("");
    try {
      await fetch(`${API_BASE}/api/auth/resend-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setInfo("A new code has been sent.");
    } catch (err) {
      setError("Failed to resend code.");
    }
  };

  // ─── Admin Login Handler ──────────────────────────────────────────────
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setAdminLoading(true);
    setAdminError("");
    
    try {
      console.log("[Admin] Attempting admin login for:", adminUsername);
      
      const response = await fetch(`${API_BASE}/api/admin/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          username: adminUsername,
          password: adminPassword,
        }),
      });

      const data = await response.json();
      console.log("[Admin] Login response:", data);

      if (response.ok) {
        console.log("[Admin] Login success");
        localStorage.setItem("adminAuthenticated", "true");
        localStorage.setItem("adminUser", adminUsername);
        navigate("/manage");
      } else {
        setAdminError(data.message || "Invalid admin credentials");
        console.log("[Admin] Login failed:", data.message);
      }
    } catch (err) {
      console.error("[Admin] Login error:", err);
      setAdminError("Connection failed. Please check your network.");
    } finally {
      setAdminLoading(false);
    }
  };

   //─── Render ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center mx-auto mb-4">
            <span className="text-primary-foreground font-bold text-lg">ICP</span>
          </div>
          <h1 className="text-2xl font-bold">Candidate Portal</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Infinity Care Partners
          </p>
        </div>

        {/* ─── Login Type Toggle ─────────────────────────────────────────── */}
        <div className="flex rounded-lg bg-muted p-1 mb-6">
          <button
            onClick={() => {
              setLoginType("user");
              // Reset user state when switching tabs
              setStep("email");
              setError("");
              setInfo("");
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-all ${
              loginType === "user"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <User className="h-4 w-4" />
            User
          </button>
          <button
            onClick={() => {
              setLoginType("admin");
              setAdminError("");
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-all ${
              loginType === "admin"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Shield className="h-4 w-4" />
            Admin
          </button>
        </div>

        {/* ─── Error/Info Messages ───────────────────────────────────────── */}
        {loginType === "user" && error && (
          <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg mb-4">
            {error}
          </p>
        )}
        {loginType === "user" && info && (
          <p className="text-sm text-emerald-700 bg-emerald-50 p-3 rounded-lg mb-4">
            {info}
          </p>
        )}
        {loginType === "user" && debugInfo && (
          <p className="text-xs text-gray-500 bg-gray-100 p-2 rounded mb-4">
            {debugInfo}
          </p>
        )}
        {loginType === "admin" && adminError && (
          <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg mb-4">
            {adminError}
          </p>
        )}

        {/* ─── USER LOGIN ─────────────────────────────────────────────────── */}
        {loginType === "user" && (
          <>
            {step === "email" && (
              <form onSubmit={handleCheckEmail} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                    className="mt-1"
                    autoFocus
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <span>Continue</span>
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
                <div className="flex justify-center">
                  <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                    Forgot password?
                  </Link>
                </div>
              </form>
            )}

            {step === "password" && (
              <form onSubmit={handlePasswordLogin} className="space-y-4">
                <p className="text-sm text-muted-foreground text-center">
                  Sign in as <strong>{email}</strong>
                </p>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="mt-1"
                    autoFocus
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign In"}
                </Button>
                <div className="flex justify-between text-sm">
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={() => {
                      setStep("email");
                      setPassword("");
                      setError("");
                    }}
                  >
                    ← Change email
                  </button>
                  <Link to="/forgot-password" className="text-primary hover:underline">
                    Forgot password?
                  </Link>
                </div>
              </form>
            )}

            {step === "otp" && (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <p className="text-sm text-muted-foreground text-center">
                  Enter the 6-digit code sent to <strong>{email}</strong>
                </p>
                <div className="flex justify-center">
                  <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <Button type="submit" className="w-full" disabled={loading || otp.length < 6}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify Code"}
                </Button>
                <div className="flex justify-between text-sm">
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={() => {
                      setStep("email");
                      setOtp("");
                      setError("");
                    }}
                  >
                    ← Change email
                  </button>
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={handleResend}
                  >
                    Resend code
                  </button>
                </div>
              </form>
            )}

            {step === "setup-password" && (
              <form onSubmit={handleSetupPassword} className="space-y-4">
                <p className="text-sm text-muted-foreground text-center">
                  Create a password for your account
                </p>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                    className="mt-1"
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="mt-1"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Set Password & Sign In"}
                </Button>
              </form>
            )}
          </>
        )}

        {/* ─── ADMIN LOGIN ─────────────────────────────────────────────────── */}
        {loginType === "admin" && (
          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-username">Admin Username</Label>
              <Input
                id="admin-username"
                type="text"
                value={adminUsername}
                onChange={(e) => setAdminUsername(e.target.value)}
                required
                placeholder="Enter admin username"
                className="mt-1"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-password">Admin Password</Label>
              <Input
                id="admin-password"
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                required
                placeholder="Enter admin password"
                className="mt-1"
              />
            </div>
            <Button type="submit" className="w-full" disabled={adminLoading}>
              {adminLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Shield className="h-4 w-4 mr-2" />
                  Sign in as Admin
                </>
              )}
            </Button>
            <div className="text-xs text-center text-muted-foreground">
              Default: admin / admin
            </div>
          </form>
        )}
      </div>
    </div>
  );
}