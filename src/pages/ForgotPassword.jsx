import { useState } from "react";
import { auth } from "@/api/icpClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      await auth.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err.message || "Failed to send reset code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-2xl font-bold mb-2">Reset Password</h1>
        {sent ? (
          <div>
            <p className="text-sm text-muted-foreground mb-4">A reset code has been sent to your email. Use it on the reset page.</p>
            <Link to="/reset-password" className="text-primary hover:underline text-sm">Enter reset code →</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-left">
            {error && <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">{error}</p>}
            <p className="text-sm text-muted-foreground text-center">Enter your email and we'll send a reset code.</p>
            <div><Label>Email</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="mt-1" /></div>
            <Button type="submit" className="w-full" disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Reset Code"}</Button>
            <p className="text-center text-sm"><Link to="/login" className="text-primary hover:underline">Back to sign in</Link></p>
          </form>
        )}
      </div>
    </div>
  );
}
