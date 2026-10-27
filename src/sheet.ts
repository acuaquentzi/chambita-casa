// Áreas iniciales. Las tareas y cualquier área nueva viven en Supabase.
import type { ProjectMeta, BaseTask } from './data'
import { MEMBERS } from './config'

const START = '2026-10-27', TARGET = '2026-12-31'
const area = (id: string, name: string): ProjectMeta => ({ id, name, owner: MEMBERS[0].name, priority: 'Media', status: 'En curso', start: START, target: TARGET })

export const SHEET_PROJECTS: ProjectMeta[] = [
  area('P-01', 'Casa'), area('P-02', 'Finanzas'), area('P-03', 'Salud'), area('P-04', 'Trámites'), area('P-05', 'Varios'),
]
export const SHEET_TASKS: BaseTask[] = []
export const SNAPSHOT_DATE = '2026-10-27'
