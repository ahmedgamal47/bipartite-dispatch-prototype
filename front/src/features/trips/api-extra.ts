import { httpClient } from '@/lib/httpClient'

export const generateTrips = async (payload: {
  count: number
  polygon: [number, number][]
  riderIds?: string[]
}) => {
  await httpClient.post('/trips/generate', payload)
}

