import { useState } from "react";
import { useAuth, type UserRole } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { GraduationCap, AlertCircle, ShieldCheck } from "lucide-react";

export default function Login() {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("student");
  const [error, setError] = useState("");

  // 2FA state
  const [twoFAStep, setTwoFAStep] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [mockCode] = useState(() => String(Math.floor(100000 + Math.random() * 900000)));

  const triggerTwoFA = (onSuccess: () => void) => {
    setPendingAction(() => onSuccess);
    setTwoFAStep(true);
    setOtpValue("");
    setError("");
  };

  const verifyOTP = () => {
    if (otpValue === mockCode) {
      pendingAction?.();
      setTwoFAStep(false);
      setPendingAction(null);
    } else {
      setError("Invalid verification code. Please try again.");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (mode === "login") {
      // Pre-validate credentials before 2FA
      const users = JSON.parse(localStorage.getItem("academic-stream-users") || "[]");
      const found = users.find((u: any) => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
      if (!found) {
        setError("Invalid email or password");
        return;
      }
      triggerTwoFA(() => {
        const result = login(email, password);
        if (!result.success) setError(result.error || "Login failed");
      });
    } else {
      if (!name.trim()) { setError("Name is required"); return; }
      triggerTwoFA(() => {
        const result = signup(name.trim(), email, password, role);
        if (!result.success) setError(result.error || "Signup failed");
      });
    }
  };

  if (twoFAStep) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <div className="flex justify-center">
              <div className="p-3 rounded-xl bg-primary/10">
                <ShieldCheck className="h-8 w-8 text-primary" />
              </div>
            </div>
            <h1 className="font-display text-2xl font-bold">Two-Factor Authentication</h1>
            <p className="text-sm text-muted-foreground">Enter the 6-digit code to continue</p>
          </div>

          <Card>
            <CardContent className="pt-6 space-y-6">
              <div className="p-3 rounded-lg bg-muted text-center">
                <p className="text-xs text-muted-foreground mb-1">Your mock SMS code:</p>
                <p className="font-mono text-2xl font-bold tracking-[0.3em] text-primary">{mockCode}</p>
              </div>

              <div className="flex justify-center">
                <InputOTP maxLength={6} value={otpValue} onChange={setOtpValue}>
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

              {error && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <Button onClick={verifyOTP} disabled={otpValue.length !== 6} className="w-full">
                Verify Code
              </Button>

              <Button variant="ghost" className="w-full text-sm" onClick={() => { setTwoFAStep(false); setPendingAction(null); setError(""); }}>
                Back to {mode === "login" ? "Sign In" : "Sign Up"}
              </Button>
            </CardContent>
          </Card>

          <p className="text-[10px] text-center text-muted-foreground">
            ⚠️ This is mock 2FA — the code is shown above for demo purposes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="p-3 rounded-xl bg-primary/10">
              <GraduationCap className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="font-display text-2xl font-bold">Academic Stream</h1>
          <p className="text-sm text-muted-foreground">Learning Management System</p>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="font-display text-lg text-center">
              {mode === "login" ? "Sign In" : "Create Account"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "signup" && (
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" placeholder="Your full name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="you@university.edu" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>

              {mode === "signup" && (
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="admin">Admin / Instructor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full">
                {mode === "login" ? "Sign In" : "Create Account"}
              </Button>
            </form>

            <div className="mt-4 text-center text-sm text-muted-foreground">
              {mode === "login" ? (
                <p>Don't have an account?{" "}
                  <button onClick={() => { setMode("signup"); setError(""); }} className="text-primary font-medium hover:underline">Sign up</button>
                </p>
              ) : (
                <p>Already have an account?{" "}
                  <button onClick={() => { setMode("login"); setError(""); }} className="text-primary font-medium hover:underline">Sign in</button>
                </p>
              )}
            </div>

            <div className="mt-6 border-t border-border pt-4">
              <p className="text-xs text-muted-foreground text-center mb-3">Demo Accounts</p>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" className="text-xs" onClick={() => { setEmail("admin@university.edu"); setPassword("admin123"); setMode("login"); }}>
                  Admin Demo
                </Button>
                <Button variant="outline" size="sm" className="text-xs" onClick={() => { setEmail("alice@university.edu"); setPassword("student123"); setMode("login"); }}>
                  Student Demo
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-[10px] text-center text-muted-foreground">
          ⚠️ Mock authentication with 2FA simulation — not secure for production.
        </p>
      </div>
    </div>
  );
}
