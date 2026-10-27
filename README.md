# Chambita Casa

Pendientes de casa para dos personas, instalable en iPhone.

## Configuración (una sola vez)
1. **Supabase → SQL Editor:** pega `supabase/schema.sql`, cambia los 2 correos y ejecuta (**Run**).
2. **Supabase → Authentication → Emails → Templates → Magic Link:** reemplaza el contenido por:
   `<h2>Tu código para Chambita Casa</h2><p style="font-size:24px"><b>{{ .Token }}</b></p>`
3. **Vercel → Add New → Project:** importa este repositorio y en *Environment Variables* agrega
   `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`. Luego **Deploy**.
4. **Supabase → Authentication → URL Configuration:** pon la dirección de Vercel en *Site URL*.

## Desarrollo local
```
npm install
cp .env.example .env.local   # y llena los valores
npm run dev
```

Instrucciones para agentes de código: ver `AGENTS.md`.
