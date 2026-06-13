"use client";

/**
 * Hub central de the_matrix (diseño §6bis): de "web de finanzas" a centro de
 * control de todos los agentes/dominios. Cada dominio es una tarjeta; las
 * activas enlazan a su sección, las planificadas se muestran como próximas.
 *
 * Es el punto de entrada tras login (ver middleware: redirige a /hub).
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  PieChart,
  PlaneTakeoff,
  FileLock2,
  MessageSquare,
  CalendarClock,
  CheckSquare,
  Home as HomeIcon,
  Car,
  Sprout,
  Briefcase,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";

type DomainStatus = "active" | "soon";

interface DomainCard {
  key: string;
  title: string;
  description: string;
  href: string | null;
  icon: React.ComponentType<{ className?: string }>;
  status: DomainStatus;
  accent: string;
}

const DOMAINS: DomainCard[] = [
  {
    key: "finance",
    title: "Finanzas",
    description: "Cartera, radar semanal, tesis y decisiones de inversión con saxa.",
    href: "/dashboard",
    icon: PieChart,
    status: "active",
    accent: "text-emerald-600",
  },
  {
    key: "travel",
    title: "90-day report",
    description: "Inmigración TH (TM47): te aviso, lo relleno y solo apruebas.",
    href: "/90-day",
    icon: PlaneTakeoff,
    status: "active",
    accent: "text-sky-600",
  },
  {
    key: "vault",
    title: "Documentos",
    description: "Pasaporte, visados, seguros: caducidades y recordatorios.",
    href: "/documentos",
    icon: FileLock2,
    status: "active",
    accent: "text-amber-600",
  },
  {
    key: "chat",
    title: "Chat con saxa",
    description: "Habla con tu agente sin Telegram: mercado, documentos, lo que sea.",
    href: "/chat",
    icon: MessageSquare,
    status: "active",
    accent: "text-violet-600",
  },
  {
    key: "calendar",
    title: "Calendario",
    description: "Agenda y eventos (Google). Próximamente.",
    href: null,
    icon: CalendarClock,
    status: "soon",
    accent: "text-slate-400",
  },
  {
    key: "tasks",
    title: "Tareas",
    description: "To-dos y recordatorios. Próximamente.",
    href: null,
    icon: CheckSquare,
    status: "soon",
    accent: "text-slate-400",
  },
  {
    key: "iot",
    title: "Hogar / IoT",
    description: "Sensores, cámaras, luces, clima. Próximamente.",
    href: null,
    icon: HomeIcon,
    status: "soon",
    accent: "text-slate-400",
  },
  {
    key: "car",
    title: "Coche (BYD)",
    description: "Batería, carga, preclimatización, ubicación. Próximamente.",
    href: null,
    icon: Car,
    status: "soon",
    accent: "text-slate-400",
  },
  {
    key: "cultivos",
    title: "Cultivos",
    description: "Huerto, riego, abono, calendario. Próximamente.",
    href: null,
    icon: Sprout,
    status: "soon",
    accent: "text-slate-400",
  },
  {
    key: "emprendimiento",
    title: "Emprendimiento",
    description: "Planes de negocio, KPIs, ventures. Próximamente.",
    href: null,
    icon: Briefcase,
    status: "soon",
    accent: "text-slate-400",
  },
];

export default function HubPage() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  const active = DOMAINS.filter((d) => d.status === "active");
  const soon = DOMAINS.filter((d) => d.status === "soon");

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-8">
        <h1 className="font-display text-5xl font-bold tracking-tight text-glow">
          Centro de control
        </h1>
        <p className="mt-1 text-muted-foreground">
          {email ? `Hola, ${email}. ` : ""}
          Tus agentes y aplicaciones, en un solo sitio.
        </p>
      </header>

      <section className="mb-10">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Activos
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {active.map((d) => (
            <DomainTile key={d.key} domain={d} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          En camino
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {soon.map((d) => (
            <DomainTile key={d.key} domain={d} />
          ))}
        </div>
      </section>
    </div>
  );
}

function DomainTile({ domain }: { domain: DomainCard }) {
  const Icon = domain.icon;
  const inner = (
    <Card
      className={
        "h-full transition " +
        (domain.status === "active"
          ? "hover:shadow-md hover:border-foreground/20 cursor-pointer"
          : "opacity-60")
      }
    >
      <CardContent className="flex h-full flex-col gap-3 p-5">
        <div className="flex items-center justify-between">
          <Icon className={"h-7 w-7 " + domain.accent} />
          {domain.status === "soon" ? (
            <Badge variant="secondary">Pronto</Badge>
          ) : (
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        <div>
          <h3 className="font-semibold">{domain.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{domain.description}</p>
        </div>
      </CardContent>
    </Card>
  );

  if (domain.href) {
    return <Link href={domain.href}>{inner}</Link>;
  }
  return inner;
}
