import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from '@tanstack/react-query'
import { httpClient } from '@/lib/httpClient'
import type { LocationValue } from '@/types/maps'
import type { TripRequest, DispatchMode } from '@/types/dispatch'
import type { MatchingResult } from '@/features/dispatch/api'

export type CreateTripPayload = {
  riderId: string
  pickup: LocationValue & { address?: string }
  dropoff: LocationValue & { address?: string }
  status?: TripRequest['status']
  tags?: string[]
  dispatchMode?: DispatchMode
}

export type CreateTripResponse = {
  trip: TripRequest
  matchingResult?: MatchingResult
}

const TRIPS_KEY = ['trips'] as const

type TripsQueryOptions = Omit<
  UseQueryOptions<TripRequest[], Error, TripRequest[], typeof TRIPS_KEY>,
  'queryKey' | 'queryFn'
>

export const useTripsQuery = (options?: TripsQueryOptions) =>
  useQuery({
    queryKey: TRIPS_KEY,
    queryFn: async (): Promise<TripRequest[]> => {
      const { data } = await httpClient.get('/trips')
      return data
    },
    ...options,
  })

export const useCreateTripMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: CreateTripPayload) => {
      const { data } = await httpClient.post('/trips', payload)
      return data as CreateTripResponse
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRIPS_KEY })
    },
  })
}
