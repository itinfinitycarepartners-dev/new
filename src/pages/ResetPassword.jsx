// @ts-nocheck
// src/pages/ResetPassword.jsx
import { useEffect, useState } from "react";
import { auth } from "@/api/icpClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

export default function ResetPassword() {
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState(
    location.state?.email ||
    sessionStorage.getItem("password_reset_email") ||
    ""
  );
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState(
    location.state?.codeSent ? "A reset code was sent to your email." : ""
  );

  useEffect(() => {
    if (email) sessionStorage.setItem("password_reset_email", email.trim().toLowerCase());
  }, [email]);

  const handleReset = async (event) => {
    event.preventDefault();
    setError("");
    setInfo("");

    if (!email.trim()) return setError("Enter your email.");
    if (otp.length !== 6) return setError("Enter the six-digit reset code.");
    if (newPassword.length < 8) return setError("Password must be at least eight characters.");
    if (newPassword !== confirmPassword) return setError("Passwords do not match.");

    setLoading(true);
    try {
      const result = await auth.resetPassword({
        email: email.trim().toLowerCase(),
        otp,
        newPassword,
        confirmPassword
      });
      if (result?.success === false) {
        throw new Error(result.message || result.error || "Password reset failed");
      }

      sessionStorage.removeItem("password_reset_email");
      navigate("/login", {
        replace: true,
        state: { passwordReset: true, email: email.trim().toLowerCase() }
      });
    } catch (error) {
      setError(error.message || "Password reset failed");
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    if (!email.trim()) return setError("Enter your email first.");
    setResending(true);
    setError("");
    try {
      await auth.forgotPassword(email.trim().toLowerCase());
      setInfo("A new reset code has been sent.");
      setOtp("");
    } catch (error) {
      setError(error.message || "Unable to resend code");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center mx-auto mb-4">
            <span className="text-primary-foreground font-bold text-lg">ICP</span>
          </div>
          <h1 className="text-2xl font-bold">Enter Reset Code</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Enter the code from your email and choose a new password.
          </p>
        </div>

        <form onSubmit={handleReset} className="space-y-4">
          {error && <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">{error}</p>}
          {info && <p className="text-sm text-emerald-700 bg-emerald-50 p-3 rounded-lg">{info}</p>}

          <div>
            <Label htmlFor="reset-email">Email</Label>
            <Input
              id="reset-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="mt-1"
            />
          </div>

          <div className="space-y-2">
            <Label>Six-Digit Reset Code</Label>
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
          </div>

          <div>
            <Label htmlFor="new-password">New Password</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              minLength={8}
              required
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="confirm-password">Confirm New Password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              minLength={8}
              required
              className="mt-1"
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loading || otp.length !== 6}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reset Password"}
          </Button>

          <div className="flex justify-between text-sm">
            <Link to="/login" className="text-primary hover:underline">Back to sign in</Link>
            <button
              type="button"
              onClick={resendCode}
              disabled={resending}
              className="text-primary hover:underline disabled:opacity-50"
            >
              {resending ? "Sending..." : "Resend code"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}