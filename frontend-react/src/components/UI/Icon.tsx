import type { ReactNode, SVGProps } from "react"

export type IconName = "dashboard" | "ai" | "search" | "mail" | "summary" | "copy" | "shield" | "stop" | "refresh" | "check" | "send" | "close" | "trash" | "arrow-right" | "clients" | "prospects" | "products" | "services" | "quotes" | "invoices" | "reports" | "settings" | "revenue" | "paid" | "outstanding" | "conversion" | "calendar" | "arrow-up"

interface IconProps extends SVGProps<SVGSVGElement> { name: IconName; size?: number }

const paths: Record<IconName, ReactNode> = {
  dashboard: <><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></>,
  ai: <><path d="m12 3-1.15 3.1a4 4 0 0 1-2.35 2.35L5.4 9.6l3.1 1.15a4 4 0 0 1 2.35 2.35L12 16.2l1.15-3.1a4 4 0 0 1 2.35-2.35l3.1-1.15-3.1-1.15a4 4 0 0 1-2.35-2.35L12 3Z"/><path d="m19 16-.55 1.45A2.5 2.5 0 0 1 17 18.9l-1.45.55L17 20a2.5 2.5 0 0 1 1.45 1.45L19 23l.55-1.55A2.5 2.5 0 0 1 21 20l1.45-.55L21 18.9a2.5 2.5 0 0 1-1.45-1.45L19 16Z"/></>,
  search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></>,
  summary: <><path d="M4 5h16M4 10h16M4 15h10M4 20h7"/><path d="m17 17 1.5 1.5L22 15"/></>,
  copy: <><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></>,
  shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></>,
  stop: <rect x="7" y="7" width="10" height="10" rx="1"/>,
  refresh: <><path d="M20 7h-5V2"/><path d="M20 7a9 9 0 1 0 2 8"/></>,
  check: <path d="m5 12 4 4L19 6"/>,
  send: <><path d="m22 2-7 20-4-9-9-4 20-7Z"/><path d="M22 2 11 13"/></>,
  close: <><path d="m6 6 12 12M18 6 6 18"/></>,
  trash: <><path d="M3 6h18M8 6V4h8v2M19 6l-1 15H6L5 6M10 11v6M14 11v6"/></>,
  "arrow-right": <><path d="M5 12h14M13 6l6 6-6 6"/></>,
  clients: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
  prospects: <><circle cx="9" cy="8" r="4"/><path d="M2.5 21a6.5 6.5 0 0 1 13 0"/><circle cx="18" cy="8" r="3"/><path d="M18 3V1M18 15v-2M23 8h-2M15 8h-2"/></>,
  products: <><path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 17l9 5 9-5"/></>,
  services: <><path d="M14.7 6.3a4 4 0 0 0-5-5l2.1 2.1-2.4 2.4-2.1-2.1a4 4 0 0 0 5 5l7.1 7.1a2 2 0 0 1-2.8 2.8l-7.1-7.1"/><path d="m5 21 5.5-5.5"/></>,
  quotes: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h5"/></>,
  invoices: <><path d="M6 2h12v20l-3-2-3 2-3-2-3 2V2Z"/><path d="M9 8h6M9 12h6M9 16h3"/></>,
  reports: <><path d="M4 19V9M10 19V5M16 19v-7M22 19V2"/><path d="M2 22h22"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l-2.83 2.83a1.7 1.7 0 0 0-1.88-.34A1.7 1.7 0 0 0 14 20.93V21h-4v-.08A1.7 1.7 0 0 0 9 19.37a1.7 1.7 0 0 0-1.88.34l-2.83-2.83A1.7 1.7 0 0 0 4.63 15 1.7 1.7 0 0 0 3.08 14H3v-4h.08A1.7 1.7 0 0 0 4.63 9a1.7 1.7 0 0 0-.34-1.88l2.83-2.83A1.7 1.7 0 0 0 9 4.63 1.7 1.7 0 0 0 10 3.08V3h4v.08A1.7 1.7 0 0 0 15 4.63a1.7 1.7 0 0 0 1.88-.34l2.83 2.83A1.7 1.7 0 0 0 19.37 9 1.7 1.7 0 0 0 20.92 10H21v4h-.08A1.7 1.7 0 0 0 19.4 15Z"/></>,
  revenue: <><path d="M3 3v18h18"/><path d="m7 16 4-5 3 3 6-8"/></>,
  paid: <><circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/></>,
  outstanding: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  conversion: <><path d="M4 17 9 12l4 3 7-8"/><path d="M15 7h5v5"/></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></>,
  "arrow-up": <path d="m6 15 6-6 6 6"/>,
}

export default function Icon({ name, size = 18, ...props }: IconProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]}</svg>
}
