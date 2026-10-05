//@ts-nocheck

// Login.jsx
// Candidate + Admin login flow

import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { Loader2, ArrowRight } from "lucide-react";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

/**
 * Generic message shown to candidates when the backend,
 * database, Azure service, MongoDB, or another internal
 * dependency is unavailable.
 *
 * Internal infrastructure details should never be shown
 * directly to portal users.
 */
const SYSTEM_UNREACHABLE_MESSAGE =
  "System unreachable. Please try again.";

/**
 * Detect infrastructure/internal errors that should not be
 * exposed directly to candidates.
 */
function isInfrastructureError(message = "", status = 0) {
  const text = String(message || "").toLowerCase();

  // Any HTTP 5xx response is treated as an internal service failure.
  if (status >= 500) {
    return true;
  }

  const infrastructurePatterns = [
    // MongoDB / Atlas
    "mongodb",
    "mongoerror",
    "mongoose",
    "atlas",
    "cloud.mongodb.com",
    "cluster",

    // MongoDB storage quota errors
    "space quota",
    "storage quota",
    "over your space quota",
    "writes are blocked",
    "limit=storage",
    "upgrade cluster",
    "cluster tier",

    // PostgreSQL / database internals
    "postgres",
    "postgresql",
    "database connection",
    "database unavailable",

    // Network/internal backend errors
    "econnrefused",
    "econnreset",
    "enotfound",
    "etimedout",
    "connection refused",
    "connection reset",
    "socket hang up",
    "network error",

    // Generic internal errors
    "internal server error",
    "server error",
    "service unavailable",
    "bad gateway",
    "gateway timeout",

    // Azure/internal hosting details
    "azurewebsites.net",
    "app service",
  ];

  return infrastructurePatterns.some((pattern) => text.includes(pattern));
}

/**
 * Read API responses safely.
 *
 * The backend/reverse proxy can sometimes return HTML instead
 * of JSON. It can also return sensitive infrastructure error
 * messages from MongoDB, Azure, PostgreSQL, etc.
 *
 * Those errors are logged in the browser console for debugging,
 * but candidates only receive a friendly generic message.
 */
async function readApiResponse(response) {
  const body = await response.text();

  let data;

  try {
    data = body ? JSON.parse(body) : {};
  } catch (error) {
    console.error("[Login] Non-JSON response received:", {
      status: response.status,
      body,
    });

    return {
      success: false,
      message: SYSTEM_UNREACHABLE_MESSAGE,
    };
  }

  const rawMessage =
    data?.message ||
    data?.error ||
    data?.details ||
    "";

  if (isInfrastructureError(rawMessage, response.status)) {
    console.error("[Login] Internal service error:", {
      status: response.status,
      serverMessage: rawMessage,
    });

    return {
      ...data,
      success: false,
      message: SYSTEM_UNREACHABLE_MESSAGE,
    };
  }

  return data;
}

export default function Login() {
  const { loginSuccess, isAuthenticated } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();

  // ─────────────────────────────────────────────────────────────
  // STATE
  // ─────────────────────────────────────────────────────────────

  const [email, setEmail] = useState(
    location.state?.email || ""
  );

  const [password, setPassword] = useState("");

  const [newPassword, setNewPassword] = useState("");

  const [confirmPassword, setConfirmPassword] = useState("");

  const [otp, setOtp] = useState("");

  const [step, setStep] = useState("email");

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const [info, setInfo] = useState("");

  const [setupToken, setSetupToken] = useState("");

  // ─────────────────────────────────────────────────────────────
  // ALREADY AUTHENTICATED
  // ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (isAuthenticated) {
      console.log(
        "[Login] Already authenticated, redirecting to /"
      );

      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  // ─────────────────────────────────────────────────────────────
  // PASSWORD RESET MESSAGE
  // ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (location.state?.passwordReset) {
      setInfo(
        "Your password has been reset. Sign in with your new password."
      );

      setStep("password");

      navigate("/login", {
        replace: true,
        state: {},
      });
    }
  }, [location.state, navigate]);

  // ─────────────────────────────────────────────────────────────
  // APPROVED LOGIN / PASSWORD SETUP TOKEN
  // ─────────────────────────────────────────────────────────────

  useEffect(() => {
    const params = new URLSearchParams(location.search);

    const token = params.get("setupToken");

    if (!token) return;

    const approvedEmail = params
      .get("email")
      ?.trim()
      .toLowerCase();

    if (approvedEmail) {
      setEmail(approvedEmail);
    }

    setSetupToken(token);

    setStep("setup-password");

    setInfo(
      "Your access has been approved. Create a password to sign in."
    );
  }, [location.search]);

  // ─────────────────────────────────────────────────────────────
  // CHECK EMAIL
  // ─────────────────────────────────────────────────────────────

  const handleCheckEmail = async (e) => {
    e.preventDefault();

    setLoading(true);
    setError("");
    setInfo("");

    const enteredEmail = email.trim();

    // Admin uses the same login page but skips
    // candidate email lookup.
    if (enteredEmail === "Admin") {
      setEmail("Admin");
      setPassword("");
      setStep("password");
      setLoading(false);
      return;
    }

    console.log(
      "[Login] Checking email:",
      enteredEmail
    );

    try {
      const response = await fetch(
        `${API_BASE}/api/auth/check-email`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },

          body: JSON.stringify({
            email: enteredEmail,
          }),
        }
      );

      const data = await readApiResponse(response);

      console.log(
        "[Login] Check email response:",
        data
      );

      if (data.success) {
        // Candidate waiting for manual approval
        if (data.awaitingApproval) {
          setInfo(data.message);
          return;
        }

        /**
         * IMPORTANT:
         *
         * Check needsPasswordSetup before hasPassword.
         *
         * The backend can intentionally return:
         *
         * {
         *   needsPasswordSetup: true,
         *   hasPassword: false
         * }
         *
         * The candidate should therefore be sent to
         * password setup instead of receiving an error.
         */
        if (data.needsPasswordSetup) {
          setEmail(enteredEmail);

          setStep("setup-password");

          setInfo(
            data.message ||
              "Email confirmed. Please create your password."
          );
        } else if (data.requiresOTP) {
          setStep("otp");

          setInfo(
            "A verification code has been sent to your email."
          );
        } else if (data.hasPassword === true) {
          setStep("password");

          setInfo("");
        } else {
          setError(
            data.message ||
              "This account needs to be set up. Please contact support."
          );
        }
      } else {
        setError(
          data.message || "Email not found"
        );
      }
    } catch (err) {
      console.error(
        "[Login] Check email request failed:",
        err
      );

      setError(SYSTEM_UNREACHABLE_MESSAGE);
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // PASSWORD LOGIN
  // ─────────────────────────────────────────────────────────────

  const handlePasswordLogin = async (e) => {
    e.preventDefault();

    setLoading(true);
    setError("");
    setInfo("");

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

          credentials: isAdmin
            ? "include"
            : "same-origin",

          body: JSON.stringify(
            isAdmin
              ? {
                  username: email.trim(),
                  password,
                }
              : {
                  email: email.trim(),
                  password,
                }
          ),
        }
      );

      const data = await readApiResponse(response);

      console.log(
        "[Login] Password login response:",
        data
      );

      // ─────────────────────────────────────────────
      // ADMIN LOGIN
      // ─────────────────────────────────────────────

      if (isAdmin) {
        if (response.ok && data.success !== false) {
          localStorage.setItem(
            "adminAuthenticated",
            "true"
          );

          localStorage.setItem(
            "adminUser",
            "Admin"
          );

          if (data.token) {
            localStorage.setItem(
              "adminToken",
              data.token
            );
          }

          navigate("/manage");
        } else {
          setError(
            data.message ||
              "Invalid admin credentials"
          );
        }

        return;
      }

      // ─────────────────────────────────────────────
      // CANDIDATE PASSWORD SETUP
      // ─────────────────────────────────────────────

      if (data.needsPasswordSetup) {
        setStep("setup-password");

        setInfo(
          data.message ||
            "Please create your password."
        );

        return;
      }

      // ─────────────────────────────────────────────
      // SUCCESSFUL CANDIDATE LOGIN
      // ─────────────────────────────────────────────

      if (data.success && data.token) {
        await loginSuccess(
          data.token,
          email.trim(),
          data.user?.name
        );

        navigate("/");
      } else {
        setError(
          data.message || "Invalid credentials"
        );
      }
    } catch (err) {
      console.error(
        "[Login] Password login request failed:",
        err
      );

      setError(SYSTEM_UNREACHABLE_MESSAGE);
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // VERIFY OTP
  // ─────────────────────────────────────────────────────────────

  const handleVerifyOtp = async (e) => {
    e.preventDefault();

    if (otp.length < 6) {
      setError(
        "Please enter the 6-digit code"
      );

      return;
    }

    setLoading(true);
    setError("");
    setInfo("");

    console.log(
      "[Login] Verifying OTP for:",
      email
    );

    try {
      const response = await fetch(
        `${API_BASE}/api/auth/verify-otp`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },

          body: JSON.stringify({
            email,
            otp,
            isNewApp: true,
          }),
        }
      );

      const data = await readApiResponse(response);

      console.log(
        "[Login] OTP verify response:",
        data
      );

      if (data.success && data.token) {
        console.log(
          "[Login] OTP verified, calling loginSuccess"
        );

        await loginSuccess(
          data.token,
          email,
          data.user?.name
        );

        console.log(
          "[Login] loginSuccess completed"
        );

        navigate("/");
      } else if (data.needsPasswordSetup) {
        setStep("setup-password");

        setInfo(
          "Please set up your password."
        );

        console.log(
          "[Login] Needs password setup"
        );
      } else {
        setError(
          data.message || "Invalid code"
        );

        console.log(
          "[Login] OTP verify failed:",
          data.message
        );
      }
    } catch (err) {
      console.error(
        "[Login] OTP verification request failed:",
        err
      );

      setError(SYSTEM_UNREACHABLE_MESSAGE);
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // SETUP PASSWORD
  // ─────────────────────────────────────────────────────────────

  const handleSetupPassword = async (e) => {
    e.preventDefault();

    setError("");
    setInfo("");

    if (newPassword !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    if (newPassword.length < 8) {
      setError(
        "Password must be at least 8 characters"
      );

      return;
    }

    setLoading(true);

    console.log(
      "[Login] Setting up password for:",
      email
    );

    try {
      const response = await fetch(
        `${API_BASE}/api/auth/setup-password`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },

          body: JSON.stringify({
            email,
            password: newPassword,
            confirmPassword,
            setupToken,
          }),
        }
      );

      const data = await readApiResponse(response);

      console.log(
        "[Login] Setup password response:",
        data
      );

      if (data.success && data.token) {
        console.log(
          "[Login] Password setup complete, calling loginSuccess"
        );

        await loginSuccess(
          data.token,
          email,
          data.user?.name
        );

        console.log(
          "[Login] loginSuccess completed"
        );

        navigate("/");
      } else {
        setError(
          data.message ||
            "Failed to set password"
        );

        console.log(
          "[Login] Setup password failed:",
          data.message
        );
      }
    } catch (err) {
      console.error(
        "[Login] Setup password request failed:",
        err
      );

      setError(SYSTEM_UNREACHABLE_MESSAGE);
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // RESEND OTP
  // ─────────────────────────────────────────────────────────────

  const handleResend = async () => {
    setError("");
    setInfo("");

    try {
      const response = await fetch(
        `${API_BASE}/api/auth/resend-otp`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },

          body: JSON.stringify({
            email,
          }),
        }
      );

      const data = await readApiResponse(response);

      if (data.success === false) {
        setError(
          data.message ||
            SYSTEM_UNREACHABLE_MESSAGE
        );

        return;
      }

      setInfo(
        data.message ||
          "A new code has been sent."
      );
    } catch (err) {
      console.error(
        "[Login] Resend OTP request failed:",
        err
      );

      setError(SYSTEM_UNREACHABLE_MESSAGE);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">

        {/* ─────────────────────────────────────────────
            LOGO
        ───────────────────────────────────────────── */}

        <div className="text-center mb-8">
          <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center mx-auto mb-4">
            <span className="text-primary-foreground font-bold text-lg">
              ICP
            </span>
          </div>

          <h1 className="text-2xl font-bold">
            Candidate Portal
          </h1>

          <p className="text-sm text-muted-foreground mt-1">
            Infinity Care Partners
          </p>
        </div>

        {/* ─────────────────────────────────────────────
            ERROR MESSAGE
        ───────────────────────────────────────────── */}

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg mb-4">
            {error}
          </p>
        )}

        {/* ─────────────────────────────────────────────
            INFO MESSAGE
        ───────────────────────────────────────────── */}

        {info && (
          <p className="text-sm text-emerald-700 bg-emerald-50 p-3 rounded-lg mb-4">
            {info}
          </p>
        )}

        {/* ─────────────────────────────────────────────
            LOGIN FLOW
        ───────────────────────────────────────────── */}

        <>

          {/* EMAIL */}

          {step === "email" && (
            <form
              onSubmit={handleCheckEmail}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="email">
                  Email Address
                </Label>

                <Input
                  id="email"
                  type="text"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  required
                  placeholder="you@example.com"
                  className="mt-1"
                  autoFocus
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
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
                <Link
                  to="/forgot-password"
                  className="text-sm text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
            </form>
          )}

          {/* PASSWORD */}

          {step === "password" && (
            <form
              onSubmit={handlePasswordLogin}
              className="space-y-4"
            >
              <p className="text-sm text-muted-foreground text-center">
                Sign in as{" "}
                <strong>{email}</strong>
              </p>

              <div className="space-y-2">
                <Label htmlFor="password">
                  Password
                </Label>

                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  required
                  className="mt-1"
                  autoFocus
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Sign In"
                )}
              </Button>

              <div className="flex justify-between text-sm">
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() => {
                    setStep("email");
                    setPassword("");
                    setError("");
                    setInfo("");
                  }}
                >
                  ← Change email
                </button>

                {email !== "Admin" && (
                  <Link
                    to="/forgot-password"
                    className="text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                )}
              </div>
            </form>
          )}

          {/* OTP */}

          {step === "otp" && (
            <form
              onSubmit={handleVerifyOtp}
              className="space-y-4"
            >
              <p className="text-sm text-muted-foreground text-center">
                Enter the 6-digit code sent to{" "}
                <strong>{email}</strong>
              </p>

              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={otp}
                  onChange={setOtp}
                >
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

              <Button
                type="submit"
                className="w-full"
                disabled={
                  loading ||
                  otp.length < 6
                }
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Verify Code"
                )}
              </Button>

              <div className="flex justify-between text-sm">
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() => {
                    setStep("email");
                    setOtp("");
                    setError("");
                    setInfo("");
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

          {/* PASSWORD SETUP */}

          {step === "setup-password" && (
            <form
              onSubmit={handleSetupPassword}
              className="space-y-4"
            >
              <p className="text-sm text-muted-foreground text-center">
                Create a password for your account
              </p>

              <p className="text-xs text-muted-foreground text-center -mt-2">
                {email}
              </p>

              <div className="space-y-2">
                <Label htmlFor="newPassword">
                  New Password
                </Label>

                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) =>
                    setNewPassword(
                      e.target.value
                    )
                  }
                  required
                  minLength={8}
                  className="mt-1"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">
                  Confirm Password
                </Label>

                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) =>
                    setConfirmPassword(
                      e.target.value
                    )
                  }
                  required
                  className="mt-1"
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Set Password & Sign In"
                )}
              </Button>

              <div className="flex justify-center">
                <button
                  type="button"
                  className="text-sm text-primary hover:underline"
                  onClick={() => {
                    setStep("email");

                    setNewPassword("");
                    setConfirmPassword("");

                    setError("");
                    setInfo("");

                    setSetupToken("");
                  }}
                >
                  ← Change email
                </button>
              </div>
            </form>
          )}
        </>

        {/* ─────────────────────────────────────────────
            SUPPORT
        ───────────────────────────────────────────── */}

        <div className="mt-6 text-center">
          <a
            href="https://mail.google.com/mail/?view=cm&fs=1&to=itassistant%40infinitycarepartners.com&su=Login%20support%20request"
            target="_blank"
            rel="noreferrer"
            className="text-sm text-primary hover:underline"
          >
            Need help? Contact our support team
          </a>
        </div>

        {/* Separate admin login removed.
            Type "Admin" in the email field. */}

      </div>
    </div>
  );
}