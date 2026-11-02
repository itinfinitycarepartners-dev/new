// @ts-nocheck
// src/pages/ForgotPassword.jsx

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

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

  // In production, never allow a frontend build accidentally configured
  // with localhost to break password reset.
  if (
    configured &&
    (
      isLocalBrowser ||
      !/^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/i.test(
        configured
      )
    )
  ) {
    return configured;
  }

  return AZURE_API_BASE;
}

async function requestResetCode(email) {
  const controller = new AbortController();

  const timeoutId = window.setTimeout(
    () => controller.abort(),
    22000
  );

  try {
    const response = await fetch(
      `${getApiBase()}/api/auth/forgot-password`,
      {
        method: "POST",
        mode: "cors",
        credentials: "include",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          email
        })
      }
    );

    const data = await response
      .json()
      .catch(() => ({}));

    if (
      !response.ok ||
      data?.success === false
    ) {
      throw new Error(
        data?.message ||
        data?.error ||
        `Unable to send reset code (${response.status}).`
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
        "Unable to reach the ICP server. Please check your internet connection and try again."
      );
    }

    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [email, setEmail] = useState(
    sessionStorage.getItem(
      "password_reset_email"
    ) || ""
  );

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const sendResetCode = async (
    normalizedEmail
  ) => {
    const result =
      await requestResetCode(
        normalizedEmail
      );

    sessionStorage.setItem(
      "password_reset_email",
      normalizedEmail
    );

    return result;
  };

  const handleSubmit = async event => {
    event.preventDefault();

    const normalizedEmail =
      String(email || "")
        .trim()
        .toLowerCase();

    if (
      !normalizedEmail ||
      !normalizedEmail.includes("@")
    ) {
      setError(
        "Please enter a valid email address."
      );
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const result =
        await sendResetCode(
          normalizedEmail
        );

      setSuccess(
        result?.message ||
        "Reset code sent! Redirecting..."
      );

      window.setTimeout(() => {
        navigate(
          "/reset-password",
          {
            replace: true,
            state: {
              email: normalizedEmail,
              codeSent: true,
              message:
                result?.message ||
                "A reset code was sent to your email."
            }
          }
        );
      }, 600);
    } catch (error) {
      console.error(
        "[ForgotPassword] Error:",
        error
      );

      setError(
        error?.message ||
        "Failed to send reset code. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    const normalizedEmail =
      String(email || "")
        .trim()
        .toLowerCase();

    if (
      !normalizedEmail ||
      !normalizedEmail.includes("@")
    ) {
      setError(
        "Please enter a valid email address first."
      );
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const result =
        await sendResetCode(
          normalizedEmail
        );

      setSuccess(
        result?.message ||
        "A new reset code has been sent to your email."
      );
    } catch (error) {
      console.error(
        "[ForgotPassword] Resend error:",
        error
      );

      setError(
        error?.message ||
        "Unable to resend reset code."
      );
    } finally {
      setLoading(false);
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
            Reset Password
          </h1>

          <p className="text-sm text-muted-foreground mt-1">
            Enter your email and we will send a six-digit reset code.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
              {error}
            </p>
          )}

          {success && (
            <p className="text-sm text-emerald-700 bg-emerald-50 p-3 rounded-lg">
              {success}
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
                setEmail(
                  event.target.value
                )
              }
              required
              autoFocus
              autoComplete="email"
              className="mt-1"
              disabled={loading}
              placeholder="you@example.com"
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Sending...
              </>
            ) : (
              "Send Reset Code"
            )}
          </Button>

          <p className="text-center text-sm">
            <Link
              to="/login"
              className="text-primary hover:underline"
            >
              Back to sign in
            </Link>
          </p>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground">
            Didn't receive the code?
            Check your spam folder or{" "}
            <button
              type="button"
              onClick={handleResend}
              className="text-primary hover:underline disabled:opacity-50"
              disabled={
                loading ||
                !email.trim()
              }
            >
              resend
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
