import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '@/lib/httpClient'
import type { LocationValue } from '@/types/maps'
import type { RiderProfile } from '@/types/dispatch'

export type CreateRiderPayload = {
  name: string
  phone: string
  defaultPickup?: LocationValue & { address?: string }
}

export type UpdateRiderPayload = Partial<CreateRiderPayload> & {
  id: string
}

const RIDERS_KEY = ['riders']

export const useRidersQuery = () =>
  useQuery({
    queryKey: RIDERS_KEY,
    queryFn: async (): Promise<RiderProfile[]> => {
      const { data } = await httpClient.get('/riders')
      return data
    },
  })

const invalidateRiders = (queryClient: ReturnType<typeof useQueryClient>) => {
  queryClient.invalidateQueries({ queryKey: RIDERS_KEY })
}

export const useCreateRiderMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: CreateRiderPayload) => {
      const { data } = await httpClient.post('/riders', payload)
      return data as RiderProfile
    },
    onSuccess: () => invalidateRiders(queryClient),
  })
}

export const useUpdateRiderMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...payload }: UpdateRiderPayload) => {
      const { data } = await httpClient.patch(`/riders/${id}`, payload)
      return data as RiderProfile
    },
    onSuccess: () => invalidateRiders(queryClient),
  })
}

export const useDeleteRiderMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await httpClient.delete(`/riders/${id}`)
    },
    onSuccess: () => invalidateRiders(queryClient),
  })
}

