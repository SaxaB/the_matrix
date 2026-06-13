"use client";

/**
 * Sección Chat (C3, §14.6). Hablar con saxa desde la web — reemplaza Telegram
 * para uso personal. La UI viva (historial + Realtime + aprobaciones) se cablea
 * sobre chat.messages cuando el stack está arriba; aquí queda el marco.
 */

import { MessageSquare, ShieldCheck, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function ChatPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-8 flex items-center gap-3">
        <MessageSquare className="h-8 w-8 text-violet-600" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Chat con saxa</h1>
          <p className="text-muted-foreground">
            Tu agente, sin intermediarios. El mismo cerebro que responde por Telegram.
          </p>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex flex-col gap-2 p-5">
            <Zap className="h-6 w-6 text-violet-600" />
            <h3 className="font-semibold">Multi-dominio</h3>
            <p className="text-sm text-muted-foreground">
              «¿Qué pasa hoy en el mercado?», «¿cuándo caduca mi pasaporte?»,
              «prepara el 90-day report»: saxa enruta a cada agente.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-2 p-5">
            <ShieldCheck className="h-6 w-6 text-violet-600" />
            <h3 className="font-semibold">Aprobaciones aquí mismo</h3>
            <p className="text-sm text-muted-foreground">
              Las acciones sensibles (enviar un report, publicar una idea) llegan
              como tarjeta con captura y botón de aprobar.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardContent className="flex items-center gap-3 p-5">
          <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <p className="text-sm text-muted-foreground">
            El chat en vivo se activa cuando saxa está conectado (EQR6). Ya
            funciona en la app móvil con Realtime.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
