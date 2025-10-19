import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from '@tanstack/react-query'
import { httpClient } from '@/lib/httpClient'
import type { DriverProfile, DriverStatus } from '@/types/dispatch'

export type CreateDriverPayload = {
  name: string
  status: DriverStatus
  rating: number
  vehicleNotes?: string
  location: {
    lat: number
    lng: number
  }
}

export type UpdateDriverPayload = Partial<Omit<CreateDriverPayload, 'location'>> & {
  id: string
  location?: {
    lat: number
    lng: number
  }
}

const DRIVERS_KEY = ['drivers'] as const

type DriversQueryOptions = Omit<
  UseQueryOptions<DriverProfile[], Error, DriverProfile[], typeof DRIVERS_KEY>,
  'queryKey' | 'queryFn'
>

export const useDriversQuery = (options?: DriversQueryOptions) =>
  useQuery({
    queryKey: DRIVERS_KEY,
    queryFn: async (): Promise<DriverProfile[]> => {
      const { data } = await httpClient.get('/drivers')
      return data
    },
    ...options,
  })

export const useCreateDriverMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: CreateDriverPayload) => {
      const { data } = await httpClient.post('/drivers', payload)
      return data as DriverProfile
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DRIVERS_KEY })
    },
  })
}

export const useUpdateDriverMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...payload }: UpdateDriverPayload) => {
      const { data } = await httpClient.patch(`/drivers/${id}`, payload)
      return data as DriverProfile
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DRIVERS_KEY })
    },
  })
}

export const useDeleteDriverMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await httpClient.delete(`/drivers/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DRIVERS_KEY })
    },
  })
}
