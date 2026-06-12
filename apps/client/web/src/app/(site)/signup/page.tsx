"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { TrendingUp, Mail, Lock, User, AlertCircle, CheckCircle2 } from "lucide-react";
import { GoogleAuthButton } from "@/components/shared/google-auth-button";
import { AuthMethodDivider } from "@/components/shared/auth-method-divider";
import { useI18n } from "@/lib/i18n/context";
import { LanguageSwitcher } from "@/components/shared/language-switcher";

export default function SignupPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    if (!supabase) {
      setError(t("auth.authNotConfigured"));
      setLoading(false);
      return;
    }
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
        <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
          <LanguageSwitcher />
        </div>
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold">{t("signup.accountCreated")}</h1>
          <p className="mt-2 text-muted-foreground">{t("signup.checkEmail")}</p>
          <Button
            className="mt-6 bg-emerald-600 hover:bg-emerald-700"
            onClick={() => router.push("/login")}
          >
            {t("signup.goLogin")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
      <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
        <LanguageSwitcher />
      </div>
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="mb-6 inline-flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white">
              <TrendingUp className="h-5 w-5" />
            </div>
            <span className="text-2xl font-bold tracking-tight">Matrix</span>
          </Link>
          <h1 className="mt-4 text-2xl font-bold">{t("auth.createTitle")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("auth.createSub")}</p>
        </div>

        <Card>
          <CardContent className="space-y-6 p-6">
            <div className="space-y-4">
              <GoogleAuthButton nextPath="/dashboard" className="w-full" />
              <AuthMethodDivider>{t("auth.signupDivider")}</AuthMethodDivider>
            </div>

            <form onSubmit={handleSignup} className="space-y-4">
              {error && (
                <Alert variant="destructive" className="text-sm">
                  <AlertCircle className="h-4 w-4" />
                  <span className="ml-2">{error}</span>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">{t("auth.fullName")}</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    placeholder={t("auth.namePlaceholder")}
                    className="pl-10"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{t("auth.email")}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@email.com"
                    className="pl-10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t("auth.password")}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder={t("auth.passwordMinPlaceholder")}
                    className="pl-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                disabled={loading}
              >
                {loading ? t("auth.creating") : t("auth.createAccount")}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {t("auth.hasAccount")}{" "}
          <Link
            href="/login"
            className="font-medium text-emerald-600 hover:text-emerald-500"
          >
            {t("auth.logIn")}
          </Link>
        </p>
      </div>
    </div>
  );
}
