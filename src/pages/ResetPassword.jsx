// @ts-nocheck
// src/pages/ResetPassword.jsx
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot
} from "@/components/ui/input-otp";


const AZURE_API_BASE =
  "https://icpcandidateportal-bve7d5bpdnftfbbc.centralus-01.azurewebsites.net";

function getApiBase() {
  const configured = String(
    import.meta.env.VITE_API_BASE_URL || ""
  )
    .trim()
    .replace(/\/+$/, "");

  const isLocalBrowser =
    typeof window !== "undefined" &&
    ["localhost", "127.0.0.1"].includes(
      window.location.hostname
    );

  // A production build accidentally compiled with localhost is a common cause
  // of browser "Failed to fetch". Ignore localhost in a deployed browser.
  if (
    configured &&
    (
      isLocalBrowser ||
      !/^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/i.test(configured)
    )
  ) {
    return configured;
  }

  return AZURE_API_BASE;
}

async function authPost(path, payload, timeoutMs = 20000) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(
    () => controller.abort(),
    timeoutMs
  );

  try {
    const response = await fetch(
      `${getApiBase()}${path}`,
      {
        method:"POST",
        mode:"cors",
        credentials:"include",
        signal:controller.signal,
        headers:{
          "Content-Type":"application/json",
          Accept:"application/json"
        },
        body:JSON.stringify(payload)
      }
    );

    const data = await response
      .json()
      .catch(() => ({}));

    if (!response.ok || data?.success === false) {
      throw new Error(
        data?.message ||
        data?.error ||
        `Request failed (${response.status}).`
      );
    }

    return data;
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(
        "The server took too long to respond. Please try again."
      );
    }

    if (
      error instanceof TypeError ||
      /failed to fetch|networkerror|network request failed/i.test(
        String(error?.message || "")
      )
    ) {
      throw new Error(
        "Unable to reach the ICP server. Check your internet connection and try again."
      );
    }

    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}


export default function ResetPassword() {
  const location = useLocation();
  const navigate = useNavigate();

  const [email, setEmail] = useState(
    location.state?.email ||
    sessionStorage.getItem("password_reset_email") ||
    ""
  );
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] =
    useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] =
    useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState(
    location.state?.message ||
    (
      location.state?.codeSent
        ? "A reset code was sent to your email."
        : ""
    )
  );

  useEffect(() => {
    if (email) {
      sessionStorage.setItem(
        "password_reset_email",
        email.trim().toLowerCase()
      );
    }
  }, [email]);

  useEffect(() => {
    if (
      location.state?.codeSent ||
      location.state?.message
    ) {
      navigate(
        location.pathname,
        {
          replace:true,
          state:{}
        }
      );
    }
  }, [
    location.state,
    location.pathname,
    navigate
  ]);

  const handleReset = async event => {
    event.preventDefault();

    setError("");
    setInfo("");

    const normalizedEmail =
      String(email || "").trim().toLowerCase();

    const cleanOtp =
      String(otp || "")
        .replace(/\D/g, "")
        .slice(0, 6);

    if (!normalizedEmail) {
      setError("Enter your email.");
      return;
    }

    if (cleanOtp.length !== 6) {
      setError(
        "Enter the six-digit reset code."
      );
      return;
    }

    if (newPassword.length < 8) {
      setError(
        "Password must be at least eight characters."
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const result = await authPost(
        "/api/auth/reset-password",
        {
          email:normalizedEmail,
          otp:cleanOtp,
          newPassword,
          confirmPassword
        },
        22000
      );

      sessionStorage.removeItem(
        "password_reset_email"
      );

      navigate(
        "/login",
        {
          replace:true,
          state:{
            passwordReset:true,
            email:normalizedEmail,
            message:
              result?.message ||
              "Your password has been reset."
          }
        }
      );
    } catch (error) {
      console.error(
        "[ResetPassword] Error:",
        error
      );

      setError(
        error?.message ||
        "Password reset failed."
      );
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    const normalizedEmail =
      String(email || "").trim().toLowerCase();

    if (!normalizedEmail) {
      setError("Enter your email first.");
      return;
    }

    setResending(true);
    setError("");
    setInfo("");

    try {
      const result = await authPost(
        "/api/auth/forgot-password",
        { email:normalizedEmail },
        22000
      );

      setInfo(
        result?.message ||
        "A new reset code has been sent to your email."
      );
      setOtp("");
    } catch (error) {
      console.error(
        "[ResetPassword] Resend error:",
        error
      );

      setError(
        error?.message ||
        "Unable to resend code."
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center mx-auto mb-4">
            <span className="text-primary-foreground font-bold text-lg">
              ICP
            </span>
          </div>

          <h1 className="text-2xl font-bold">
            Enter Reset Code
          </h1>

          <p className="text-sm text-muted-foreground mt-1">
            Enter the code from your email and choose a new password.
          </p>
        </div>

        <form
          onSubmit={handleReset}
          className="space-y-4"
        >
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
              {error}
            </p>
          )}

          {info && (
            <p className="text-sm text-emerald-700 bg-emerald-50 p-3 rounded-lg">
              {info}
            </p>
          )}

          <div>
            <Label htmlFor="reset-email">
              Email
            </Label>
            <Input
              id="reset-email"
              type="email"
              value={email}
              onChange={event =>
                setEmail(event.target.value)
              }
              required
              autoComplete="email"
              className="mt-1"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label>
              Six-Digit Reset Code
            </Label>

            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={otp}
                onChange={value =>
                  setOtp(
                    String(value || "")
                      .replace(/\D/g, "")
                      .slice(0, 6)
                  )
                }
                disabled={loading}
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
          </div>

          <div>
            <Label htmlFor="new-password">
              New Password
            </Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={event =>
                setNewPassword(
                  event.target.value
                )
              }
              minLength={8}
              required
              autoComplete="new-password"
              className="mt-1"
              disabled={loading}
            />
          </div>

          <div>
            <Label htmlFor="confirm-password">
              Confirm New Password
            </Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={event =>
                setConfirmPassword(
                  event.target.value
                )
              }
              minLength={8}
              required
              autoComplete="new-password"
              className="mt-1"
              disabled={loading}
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={
              loading ||
              otp.length !== 6
            }
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Resetting...
              </>
            ) : (
              "Reset Password"
            )}
          </Button>

          <div className="flex justify-between text-sm">
            <Link
              to="/login"
              className="text-primary hover:underline"
            >
              Back to sign in
            </Link>

            <button
              type="button"
              onClick={resendCode}
              disabled={
                resending ||
                loading
              }
              className="text-primary hover:underline disabled:opacity-50"
            >
              {resending ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin inline mr-1" />
                  Sending...
                </>
              ) : (
                "Resend code"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
