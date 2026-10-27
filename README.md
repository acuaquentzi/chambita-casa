# Chambita Casa

Pendientes de casa para dos personas, instalable en iPhone.

## Configuración (una sola vez)
1. **Supabase → SQL Editor:** pega `supabase/schema.sql`, cambia los 2 correos y ejecuta (**Run**).
2. **Supabase → Authentication → Sign In / Providers → Email:** desactiva **Confirm email** y guarda.
   Cuando las dos personas ya hayan creado su contraseña, desactiva también **Allow new users to sign up**.
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
