"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  LOGIN_TARGET_ALLOCATOR,
  LOGIN_TARGET_TYCHI,
  LOGIN_TARGET_VAULT,
  getLoginTarget,
  normalizeLoginTarget,
  setLoginTargetCookie,
  type LoginTarget,
} from "@/lib/auth/login-target";
import { signInWithPassword } from "@/lib/auth/tychi-auth";
import { ApiClientError } from "@/lib/api-client";

const TABS: { key: LoginTarget; label: string }[] = [
  { key: LOGIN_TARGET_TYCHI, label: "Tychi" },
  { key: LOGIN_TARGET_VAULT, label: "Tychi Vault" },
  { key: LOGIN_TARGET_ALLOCATOR, label: "Allocator" },
];

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loginTarget, setLoginTarget] = useState<LoginTarget>(() =>
    normalizeLoginTarget(getLoginTarget()),
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitLabel = useMemo(() => {
    if (loginTarget === LOGIN_TARGET_VAULT) return "Continue to Vault";
    if (loginTarget === LOGIN_TARGET_TYCHI) return "Continue to Tychi";
    return "Continue to Allocator";
  }, [loginTarget]);

  function selectTab(next: LoginTarget) {
    setLoginTarget(next);
    setLoginTargetCookie(next);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signInWithPassword({
        email,
        password,
        loginTarget,
      });
      const next = searchParams.get("next");
      if (next && next.startsWith("/")) {
        router.replace(next);
        return;
      }
      router.replace("/fundlist");
    } catch (err) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Something went wrong during login";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-10">
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(1200px 600px at 20% 10%, #5b4fcf 0%, transparent 55%), radial-gradient(900px 500px at 90% 80%, #2a1f6e 0%, transparent 50%), linear-gradient(160deg, #1a1448 0%, #352a87 45%, #1b2458 100%)",
        }}
      />

      <div className="w-full max-w-[440px] rounded-2xl bg-white px-6 py-8 shadow-xl shadow-black/20 sm:px-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex items-center justify-center gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              Tychi
            </span>
            <span className="flex h-6 items-end gap-0.5">
              <span className="h-3 w-1.5 rounded-sm bg-[#534AB7]" />
              <span className="h-5 w-1.5 rounded-sm bg-[#534AB7]" />
              <span className="h-4 w-1.5 rounded-sm bg-[#7c73d4]" />
            </span>
          </div>
          <h1 className="text-lg font-bold uppercase tracking-wide text-slate-900">
            Sign In
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Choose where you want to sign in.
          </p>
        </div>

        <div className="mb-6 flex rounded-xl bg-slate-100 p-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => selectTab(tab.key)}
              className={cn(
                "flex-1 rounded-lg px-2 py-2 text-xs font-semibold transition sm:text-sm",
                loginTarget === tab.key
                  ? "bg-[#534AB7] text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value.toLowerCase())}
              required
              className="bg-slate-50"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <span className="text-xs text-slate-400">Reset password</span>
            </div>
            <Input
              id="password"
              type="password"
              autoComplete={remember ? "current-password" : "off"}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-slate-50"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-[#534AB7] focus:ring-[#534AB7]"
            />
            Remember me
          </label>

          {error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          ) : null}

          <Button
            type="submit"
            disabled={loading}
            className="h-11 w-full bg-[#352a87] hover:bg-[#2b226e]"
          >
            {loading ? "Signing in..." : submitLabel}
          </Button>
        </form>
      </div>
    </div>
  );
}
