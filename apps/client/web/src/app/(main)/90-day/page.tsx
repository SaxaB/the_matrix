"use client";

/**
 * Sección 90-day report (dominio travel/P4). Resumen del ciclo TM47 y estado.
 * La gestión activa (rellenar + aprobar) ocurre por el chat/móvil; aquí va el
 * panel de seguimiento. Los datos en vivo llegan cuando el stack está arriba.
 */

import Link from "next/link";
import { PlaneTakeoff, Bell, FileCheck2, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const STEPS = [
  {
    icon: Bell,
    title: "Te aviso",
    body: "saxa calcula el vencimiento (90 días) y te avisa dentro de la ventana legal (15 días antes a 7 después).",
  },
  {
    icon: FileCheck2,
    title: "Lo relleno",
    body: "Abre el portal de inmigración con tu sesión, completa el formulario con tus datos y hace una captura.",
  },
  {
    icon: ShieldCheck,
    title: "Tú apruebas",
    body: "Recibes la captura en el chat y solo das a «Aprobar». Nada se envía sin tu confirmación.",
  },
];

export default function NinetyDayPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-8 flex items-center gap-3">
        <PlaneTakeoff className="h-8 w-8 text-sky-600" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">90-day report (TM47)</h1>
          <p className="text-muted-foreground">
            Notificación de residencia de inmigración tailandesa, sin que te ocupes.
          </p>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        {STEPS.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.title}>
              <CardContent className="flex flex-col gap-2 p-5">
                <Icon className="h-6 w-6 text-sky-600" />
                <h3 className="font-semibold">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.body}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="mt-6">
        <CardContent className="p-5">
          <h2 className="mb-2 font-semibold">Estado</h2>
          <p className="text-sm text-muted-foreground">
            El seguimiento en vivo (próximo vencimiento, historial de reports y
            aprobaciones pendientes) aparece aquí cuando el agente está conectado.
            Mientras tanto, gestiona y aprueba desde el{" "}
            <Link href="/chat" className="underline">
              chat con saxa
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
