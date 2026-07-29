/**
 * formatters.ts
 * Utilidades de formato para moneda ARS y fechas en español (Argentina).
 */

/** Formatea un número como moneda ARS. Ej: 12500.5 → "$ 12.500,50" */
export function formatARS(amount: number | null | undefined): string {
  if (amount == null) return '$ 0,00'
  return new Intl.NumberFormat('es-AR', {
    style:    'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/** Formatea un número sin símbolo de moneda. Ej: 12500.5 → "12.500,50" */
export function formatNumber(value: number | null | undefined): string {
  if (value == null) return '0'
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

/** Formatea una fecha como texto legible en español. */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('es-AR', {
    day:   '2-digit',
    month: 'short',
    year:  'numeric',
  }).format(new Date(date))
}

/** Formatea una fecha incluyendo hora. */
export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('es-AR', {
    day:    '2-digit',
    month:  'short',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

/** Formatea un número como porcentaje. Ej: 0.25 → "+25.0%" */
export function formatPercent(value: number | null | undefined, showSign = false): string {
  if (value == null) return '0%'
  const sign = showSign && value > 0 ? '+' : ''
  return `${sign}${(value * 100).toFixed(1)}%`
}

/** Devuelve el inicio de hoy en ISO. */
export function todayStart(): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

/** Devuelve el inicio de hace N días en ISO. */
export function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

/** Devuelve el primer día del mes actual en ISO. */
export function startOfMonth(): string {
  const d = new Date()
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

/** Devuelve el primer día del año actual en ISO. */
export function startOfYear(): string {
  const d = new Date()
  d.setMonth(0, 1)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}
