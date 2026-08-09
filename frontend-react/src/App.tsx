import { useEffect } from "react"
import { checkBackend } from "./Services/api"

import { useState } from "react"

import Clients from "./pages/Clients/Clients"
import Invoices from "./pages/Invoices/Invoices"
import Settings from "./pages/Settings/Settings"


type Page =
  | "dashboard"
  | "clients"
  | "invoices"
  | "settings"


function App() {

  const [currentPage, setCurrentPage] =
    useState<Page>("clients")




  useEffect(() => {

    checkBackend()
      .then((data) => {
        console.log("Backend connecté :", data)
      })
      .catch((error) => {
        console.error("Erreur Backend :", error)
      })

  }, [])


  return (

    <div className="min-h-screen bg-[#F8FAFC]">

      {/* ==================================================
          PAGE
      ================================================== */}

      <div className="flex min-h-screen">

        {/* ==================================================
            SIDEBAR
        ================================================== */}

        <aside
          className="
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

          <div className="flex items-center gap-[9px] px-[5px]">

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
              N
            </div>

            <span className="text-[12px] font-semibold">
              Nova CRM
            </span>

          </div>


          {/* ==================================================
              NAVIGATION
          ================================================== */}

          <nav className="mt-[28px]">


            {/* ==================================================
                DASHBOARD
            ================================================== */}

            <button
              type="button"
              onClick={() => setCurrentPage("dashboard")}
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
              Dashboard
            </button>


            {/* ==================================================
                CLIENTS
            ================================================== */}

            <button
              type="button"
              onClick={() => setCurrentPage("clients")}
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
              Clients
            </button>


            {/* ==================================================
                FACTURES
            ================================================== */}

            <button
              type="button"
              onClick={() => setCurrentPage("invoices")}
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
              Factures
            </button>


            {/* ==================================================
                RAPPORTS
            ================================================== */}

            <button
              type="button"
              className="
                mt-[4px]
                flex
                h-[32px]
                w-full
                items-center
                rounded-[5px]
                px-[10px]
                text-left
                text-[9px]
                text-[#94A3B8]
                transition
                hover:bg-[#172033]
                hover:text-white
              "
            >
              Rapports
            </button>


            {/* ==================================================
                PARAMÈTRES
            ================================================== */}

            <button
              type="button"
              onClick={() => setCurrentPage("settings")}
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
              Paramètres
            </button>

          </nav>


          {/* ==================================================
              USER
          ================================================== */}

          <div className="mt-auto">

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
                MD
              </div>

              <div>

                <p className="text-[9px] font-semibold text-white">
                  Marie Dupuis
                </p>

                <p className="mt-[2px] text-[7px] text-[#94A3B8]">
                  Admin
                </p>

              </div>

            </div>

          </div>

        </aside>


        {/* ==================================================
            CONTENT
        ================================================== */}

        <div className="ml-[188px] min-h-screen flex-1">

          <main
            className="
              min-h-screen
              px-[38px]
              py-[28px]
            "
          >

            {/* ==================================================
                DASHBOARD
            ================================================== */}

            {currentPage === "dashboard" && (

              <div>

                <p
                  className="
                    text-[10px]
                    font-semibold
                    uppercase
                    tracking-[0.18em]
                    text-[#2563EB]
                  "
                >
                  PAGES
                </p>

                <h1
                  className="
                    mt-[8px]
                    text-[30px]
                    font-bold
                    text-[#0F172A]
                  "
                >
                  Dashboard
                </h1>

                <p
                  className="
                    mt-[9px]
                    text-[13px]
                    text-[#64748B]
                  "
                >
                  Vue d'ensemble de votre activité.
                </p>

              </div>

            )}


            {/* ==================================================
                CLIENTS
            ================================================== */}

            {currentPage === "clients" && (
              <Clients />
            )}


            {/* ==================================================
                FACTURES
            ================================================== */}

            {currentPage === "invoices" && (
              <Invoices />
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

    </div>

  )
}


export default App