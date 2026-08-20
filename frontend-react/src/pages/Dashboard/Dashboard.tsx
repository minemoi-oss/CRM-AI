import { useEffect, useState } from "react"
import { getDashboard, type DashboardData } from "../../Services/api"
import StatCards from "./StatCards"
import RevenueChart from "./RevenueChart"
import RecentActivity from "./RecentActivity"
import RecentClients from "./RecentClients"
import Icon from "../../components/UI/Icon"

function relativeTime(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000))
  if (minutes < 1) return "À l'instant"
  if (minutes < 60) return `Il y a ${minutes} min`
  if (minutes < 1440) return `Il y a ${Math.floor(minutes / 60)} h`
  return `Il y a ${Math.floor(minutes / 1440)} j`
}

type DashboardPage = "clients" | "quotes" | "invoices" | "reports"

function Dashboard({ onNavigate }: { onNavigate: (page: DashboardPage) => void }) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [months, setMonths] = useState<6 | 12>(6)
  const timezone = localStorage.getItem("mine_crm_timezone") ?? "Africa/Casablanca"
  const notificationsEnabled = localStorage.getItem("mine_crm_notifications") !== "false"

  useEffect(() => {
    getDashboard(months).then(setData).catch((reason) => setError(reason instanceof Error ? reason.message : "Chargement impossible"))
  }, [months])

  if (error) return <div className="rounded-[8px] border border-red-200 bg-red-50 p-[16px] text-[10px] text-red-600">{error}</div>
  if (!data) return <div className="rounded-[8px] border border-[#E2E8F0] bg-white p-[16px] text-[10px] text-[#64748B]">Chargement du dashboard...</div>

  return (
    <div>
      <div className="mb-[22px] flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#2563EB]">Vue d'ensemble</p>
          <h1 className="mt-[8px] text-[30px] font-bold text-[#0F172A]">Dashboard</h1>
          <p className="mt-[9px] text-[13px] text-[#64748B]">Tous vos indicateurs essentiels, en un coup d'œil.</p>
        </div>
        <div className="flex h-[36px] items-center gap-[8px] rounded-[8px] border border-[#E2E8F0] bg-white px-[12px] text-[10px] font-medium text-[#475569] shadow-sm">
          <Icon name="calendar" size={15} className="text-[#2563EB]" />
          {new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric", timeZone: timezone })}
        </div>
      </div>

      <div className="space-y-[14px]">
      {notificationsEnabled && data.pending_invoices > 0 && (
        <button type="button" onClick={() => onNavigate("invoices")} className="flex w-full items-center justify-between rounded-[8px] border border-[#FDE68A] bg-[#FFFBEB] px-[14px] py-[11px] text-left text-[10px] text-[#92400E] transition hover:bg-[#FEF3C7]">
          <span><strong>{data.pending_invoices} facture{data.pending_invoices > 1 ? "s" : ""}</strong> en attente de traitement.</span>
          <span className="font-semibold">Voir les factures →</span>
        </button>
      )}
      <StatCards cards={[
        { title: "Clients actifs", value: String(data.total_clients), change: "Données actualisées", changeType: "positive", icon: "users" },
        { title: "Revenu mensuel", value: data.monthly_revenue.toLocaleString("fr-FR", { style: "currency", currency: "EUR" }), change: "Mois actuel", changeType: "positive", icon: "revenue" },
        { title: "Factures en attente", value: String(data.pending_invoices), change: data.pending_invoices > 0 ? "À traiter" : "Tout est à jour", changeType: data.pending_invoices > 0 ? "negative" : "positive", icon: "invoice" },
        { title: "Taux de conversion", value: `${data.conversion_rate.toLocaleString("fr-FR")}%`, change: "Devis facturés", changeType: "positive", icon: "conversion" },
      ]} />

      <div className="responsive-grid grid grid-cols-[1.5fr_1fr] gap-[14px]">
        <RevenueChart data={data.monthly_revenues} period={months} onPeriodChange={(period) => { setError(null); setMonths(period) }} />
        <RecentActivity activities={data.recent_activities.map((activity) => ({ ...activity, time: relativeTime(activity.created_at) }))} />
      </div>

      <div className="grid grid-cols-4 gap-[10px] max-md:grid-cols-2">
        {[
          { label: "Gérer les clients", page: "clients" as const, icon: "clients" as const },
          { label: "Gérer les devis", page: "quotes" as const, icon: "quotes" as const },
          { label: "Voir les factures", page: "invoices" as const, icon: "invoices" as const },
          { label: "Ouvrir les rapports", page: "reports" as const, icon: "reports" as const },
        ].map((action) => (
          <button key={action.page} type="button" onClick={() => onNavigate(action.page)} className="flex h-[48px] items-center gap-[9px] rounded-[8px] border border-[#E2E8F0] bg-white px-[12px] text-left text-[10px] font-semibold text-[#334155] shadow-sm transition hover:border-[#BFDBFE] hover:bg-[#EFF6FF] hover:text-[#2563EB]">
            <Icon name={action.icon} size={16} className="shrink-0 text-[#2563EB]" /> {action.label}
          </button>
        ))}
      </div>

      <RecentClients clients={data.recent_clients} onViewAll={() => onNavigate("clients")} />
      </div>
    </div>
  )
}

export default Dashboard
