import { useEffect, useState } from "react"
import { getReports, type ReportData } from "../../Services/api"
import Icon, { type IconName } from "../../components/UI/Icon"
import RevenueChart from "../Dashboard/RevenueChart"

const money = (value: number) => value.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })

function Reports() {
  const [report, setReport] = useState<ReportData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [months, setMonths] = useState<6 | 12>(6)

  useEffect(() => {
    getReports(months).then(setReport).catch((reason) => setError(reason instanceof Error ? reason.message : "Chargement impossible"))
  }, [months])

  const cards: { label: string; value: string; note: string; icon: IconName; color: string; background: string }[] = report ? [
    { label: "Total facturé", value: money(report.total_invoiced), note: `${report.invoice_count} facture${report.invoice_count > 1 ? "s" : ""}`, icon: "revenue", color: "#2563EB", background: "#EFF6FF" },
    { label: "Total encaissé", value: money(report.total_paid), note: "Paiements confirmés", icon: "paid", color: "#16A34A", background: "#F0FDF4" },
    { label: "Reste à encaisser", value: money(report.outstanding), note: "Montant encore dû", icon: "outstanding", color: "#D97706", background: "#FFFBEB" },
    { label: "Taux de conversion", value: `${report.conversion_rate.toLocaleString("fr-FR")}%`, note: "Devis transformés", icon: "conversion", color: "#7C3AED", background: "#F5F3FF" },
  ] : []

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.20em] text-[#2563EB]">Analyse</p>
          <h1 className="mt-[8px] text-[30px] font-bold leading-none text-[#0F172A]">Rapports</h1>
          <p className="mt-[10px] text-[13px] text-[#64748B]">Suivez la performance financière et commerciale de votre entreprise.</p>
        </div>
        <div className="flex items-center gap-[8px] text-[10px] font-medium text-[#64748B]">
          <Icon name="calendar" size={15} className="text-[#2563EB]" /> Période analysée : {months} mois
        </div>
      </div>

      {error && <div className="mt-[20px] rounded-[8px] border border-red-200 bg-red-50 p-[16px] text-[11px] text-red-600">{error}</div>}
      {!report && !error && <div className="mt-[20px] animate-pulse rounded-[10px] border border-[#E2E8F0] bg-white p-[20px] text-[11px] text-[#64748B]">Chargement des rapports...</div>}

      {report && <>
        <div className="responsive-grid responsive-kpi-grid mt-[22px] grid grid-cols-4 gap-[14px] max-md:grid-cols-2">
          {cards.map((card) => (
            <article key={card.label} className="rounded-[10px] border border-[#E2E8F0] bg-white p-[16px] shadow-[0_4px_18px_rgba(15,23,42,0.04)]">
              <div className="flex items-start justify-between gap-3">
                <div><p className="text-[10px] font-medium text-[#64748B]">{card.label}</p><p className="mt-[9px] text-[20px] font-bold tracking-[-0.02em] text-[#0F172A]">{card.value}</p></div>
                <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[8px]" style={{ color: card.color, background: card.background }}><Icon name={card.icon} size={17} /></div>
              </div>
              <p className="mt-[10px] text-[9px] text-[#94A3B8]">{card.note}</p>
            </article>
          ))}
        </div>

        <div className="responsive-grid mt-[16px] grid grid-cols-[1.55fr_1fr] gap-[14px]">
          <RevenueChart data={report.monthly_revenues} period={months} onPeriodChange={(period) => { setError(null); setMonths(period) }} />
          <section className="rounded-[10px] border border-[#E2E8F0] bg-white p-[18px] shadow-[0_4px_18px_rgba(15,23,42,0.04)]">
            <div className="flex items-center gap-[9px]"><div className="flex h-[30px] w-[30px] items-center justify-center rounded-[7px] bg-[#EFF6FF] text-[#2563EB]"><Icon name="reports" size={15}/></div><div><h3 className="text-[12px] font-semibold text-[#0F172A]">Vue commerciale</h3><p className="mt-[2px] text-[9px] text-[#94A3B8]">Indicateurs clés</p></div></div>
            <div className="mt-[18px] space-y-[12px]">
              {[{ label: "Clients enregistrés", value: report.client_count, icon: "clients" as IconName }, { label: "Factures créées", value: report.invoice_count, icon: "invoices" as IconName }].map((item) => <div key={item.label} className="flex items-center justify-between rounded-[8px] bg-[#F8FAFC] p-[11px]"><span className="flex items-center gap-[8px] text-[10px] text-[#64748B]"><Icon name={item.icon} size={14} className="text-[#64748B]"/>{item.label}</span><strong className="text-[13px] text-[#0F172A]">{item.value}</strong></div>)}
              <div className="rounded-[8px] bg-[#EFF6FF] p-[12px]"><div className="flex justify-between text-[10px]"><span className="font-medium text-[#1D4ED8]">Conversion</span><strong className="text-[#2563EB]">{report.conversion_rate.toLocaleString("fr-FR")}%</strong></div><div className="mt-[8px] h-[5px] overflow-hidden rounded-full bg-[#DBEAFE]"><div className="h-full rounded-full bg-[#2563EB]" style={{ width: `${Math.min(100, report.conversion_rate)}%` }}/></div></div>
            </div>
          </section>
        </div>
      </>}
    </div>
  )
}

export default Reports
