import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const categoryColors: Record<string, string> = {
  infrastructure: "#3b82f6",
  service: "#22c55e",
  milestone: "#8b5cf6",
  fix: "#f59e0b",
  documentation: "#6b7280",
  network: "#06b6d4",
  storage: "#f97316",
}

export const categoryIcons: Record<string, string> = {
  infrastructure: "Server",
  service: "Box",
  milestone: "Trophy",
  fix: "Wrench",
  documentation: "FileText",
  network: "Network",
  storage: "HardDrive",
}

export function formatDate(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

export function formatDateShort(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  })
}

export function getYearMonth(date: Date | string): string {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '')
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length) + '...'
}
