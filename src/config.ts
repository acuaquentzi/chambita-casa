// Las dos personas que usan la app. El correo debe coincidir con el de supabase/schema.sql (tabla members).
export const MEMBERS = [
  { name: 'Alejandro', email: 'alecuaquentzi@gmail.com', color: 'bg-indigo-500' },
  { name: 'Pareja', email: 'tjacky06@gmail.com', color: 'bg-pink-500' },
]

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string
