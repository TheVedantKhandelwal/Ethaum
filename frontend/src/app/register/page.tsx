"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { register, login } from "@/lib/api";
import { setTokens } from "@/lib/auth";
import { useUser } from "@/lib/user-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export default function RegisterPage() {
  const router = useRouter();
  const { refreshUser } = useUser();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"buyer" | "vendor">("buyer");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register({ name, email, password, role });
      const tokens = await login({ email, password });
      setTokens(tokens.access_token, tokens.refresh_token);
      await refreshUser();
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center p-4">
      <Card className="w-full max-w-md !p-8">
        <h1 className="mb-1 text-2xl font-bold text-surface-950">Create your account</h1>
        <p className="mb-6 text-sm text-surface-600">Join the AI-powered SaaS marketplace</p>

        {error && (
          <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" required />
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
          <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 characters" minLength={6} required />

          <div>
            <label className="mb-2 block text-sm font-medium text-surface-800">I am a...</label>
            <div className="grid grid-cols-2 gap-3">
              {(["buyer", "vendor"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`rounded-lg border px-4 py-2.5 text-sm font-medium transition ${
                    role === r
                      ? "border-brand-500 bg-brand-600/15 text-brand-400"
                      : "border-surface-400 text-surface-700 hover:border-surface-500"
                  }`}
                >
                  {r === "buyer" ? "Buyer" : "Founder / Vendor"}
                </button>
              ))}
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Creating account..." : "Create account"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-surface-600">
          Already have an account?{" "}
          <Link href="/login" className="text-brand-400 hover:text-brand-300">Sign in</Link>
        </p>
      </Card>
    </div>
  );
}
