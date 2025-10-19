import { httpClient } from '@/lib/httpClient'

export const generateDrivers = async (payload: {
  count: number
  polygon: [number, number][]
}) => {
  await httpClient.post('/drivers/generate', payload)
}

