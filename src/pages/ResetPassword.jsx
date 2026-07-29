import { useState } from "react";
import { auth } from "@/api/icpClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [step, setStep] = useState("email"); // email | reset
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRequestCode = async (e) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      await auth.forgotPassword(email);
      setStep("reset");
    } catch (err) {
      setError(err.message || "Failed to send code");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords don't match"); return; }
    setLoading(true); setError("");
    try {
      await auth.resetPassword(email, otp, password, confirm);
      navigate("/login");
    } catch (err) {
      setError(err.message || "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-6">Set New Password</h1>
        {error && <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg mb-4">{error}</p>}

        {step === "email" ? (
          <form onSubmit={handleRequestCode} className="space-y-4">
            <div><Label>Email</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="mt-1" /></div>
            <Button type="submit" className="w-full" disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Reset Code"}</Button>
            <p className="text-center text-sm"><Link to="/login" className="text-primary hover:underline">Back to sign in</Link></p>
          </form>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">Enter the code sent to <strong>{email}</strong></p>
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                <InputOTPGroup>{[0,1,2,3,4,5].map(i => <InputOTPSlot key={i} index={i} />)}</InputOTPGroup>
              </InputOTP>
            </div>
            <div><Label>New Password</Label><Input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} className="mt-1" /></div>
            <div><Label>Confirm Password</Label><Input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required className="mt-1" /></div>
            <Button type="submit" className="w-full" disabled={loading || otp.length < 6}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reset Password"}</Button>
          </form>
        )}
      </div>
    </div>
  );
}
