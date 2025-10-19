import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '@/lib/httpClient'
import type { TripRequest, MatchingAssignment } from '@/types/dispatch'

export type MatchingResult = {
  h3Index: string
  tripIds: string[]
  assignments: MatchingAssignment[]
  unassigned: string[]
  strategy: string
  generatedAt: string
  metadata: {
    driversConsidered: number
  }
}

export type DispatchPool = {
  h3Index: string
  trips: TripRequest[]
  windowStart: string
  updatedAt: string
}

export type DispatchTelemetryEvent = {
  id: string
  timestamp: string
  type: 'trip_queued' | 'pool_flushed' | 'matching_result'
  data: Record<string, unknown>
}

const POOLS_KEY = ['dispatch', 'pools']
const TELEMETRY_KEY = ['dispatch', 'telemetry']

export const useDispatchPoolsQuery = () =>
  useQuery({
    queryKey: POOLS_KEY,
    queryFn: async (): Promise<DispatchPool[]> => {
      const { data } = await httpClient.get('/dispatch/pools')
      return data
    },
    refetchInterval: 5000,
  })

export const useDispatchTelemetryQuery = () =>
  useQuery({
    queryKey: TELEMETRY_KEY,
    queryFn: async (): Promise<DispatchTelemetryEvent[]> => {
      const { data } = await httpClient.get('/dispatch/telemetry')
      return data
    },
    refetchInterval: 5000,
  })

export const useFlushPoolsMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: { h3Index?: string } = {}) => {
      const { data } = await httpClient.post('/dispatch/pools/flush', payload)
      return data as MatchingResult[]
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: POOLS_KEY })
      queryClient.invalidateQueries({ queryKey: TELEMETRY_KEY })
    },
  })
}
