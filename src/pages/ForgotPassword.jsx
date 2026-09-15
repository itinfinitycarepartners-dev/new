// @ts-nocheck
// src/pages/ForgotPassword.jsx
import { useState } from "react";
import { auth } from "@/api/icpClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    const normalizedEmail = email.trim().toLowerCase();
    
    // Basic client-side validation
    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const result = await auth.forgotPassword(normalizedEmail);
      
      if (result?.success === false) {
        throw new Error(result.message || result.error || "Failed to send reset code");
      }

      // Store email for the reset page
      sessionStorage.setItem("password_reset_email", normalizedEmail);
      
      // Show success briefly before navigating
      setSuccess("Reset code sent! Redirecting...");
      
      // Navigate to reset password page with state
      setTimeout(() => {
        navigate("/reset-password", {
          replace: true,
          state: { 
            email: normalizedEmail, 
            codeSent: true 
          }
        });
      }, 800);
      
    } catch (error) {
      console.error("[ForgotPassword] Error:", error);
      setError(error.message || "Failed to send reset code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center mx-auto mb-4">
            <span className="text-primary-foreground font-bold text-lg">ICP</span>
          </div>
          <h1 className="text-2xl font-bold">Reset Password</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Enter your email and we will send a six-digit reset code.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
            <Label htmlFor="reset-email">Email</Label>
            <Input
              id="reset-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoFocus
              className="mt-1"
              disabled={loading}
              placeholder="you@example.com"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
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
            <Link to="/login" className="text-primary hover:underline">
              Back to sign in
            </Link>
          </p>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground">
            Didn't receive the code? Check your spam folder or{" "}
            <button
              type="button"
              onClick={handleSubmit}
              className="text-primary hover:underline"
              disabled={loading || !email.trim()}
            >
              resend
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}