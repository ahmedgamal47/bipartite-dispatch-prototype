export type GeocodeResult = {
  label: string
  lat: number
  lng: number
  type?: string
  address?: Record<string, string>
}

export type LocationValue = {
  lat: number
  lng: number
  label?: string
}
