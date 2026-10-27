# AGENTS.md — Chambita Casa

Instrucciones para agentes de código (Codex, Claude Code, etc.). Léelas antes de cambiar algo.

## Qué es
App personal de pendientes para 2 personas (Alejandro y su pareja), hecha para usarse en iPhone como app instalada (PWA).
Vistas: Mis pendientes, Dashboard, Proyectos (áreas: Casa, Finanzas, Salud…), Tareas, Kanban, Gantt y Nosotros.
Todo el texto de la interfaz va en **español de México**.

## Stack
- React 18 + TypeScript + Vite + Tailwind + shadcn/ui (`src/components/ui`, no editar salvo necesidad).
- Supabase: inicio de sesión con correo y contraseña (sin envío de correos) y una sola tabla `docs` (ver `supabase/schema.sql`).
- Publicación: Vercel, automático con cada push o merge a `main`.

## Comandos
- `npm install`
- `npm run dev` — servidor local (requiere `.env.local`, ver `.env.example`).
- `npm run typecheck` — debe pasar sin errores antes de terminar.
- `npm run build` — debe compilar.

## Cómo están los datos
- `src/supabase.ts` imita una API de documentos (`db.collection(...)`, `db.doc(...)`, `onSnapshot`, `add`, `set`, `update`).
  Todo se guarda en `docs(path, coll, data jsonb)`. `update` usa el RPC `merge_doc`, que fusiona solo los campos enviados.
- Colecciones: `tasks`, `projects` (parches con solo los campos editados), `comments`, `activity`, `reschedules`,
  `metrics`, `profiles/<uid>`, `data/users/<uid>/prefs`.
- `src/store.ts` es el único lugar que lee/escribe datos. Los componentes reciben callbacks (`onUpdateTask`, etc.).
- `src/sheet.ts` tiene las áreas iniciales. `src/config.ts` define las 2 personas (nombre + correo).
- Salud, días restantes y KPIs se calculan en vivo (`src/data.ts`): "En riesgo" = vence en 3 días o menos.

## Reglas de negocio que no se deben romper
- Cerrar una tarea (estatus Completado o avance 100%) **siempre** pide un comentario de cierre (`CloseTaskDialog`, en `App.tsx`).
- Mover una fecha compromiso pide un motivo (`src/reschedule.tsx`).
- Las ediciones guardan solo los campos cambiados, para no pisar cambios de la otra persona.

## No hacer
- No subir claves ni `.env.local` al repositorio. Nunca usar la `service_role` key en el frontend.
- No agregar dependencias pesadas sin necesidad; la app debe abrir rápido en el teléfono.
- Si cambias el esquema de Supabase, agrega un archivo nuevo en `supabase/` con el SQL incremental y explícalo en el PR.

## Estilo
- Sigue el estilo del código existente: componentes funcionales, Tailwind, comentarios breves en español solo donde aporten.
- Diseño primero para móvil (375 px de ancho): nada debe desbordarse horizontalmente.

## Estado actual (27-oct-2026, al pasar de Claude Code a Codex)
- Publicada en https://chambita-casa.vercel.app (Vercel, se publica sola con cada merge a `main`).
- Supabase: proyecto `qktxfczkveciqamnzvdg`. `supabase/schema.sql` ya debería estar ejecutado; "Confirm email" apagado.
- Variables en Vercel: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (la segunda faltaba en el primer deploy).
- **Nunca se ha probado con Supabase real** lo que viene después del login. Lo primero es verificar:
  1. Crear contraseña y entrar con ambos correos.
  2. Crear área y tarea; que aparezcan en el otro teléfono sin recargar (realtime).
  3. Editar campos distintos de la misma tarea desde los dos lados (merge_doc no debe pisar).
  4. Cerrar tarea pide comentario; mover fecha pide motivo.
  5. Vista móvil (375 px) sin desbordes; instalación en iPhone desde Safari (Compartir → Agregar a inicio).
- Próximos pasos:
  1. Cambiar la identidad completa de la plataforma de **Chambita Casa** a **Marea**: nombre visible, textos, metadatos, manifiesto PWA y logotipo.
  2. Implementar tareas recurrentes (pagar luz, etc.).
  3. Después de validar el acceso familiar, apagar "Allow new users to sign up" en Supabase.
