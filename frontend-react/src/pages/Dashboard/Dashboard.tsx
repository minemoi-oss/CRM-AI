import StatCards from "./StatCards"
import RevenueChart from "./RevenueChart"
import RecentActivity from "./RecentActivity"
import RecentClients from "./RecentClients"

function Dashboard() {
  return (
    <div className="space-y-[14px]">

      {/* =====================
          STAT CARDS
      ===================== */}

      <StatCards
        cards={[
          {
            title: "Clients actifs",
            value: "128",
            change: "+12,5%",
            changeType: "positive",
            icon: "users",
          },
          {
            title: "Revenu mensuel",
            value: "24 580 €",
            change: "+8,2%",
            changeType: "positive",
            icon: "revenue",
          },
          {
            title: "Factures en attente",
            value: "14",
            change: "-3,1%",
            changeType: "negative",
            icon: "invoice",
          },
          {
            title: "Taux de conversion",
            value: "68,4%",
            change: "+5,7%",
            changeType: "positive",
            icon: "conversion",
          },
        ]}
      />

      {/* =====================
          CHART + ACTIVITY
      ===================== */}

      <div className="grid grid-cols-[1.5fr_1fr] gap-[14px]">

        <RevenueChart
          data={[
            {
              month: "Jan",
              value: 18500,
            },
            {
              month: "Fév",
              value: 21000,
            },
            {
              month: "Mar",
              value: 19500,
            },
            {
              month: "Avr",
              value: 23500,
            },
            {
              month: "Mai",
              value: 22000,
            },
            {
              month: "Juin",
              value: 24580,
            },
          ]}
        />

        <RecentActivity
          activities={[
            {
              id: 1,
              title: "Nouveau client",
              description: "Sophie Martin a été ajoutée",
              time: "Il y a 5 min",
              type: "client",
            },
            {
              id: 2,
              title: "Paiement reçu",
              description: "Facture #INV-1024",
              time: "Il y a 25 min",
              type: "payment",
            },
            {
              id: 3,
              title: "Nouvelle facture",
              description: "Facture #INV-1025 créée",
              time: "Il y a 1 h",
              type: "invoice",
            },
            {
              id: 4,
              title: "Email envoyé",
              description: "Relance client envoyée",
              time: "Il y a 2 h",
              type: "email",
            },
          ]}
        />

      </div>

      {/* =====================
          RECENT CLIENTS
      ===================== */}

      <RecentClients
        clients={[
          {
            id: 1,
            name: "Sophie Martin",
            email: "sophie@acme.fr",
            company: "Acme",
            status: "Actif",
          },
          {
            id: 2,
            name: "Thomas Bernard",
            email: "thomas@nova.fr",
            company: "Nova",
            status: "Actif",
          },
          {
            id: 3,
            name: "Julie Robert",
            email: "julie@tech.fr",
            company: "TechCorp",
            status: "En attente",
          },
          {
            id: 4,
            name: "Lucas Moreau",
            email: "lucas@digital.fr",
            company: "DigitalCo",
            status: "Actif",
          },
        ]}
      />

    </div>
  )
}

export default Dashboard