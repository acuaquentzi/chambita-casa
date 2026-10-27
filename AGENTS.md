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
