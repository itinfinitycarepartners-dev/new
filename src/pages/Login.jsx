//@ts-nocheck
// Login.jsx - Fixed with proper password step navigation
import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { Loader2, ArrowRight } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

const API_BASE = "https://fictional-carnival-3inv.onrender.com";

export default function Login() {
  const { loginSuccess, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // ─── State ──────────────────────────────────────────────────────────────
// User login state
  const [email, setEmail] = useState(location.state?.email || "");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
// ─── If already authenticated, redirect ──────────────────────────────
  useEffect(() => {
    if (isAuthenticated) {
      console.log("[Login] Already authenticated, redirecting to /");
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (location.state?.passwordReset) {
      setInfo("Your password has been reset. Sign in with your new password.");
      setStep("password");
      navigate("/login", { replace: true, state: {} });
    }
  }, [location.state, navigate]);

  // ─── User Login Handlers ──────────────────────────────────────────────
  const handleCheckEmail = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setInfo("");

    const enteredEmail = email.trim();

    // Admin uses the same login screen but skips candidate email lookup.
    
    if (enteredEmail === "Admin") {
      setEmail("Admin");
      setPassword("");
      setStep("password");
      setLoading(false);
      return;
    }

    console.log("[Login] Checking email:", enteredEmail);

    try {
      const response = await fetch(`${API_BASE}/api/auth/check-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ email: enteredEmail }),
      });

      const data = await response.json();
      console.log("[Login] Check email response:", data);

      if (data.success) {
        if (data.requiresOTP) {
          setStep("otp");
          setInfo("A verification code has been sent to your email.");
        } else if (data.hasPassword === true) {
          setStep("password");
          setInfo("");
        } else if (data.hasPassword === false) {
          setError("This account needs to be set up. Please contact support.");
        } else {
          setStep("otp");
          setInfo("A verification code has been sent to your email.");
        }
      } else {
        setError(data.message || "Email not found");
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

    const isAdmin = email.trim() === "Admin";

    try {
      const response = await fetch(
        isAdmin
          ? `${API_BASE}/api/admin/login`
          : `${API_BASE}/api/auth/login-with-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          credentials: isAdmin ? "include" : "same-origin",
          body: JSON.stringify(
            isAdmin
              ? { username: "Admin", password }
              : { email: email.trim(), password }
          ),
        }
      );

      const data = await response.json();
      console.log("[Login] Password login response:", data);

      if (isAdmin) {
        if (response.ok) {
          localStorage.setItem("adminAuthenticated", "true");
          localStorage.setItem("adminUser", "Admin");

          if (data.token) {
            localStorage.setItem("adminToken", data.token);
          }

          navigate("/manage");
        } else {
          setError(data.message || "Invalid admin credentials");
        }

        return;
      }

      if (data.success && data.token) {
        await loginSuccess(data.token, email.trim(), data.user?.name);
        navigate("/");
      } else {
        setError(data.message || "Invalid credentials");
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


        {/* ─── Error/Info Messages ───────────────────────────────────────── */}
        {error && (
          <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg mb-4">
            {error}
          </p>
        )}
        {info && (
          <p className="text-sm text-emerald-700 bg-emerald-50 p-3 rounded-lg mb-4">
            {info}
          </p>
        )}


        {/* ─── LOGIN FLOW ─────────────────────────────────────────────────── */}
        <>
            {step === "email" && (
              <form onSubmit={handleCheckEmail} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com "
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
                  {email !== "Admin" && (
                    <Link to="/forgot-password" className="text-primary hover:underline">
                      Forgot password?
                    </Link>
                  )}
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

        {/* Separate admin login removed. Type "Admin" in the email field. */}

      </div>
    </div>
  );
}