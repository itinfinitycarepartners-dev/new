// @ts-nocheck
import { useState } from "react";
import { auth } from "@/api/icpClient";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, ArrowRight } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

// ICP registration = same as first-time login: checkEmail → OTP → setup-password
export default function Register() {
  const { loginSuccess } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const handleCheckEmail = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await auth.checkEmail(email);
      if (res.requiresOTP) {
        setStep("otp");
        setInfo("A verification code has been sent to your email.");
      } else {
        // Already has a password — redirect to login
        navigate("/login");
      }
    } catch (err) {
      setError(err.message || "Email not found in our system. Please contact ICP.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await auth.verifyOTP(email, otp, true);
      if (res.needsPasswordSetup) {
        setStep("password");
      } else if (res.token) {
        await loginSuccess(res.token, email, res.user?.name);
        navigate("/");
      }
    } catch (err) {
      setError(err.message || "Invalid code");
    } finally {
      setLoading(false);
    }
  };

  const handleSetPassword = async (e) => {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords don't match");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await auth.setupPassword(email, password, confirm);
      if (res.success && res.token) {
        await loginSuccess(res.token, email, res.user?.name);
        navigate("/");
      }
    } catch (err) {
      setError(err.message || "Failed to set password");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setInfo("");
    try {
      await auth.resendOTP(email);
      setInfo("A new code has been sent.");
    } catch (err) {
      setError(err.message || "Failed to resend code");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center mx-auto mb-4">
            <span className="text-primary-foreground font-bold text-lg">ICP</span>
          </div>
          <h1 className="text-2xl font-bold">
            {step === "email" ? "Access Your Portal" : step === "otp" ? "Verify Email" : "Create Password"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {step === "email" ? "Enter the email address ICP has on file for you" : step === "otp" ? `Code sent to ${email}` : "Set a password for future logins"}
          </p>
        </div>

        {error && <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg mb-4">{error}</p>}
        {info  && <p className="text-sm text-emerald-700 bg-emerald-50 p-3 rounded-lg mb-4">{info}</p>}

        {step === "email" && (
          <form onSubmit={handleCheckEmail} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email"
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                className="mt-1" 
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continue"}
            </Button>
            <p className="text-center text-sm">
              Already set up? <Link to="/login" className="text-primary hover:underline">Sign in</Link>
            </p>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
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
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
            </Button>
            <Button 
              type="button" 
              variant="ghost" 
              className="w-full text-sm" 
              onClick={handleResend}
            >
              Resend code
            </Button>
          </form>
        )}

        {step === "password" && (
          <form onSubmit={handleSetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password"
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                minLength={8} 
                className="mt-1" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm Password</Label>
              <Input 
                id="confirm"
                type="password" 
                value={confirm} 
                onChange={(e) => setConfirm(e.target.value)} 
                required 
                className="mt-1" 
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Account"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}