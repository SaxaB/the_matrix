# infra/cloudflared

Cloudflare Tunnel (tier gratuito): expone web y gateway de Telegram sin abrir
puertos en el router.

**Bloqueado por la decisión #9 del diseño** (dominio del cliente web). Cuando
se decida:

1. Cloudflare Zero Trust → Networks → Tunnels → *Create tunnel* (conector Docker).
2. Copiar el token a `TUNNEL_TOKEN` en `.env`.
3. Definir los public hostnames del tunnel (en el dashboard de Cloudflare):
   - `api.<dominio>` → `http://kong:8000` (Supabase API; necesario para auth/Realtime desde fuera)
   - `<dominio>` → `http://web:3000` (cuando exista la web, F2)
4. Arrancar con el perfil: `docker compose --profile tunnel up -d`

El servicio `cloudflared` está definido en el compose raíz bajo el perfil
`tunnel`, así el stack F0 funciona en LAN sin necesidad de tener el tunnel creado.
