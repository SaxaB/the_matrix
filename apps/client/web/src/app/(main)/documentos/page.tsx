"use client";

/**
 * Sección Documentos (dominio vault/P9). Metadatos de documentos personales:
 * caducidades y recordatorios. Los binarios NUNCA salen del host ni van a un
 * LLM (vault_gate); aquí solo se ven metadatos.
 */

import Link from "next/link";
import { FileLock2, CalendarClock, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const DOC_TYPES = [
  "identity",
  "immigration",
  "health",
  "insurance",
  "contract",
  "tax",
  "other",
];

export default function DocumentosPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-8 flex items-center gap-3">
        <FileLock2 className="h-8 w-8 text-amber-600" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Documentos</h1>
          <p className="text-muted-foreground">
            Pasaporte, visados, seguros y contratos: con sus caducidades.
          </p>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex flex-col gap-2 p-5">
            <CalendarClock className="h-6 w-6 text-amber-600" />
            <h3 className="font-semibold">Recordatorios de caducidad</h3>
            <p className="text-sm text-muted-foreground">
              saxa te avisa antes de que caduque el pasaporte, el visado o un
              seguro. «¿Cuándo caduca mi pasaporte?» lo respondes desde el chat.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-2 p-5">
            <ShieldCheck className="h-6 w-6 text-amber-600" />
            <h3 className="font-semibold">Privacidad máxima</h3>
            <p className="text-sm text-muted-foreground">
              Los ficheros no salen de tu servidor y nunca van a un modelo de IA.
              Solo se indexan metadatos (tipo, titular, fechas).
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardContent className="p-5">
          <h2 className="mb-3 font-semibold">Categorías</h2>
          <div className="flex flex-wrap gap-2">
            {DOC_TYPES.map((t) => (
              <Badge key={t} variant="secondary">
                {t}
              </Badge>
            ))}
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            La gestión de documentos (alta, fotos, búsqueda) está disponible en la
            app móvil; aquí verás el panel de caducidades cuando el agente esté
            conectado. Consulta lo que quieras desde el{" "}
            <Link href="/chat" className="underline">
              chat
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
