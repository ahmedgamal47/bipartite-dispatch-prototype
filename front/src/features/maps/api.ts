import { useMutation } from '@tanstack/react-query'
import { httpClient } from '@/lib/httpClient'
import type { GeocodeResult } from '@/types/maps'

type GeocodePayload = {
  query: string
  limit?: number
  countryCodes?: string[]
  language?: string
}

export const useGeocodeSearch = () =>
  useMutation({
    mutationFn: async (payload: GeocodePayload) => {
      const params = {
        query: payload.query,
        limit: payload.limit ?? 5,
        countryCodes: payload.countryCodes?.join(','),
        language: payload.language,
      }

      const { data } = await httpClient.get<GeocodeResult[]>('/maps/geocode', { params })
      return data
    },
  })

