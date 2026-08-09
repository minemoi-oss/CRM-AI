const API_URL = "http://127.0.0.1:8000"


export async function checkBackend() {

  const response = await fetch(`${API_URL}/health/db`)

  if (!response.ok) {
    throw new Error("Le backend ne répond pas correctement")
  }

  return response.json()
}

export interface Customer {
  id: number
  name: string
  email: string
  phone: string | null
  company_id: number | null
}



export async function getCustomers(): Promise<Customer[]> {
  const url = `${API_URL}/customers`

  console.log("Appel API :", url)

  const response = await fetch(url)

  console.log("Status :", response.status)

  const text = await response.text()

  console.log("Réponse :", text)

  if (!response.ok) {
    throw new Error(
      `Erreur API : ${response.status} ${response.statusText}`
    )
  }

  return JSON.parse(text)
}