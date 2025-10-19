export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000'

export const apiRoutes = {
  drivers: `${API_BASE_URL}/drivers`,
  riders: `${API_BASE_URL}/riders`,
  trips: `${API_BASE_URL}/trips`,
  offers: `${API_BASE_URL}/offers`,
  telemetry: `${API_BASE_URL}/telemetry`,
}

