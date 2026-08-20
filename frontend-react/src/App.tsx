import { useCallback, useEffect, useState } from "react"
import { checkBackend, getCompany, getCurrentUser, type CurrentUser } from "./Services/api"

import Clients from "./pages/Clients/Clients"
import Prospects from "./pages/Prospects/Prospects"
import Invoices from "./pages/Invoices/Invoices"
import Settings from "./pages/Settings/Settings"
import Dashboard from "./pages/Dashboard/Dashboard"
import AssistantAI from "./pages/AI/AssistantAI"
import Reports from "./pages/Reports/Reports"
import Quotes from "./pages/Quotes/Quotes"
import Products from "./pages/Products/Products"
import Services from "./pages/Services/Services"
import Onboarding from "./pages/Onboarding/Onboarding"
import Icon from "./components/UI/Icon"
import CopilotDrawer from "./components/AI/CopilotDrawer"
import type { CopilotActiveEntity, CopilotEntityType, CopilotNavigationTarget, CopilotPage } from "./Services/ai"
import { bootstrapAuth, hasPublicAuthAction, logout, onAuthStateChange } from "./Services/auth"


import Login from "./pages/Login/Login"



type Page = CopilotPage

const pageAliases: Record<string, Page> = {
  dashboard: "dashboard",
  ai: "ai",
  assistant: "ai",
  clients: "clients",
  customers: "clients",
  customer: "clients",
  prospects: "prospects",
  products: "products",
  product: "products",
  services: "services",
  service: "services",
  quotes: "quotes",
  quote: "quotes",
  devis: "quotes",
  invoices: "invoices",
  invoice: "invoices",
  factures: "invoices",
  facture: "invoices",
  reports: "reports",
  rapports: "reports",
  settings: "settings",
  parametres: "settings",
}

function normalizeEntityType(value: string): CopilotEntityType | undefined {
  const aliases: Record<string, CopilotEntityType> = {
    customer: "customer",
    client: "customer",
    prospect: "prospect",
    invoice: "invoice",
    facture: "invoice",
    quote: "quote",
    devis: "quote",
    service: "service",
    product: "product",
    produit: "product",
  }
  return aliases[value.toLowerCase()]
}


function App() {

  const [currentPage, setCurrentPage] =
    useState<Page>("dashboard")

  const [authenticated, setAuthenticated] = useState(false)
  const [publicAuthAction, setPublicAuthAction] = useState(hasPublicAuthAction)
  const [authChecked, setAuthChecked] = useState(() => hasPublicAuthAction())
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [companyReady, setCompanyReady] = useState<boolean | null>(null)
  const [logoutError, setLogoutError] = useState<string | null>(null)
  const [activeCopilotEntity, setActiveCopilotEntity] = useState<CopilotActiveEntity | null>(null)
  const [navigationTarget, setNavigationTarget] = useState<CopilotNavigationTarget | null>(null)

  const navigateTo = useCallback((page: Page) => {
    setCurrentPage(page)
    setNavigationTarget(null)
    setActiveCopilotEntity(null)
  }, [])

  const handleCopilotNavigation = useCallback((target: CopilotNavigationTarget) => {
    const page = pageAliases[target.page.toLowerCase()]
    if (!page) return
    const inferredEntityType: CopilotEntityType | undefined = page === "clients"
      ? "customer"
      : page === "invoices"
        ? "invoice"
        : page === "quotes"
          ? "quote"
          : page === "prospects"
            ? "prospect"
            : undefined
    const entityType = target.entity_type
      ? normalizeEntityType(target.entity_type)
      : target.entity_id
        ? inferredEntityType
        : undefined
    const normalizedTarget: CopilotNavigationTarget = { ...target, page, entity_type: entityType }
    setCurrentPage(page)
    setNavigationTarget(normalizedTarget)
    setActiveCopilotEntity(entityType && target.entity_id
      ? { type: entityType, id: target.entity_id, label: target.label }
      : null)
  }, [])

  const consumeNavigationTarget = useCallback(() => setNavigationTarget(null), [])




  useEffect(() => {
    checkBackend()
      .then((data) => {
        console.log("Backend connecté :", data)
      })
      .catch((error) => {
        console.error("Erreur Backend :", error)
      })

  }, [])

  useEffect(() => {
    let active = true
    const unsubscribe = onAuthStateChange((isAuthenticated) => {
      if (!active) return
      setAuthenticated(isAuthenticated)
      if (!isAuthenticated) {
        setCurrentUser(null)
        setCompanyReady(null)
        setCurrentPage("dashboard")
        setActiveCopilotEntity(null)
        setNavigationTarget(null)
      }
    })

    if (!publicAuthAction) {
      bootstrapAuth().then((isAuthenticated) => {
        if (!active) return
        setAuthenticated(isAuthenticated)
        setAuthChecked(true)
      })
    }

    return () => {
      active = false
      unsubscribe()
    }
  }, [publicAuthAction])

  useEffect(() => {
    if (!authenticated) return
    getCurrentUser().then(setCurrentUser).catch(() => undefined)
    getCompany().then(() => setCompanyReady(true)).catch(() => setCompanyReady(false))
  }, [authenticated])

  async function handleLogout() {
    setLogoutError(null)
    try {
      await logout()
      setAuthenticated(false)
      setCompanyReady(null)
      setCurrentPage("dashboard")
      setActiveCopilotEntity(null)
      setNavigationTarget(null)
    } catch (reason) {
      setLogoutError(
        reason instanceof Error
          ? reason.message
          : "Déconnexion impossible. Réessayez.",
      )
    }
  }

  if (publicAuthAction) {
    return (
      <Login
        onLogin={() => {
          setPublicAuthAction(false)
          setAuthenticated(true)
          setAuthChecked(true)
          setCompanyReady(null)
        }}
        onPublicActionComplete={() => setPublicAuthAction(false)}
      />
    )
  }

  if (!authChecked) {
    return <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC]"><div className="text-center"><div className="mx-auto flex h-[42px] w-[42px] items-center justify-center rounded-[12px] bg-[#2563EB] text-[16px] font-bold text-white">M</div><p className="mt-[14px] text-[12px] font-medium text-[#64748B]">Sécurisation de votre session...</p></div></div>
  }

  if (!authenticated) {
  return (
    <Login
      onLogin={() => { setAuthenticated(true); setCompanyReady(null) }}
    />
  )
  }
  if (companyReady === false) {
    return <Onboarding onComplete={() => setCompanyReady(true)} />
  }
  if (companyReady === null) {
    return <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC]"><div className="text-center"><div className="mx-auto flex h-[42px] w-[42px] items-center justify-center rounded-[12px] bg-[#2563EB] text-[16px] font-bold text-white">M</div><p className="mt-[14px] text-[12px] font-medium text-[#64748B]">Chargement de Mine CRM AI...</p></div></div>
  }


  return (

    <div className="min-h-screen bg-[#F8FAFC]">

      {logoutError && (
        <div role="alert" className="fixed right-[18px] top-[18px] z-50 flex max-w-[360px] items-center gap-[12px] rounded-[8px] border border-red-200 bg-white px-[14px] py-[11px] text-[10px] text-red-700 shadow-lg">
          <span className="flex-1">{logoutError}</span>
          <button type="button" onClick={() => setLogoutError(null)} className="font-semibold text-red-500" aria-label="Fermer">×</button>
        </div>
      )}

      {/* ==================================================
          PAGE
      ================================================== */}

      <div className="flex min-h-screen">

        {/* ==================================================
            SIDEBAR
        ================================================== */}

        <aside
          aria-label="Navigation principale"
          className="
            app-sidebar
            fixed
            left-0
            top-0
            flex
            h-screen
            w-[188px]
            flex-col
            bg-[#0F172A]
            px-[13px]
            py-[18px]
            text-white
          "
        >

          {/* ==================================================
              LOGO
          ================================================== */}

          <div className="app-sidebar-brand flex items-center gap-[9px] px-[5px]">

            <div
              className="
                flex
                h-[30px]
                w-[30px]
                items-center
                justify-center
                rounded-full
                bg-[#2563EB]
                text-[11px]
                font-bold
              "
            >
              M
            </div>

            <span className="text-[12px] font-semibold">
              Mine CRM AI
            </span>

          </div>


          {/* ==================================================
              NAVIGATION
          ================================================== */}

          <nav className="app-navigation mt-[28px]">


            {/* ==================================================
                DASHBOARD
            ================================================== */}

            <button
              type="button"
              onClick={() => navigateTo("dashboard")}
              className={`
                flex
                h-[32px]
                w-full
                items-center
                rounded-[5px]
                px-[10px]
                text-left
                text-[9px]
                transition
                ${
                  currentPage === "dashboard"
                    ? "bg-[#1E293B] text-white"
                    : "text-[#94A3B8] hover:bg-[#172033] hover:text-white"
                }
              `}
            >
              <Icon name="dashboard" size={16} className="mr-[10px] shrink-0" />
              <span>Dashboard</span>
            </button>

            <button
              type="button"
              onClick={() => navigateTo("ai")}
              className={`
                mt-[4px]
                flex
                h-[32px]
                w-full
                items-center
                rounded-[5px]
                px-[10px]
                text-left
                text-[9px]
                transition
                ${
                  currentPage === "ai"
                    ? "bg-[#1E293B] text-white"
                    : "text-[#94A3B8] hover:bg-[#172033] hover:text-white"
                }
              `}
            >
              <Icon name="ai" size={16} className="mr-[10px] shrink-0" />
              <span>Assistant IA</span>
            </button>


            {/* ==================================================
                CLIENTS
            ================================================== */}

            <button
              type="button"
              onClick={() => navigateTo("clients")}
              className={`
                mt-[4px]
                flex
                h-[32px]
                w-full
                items-center
                rounded-[5px]
                px-[10px]
                text-left
                text-[9px]
                transition
                ${
                  currentPage === "clients"
                    ? "bg-[#1E293B] text-white"
                    : "text-[#94A3B8] hover:bg-[#172033] hover:text-white"
                }
              `}
            >
              <Icon name="clients" size={16} className="mr-[10px] shrink-0" />
              <span>Clients</span>
            </button>


            <button
              type="button"
              onClick={() => navigateTo("prospects")}
              className={`
                mt-[4px]
                flex
                h-[32px]
                w-full
                items-center
                rounded-[5px]
                px-[10px]
                text-left
                text-[9px]
                transition
                ${
                  currentPage === "prospects"
                    ? "bg-[#1E293B] text-white"
                    : "text-[#94A3B8] hover:bg-[#172033] hover:text-white"
                }
              `}
            >
              <Icon name="prospects" size={16} className="mr-[10px] shrink-0" />
              <span>Prospects</span>
            </button>


            <button
              type="button"
              onClick={() => navigateTo("products")}
              className={`
                mt-[4px]
                flex
                h-[32px]
                w-full
                items-center
                rounded-[5px]
                px-[10px]
                text-left
                text-[9px]
                transition
                ${
                  currentPage === "products"
                    ? "bg-[#1E293B] text-white"
                    : "text-[#94A3B8] hover:bg-[#172033] hover:text-white"
                }
              `}
            >
              <Icon name="products" size={16} className="mr-[10px] shrink-0" />
              <span>Produits</span>
            </button>


            <button
              type="button"
              onClick={() => navigateTo("quotes")}
              className={`
                mt-[4px]
                flex
                h-[32px]
                w-full
                items-center
                rounded-[5px]
                px-[10px]
                text-left
                text-[9px]
                transition
                ${
                  currentPage === "quotes"
                    ? "bg-[#1E293B] text-white"
                    : "text-[#94A3B8] hover:bg-[#172033] hover:text-white"
                }
              `}
            >
              <Icon name="quotes" size={16} className="mr-[10px] shrink-0" />
              <span>Devis</span>
            </button>

            <button
              type="button"
              onClick={() => navigateTo("services")}
              className={`mt-[4px] flex h-[32px] w-full items-center rounded-[5px] px-[10px] text-left text-[9px] transition ${currentPage === "services" ? "bg-[#1E293B] text-white" : "text-[#94A3B8] hover:bg-[#172033] hover:text-white"}`}
            >
              <Icon name="services" size={16} className="mr-[10px] shrink-0" />
              <span>Services</span>
            </button>

            {/* ==================================================
                FACTURES
            ================================================== */}

            <button
              type="button"
              onClick={() => navigateTo("invoices")}
              className={`
                mt-[4px]
                flex
                h-[32px]
                w-full
                items-center
                rounded-[5px]
                px-[10px]
                text-left
                text-[9px]
                transition
                ${
                  currentPage === "invoices"
                    ? "bg-[#1E293B] text-white"
                    : "text-[#94A3B8] hover:bg-[#172033] hover:text-white"
                }
              `}
            >
              <Icon name="invoices" size={16} className="mr-[10px] shrink-0" />
              <span>Factures</span>
            </button>


            {/* ==================================================
                RAPPORTS
            ================================================== */}

            <button
              type="button"
              onClick={() => navigateTo("reports")}
              className={`
                mt-[4px]
                flex
                h-[32px]
                w-full
                items-center
                rounded-[5px]
                px-[10px]
                text-left
                text-[9px]
                transition
                ${
                  currentPage === "reports"
                    ? "bg-[#1E293B] text-white"
                    : "text-[#94A3B8] hover:bg-[#172033] hover:text-white"
                }
              `}
            >
              <Icon name="reports" size={16} className="mr-[10px] shrink-0" />
              <span>Rapports</span>
            </button>


            {/* ==================================================
                PARAMÈTRES
            ================================================== */}

            <button
              type="button"
              onClick={() => navigateTo("settings")}
              className={`
                mt-[4px]
                flex
                h-[32px]
                w-full
                items-center
                rounded-[5px]
                px-[10px]
                text-left
                text-[9px]
                transition
                ${
                  currentPage === "settings"
                    ? "bg-[#1E293B] text-white"
                    : "text-[#94A3B8] hover:bg-[#172033] hover:text-white"
                }
              `}
            >
              <Icon name="settings" size={16} className="mr-[10px] shrink-0" />
              <span>Paramètres</span>
            </button>

          </nav>


          {/* ==================================================
              USER
          ================================================== */}

          <div className="app-sidebar-user mt-auto">

            <div
              className="
                flex
                items-center
                gap-[9px]
                border-t
                border-[#1E293B]
                px-[5px]
                pt-[15px]
              "
            >

              <div
                className="
                  flex
                  h-[28px]
                  w-[28px]
                  items-center
                  justify-center
                  rounded-full
                  bg-[#7C3AED]
                  text-[8px]
                  font-semibold
                "
              >
                {(currentUser?.username ?? "U").slice(0, 2).toUpperCase()}
              </div>

              <div>

                <p className="text-[9px] font-semibold text-white">
                  {currentUser?.username ?? "Utilisateur"}
                </p>

                <p className="mt-[2px] text-[7px] text-[#94A3B8]">
                  Admin
                </p>

              </div>

              <button
                type="button"
                title="Déconnexion"
                onClick={() => void handleLogout()}
                className="ml-auto text-[8px] text-[#94A3B8] hover:text-white"
              >
                Quitter
              </button>

            </div>

          </div>

        </aside>


        {/* ==================================================
            CONTENT
        ================================================== */}

        <div className="app-content ml-[188px] min-h-screen flex-1">

          <main
            className="
              app-main
              min-h-screen
              px-[38px]
              py-[28px]
            "
          >

            {/* ==================================================
                DASHBOARD
            ================================================== */}

            {currentPage === "dashboard" && (
              <Dashboard onNavigate={navigateTo} />
            )}

            {currentPage === "ai" && (
              <AssistantAI />
            )}


            {/* ==================================================
                CLIENTS
            ================================================== */}

            {currentPage === "clients" && (
              <Clients
                focusCustomerId={navigationTarget?.page === "clients" && navigationTarget.entity_type === "customer" ? navigationTarget.entity_id : undefined}
                focusQuery={navigationTarget?.page === "clients" && !navigationTarget.entity_id ? navigationTarget.query : undefined}
                onFocusConsumed={consumeNavigationTarget}
                onActiveEntityChange={setActiveCopilotEntity}
              />
            )}

            {currentPage === "prospects" && (
              <Prospects />
            )}

            {currentPage === "products" && (
              <Products />
            )}

            {currentPage === "services" && (
              <Services />
            )}

            {currentPage === "quotes" && (
              <Quotes />
            )}


            {/* ==================================================
                FACTURES
            ================================================== */}

            {currentPage === "invoices" && (
              <Invoices
                onNavigateQuotes={() => navigateTo("quotes")}
                focusInvoiceId={navigationTarget?.page === "invoices" && navigationTarget.entity_type === "invoice" ? navigationTarget.entity_id : undefined}
                onFocusConsumed={consumeNavigationTarget}
                onActiveEntityChange={setActiveCopilotEntity}
              />
            )}

            {currentPage === "reports" && (
              <Reports />
            )}


            {/* ==================================================
                PARAMÈTRES
            ================================================== */}

            {currentPage === "settings" && (
              <Settings />
            )}

          </main>

        </div>

      </div>

      <CopilotDrawer
        currentPage={currentPage}
        activeEntity={activeCopilotEntity}
        onNavigate={handleCopilotNavigation}
      />

    </div>

  )
}


export default App
