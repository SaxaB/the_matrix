import Link from "next/link";
import {
  TrendingUp,
  ArrowRight,
  Shield,
  PieChart,
  Target,
  Telescope,
  BarChart3,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { getLocale } from "@/lib/i18n/server";
import { translateUi } from "@/lib/i18n/messages";
import { LanguageSwitcher } from "@/components/shared/language-switcher";

export default async function LandingPage() {
  const locale = await getLocale();
  const t = (path: string) => translateUi(locale, path);

  const steps = [
    {
      step: 1,
      title: t("landing.step1Title"),
      description: t("landing.step1Desc"),
    },
    {
      step: 2,
      title: t("landing.step2Title"),
      description: t("landing.step2Desc"),
    },
    {
      step: 3,
      title: t("landing.step3Title"),
      description: t("landing.step3Desc"),
    },
    {
      step: 4,
      title: t("landing.step4Title"),
      description: t("landing.step4Desc"),
    },
  ];

  const features = [
    {
      icon: Shield,
      title: t("landing.feat1Title"),
      description: t("landing.feat1Desc"),
    },
    {
      icon: PieChart,
      title: t("landing.feat2Title"),
      description: t("landing.feat2Desc"),
    },
    {
      icon: Target,
      title: t("landing.feat3Title"),
      description: t("landing.feat3Desc"),
    },
    {
      icon: Telescope,
      title: t("landing.feat4Title"),
      description: t("landing.feat4Desc"),
    },
  ];

  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-50 border-b bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:h-16 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white">
              <TrendingUp className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold tracking-tight sm:text-xl">
              Matrix
            </span>
          </Link>
          <div className="flex items-center gap-1 sm:gap-2">
            <LanguageSwitcher />
            <Link
              href="/login"
              className={buttonVariants({
                variant: "ghost",
                size: "sm",
                className: "text-sm",
              })}
            >
              {t("landing.signIn")}
            </Link>
            <Link
              href="/signup"
              className={buttonVariants({
                size: "sm",
                className:
                  "bg-emerald-600 text-sm hover:bg-emerald-700 sm:px-4",
              })}
            >
              {t("landing.signUp")}
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_50%_at_50%_-20%,rgba(16,185,129,0.12),transparent)]" />
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              {t("landing.heroA")}{" "}
              <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
                {t("landing.heroB")}
              </span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground sm:text-xl">
              {t("landing.heroSub")}
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              <Link
                href="/signup"
                className={buttonVariants({
                  size: "lg",
                  className:
                    "h-12 w-full bg-emerald-600 px-8 text-base font-semibold hover:bg-emerald-700 sm:w-auto",
                })}
              >
                {t("landing.ctaSignUp")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className={buttonVariants({
                  variant: "outline",
                  size: "lg",
                  className: "h-12 w-full px-8 text-base sm:w-auto",
                })}
              >
                {t("landing.ctaHasAccount")}
              </Link>
            </div>
          </div>

          <div className="mx-auto mt-20 max-w-4xl">
            <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">
              {t("landing.howTitle")}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-muted-foreground">
              {t("landing.howSub")}
            </p>
            <ol className="mt-12 space-y-6">
              {steps.map((item) => (
                <li
                  key={item.step}
                  className="rounded-2xl border bg-background/80 p-5 shadow-sm sm:p-6"
                >
                  <div className="flex items-center gap-4 sm:gap-5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                      {item.step}
                    </span>
                    <h3 className="min-w-0 flex-1 text-lg font-semibold leading-snug">
                      {item.title}
                    </h3>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:ml-14">
                    {item.description}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="border-t bg-muted/30 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {t("landing.featuresTitle")}
            </h2>
            <p className="mt-4 text-muted-foreground">{t("landing.featuresSub")}</p>
          </div>
          <div className="mx-auto mt-16 grid max-w-5xl gap-8 sm:grid-cols-2">
            {features.map((f) => (
              <div
                key={f.title}
                className="group rounded-2xl border bg-background p-8 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="mb-4 inline-flex rounded-xl bg-emerald-100 p-3 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-600 px-8 py-16 text-center text-white shadow-xl sm:px-16">
            <div className="relative z-10">
              <BarChart3 className="mx-auto mb-6 h-12 w-12 opacity-80" />
              <h2 className="text-3xl font-bold sm:text-4xl">
                {t("landing.ctaBannerTitle")}
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-emerald-100">
                {t("landing.ctaBannerSub")}
              </p>
              <Link
                href="/signup"
                className={buttonVariants({
                  size: "lg",
                  className:
                    "mt-8 h-12 bg-white px-8 text-base font-semibold text-emerald-700 hover:bg-emerald-50",
                })}
              >
                {t("landing.ctaSignUp")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t py-8">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-muted-foreground sm:px-6 lg:px-8">
          <div className="flex items-center justify-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            <span className="font-semibold text-foreground">Matrix</span>
          </div>
          <p className="mt-2">{t("landing.footerTagline")}</p>
          <p className="mt-1 text-xs text-muted-foreground/60">
            {t("landing.disclaimer")}
          </p>
        </div>
      </footer>
    </div>
  );
}
