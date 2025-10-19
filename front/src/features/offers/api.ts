import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '@/lib/httpClient'
import type { OfferRecord } from '@/types/dispatch'

const OFFERS_KEY = ['offers']

export const useOffersQuery = () =>
  useQuery({
    queryKey: OFFERS_KEY,
    queryFn: async (): Promise<OfferRecord[]> => {
      const { data } = await httpClient.get('/offers')
      return data
    },
    refetchInterval: 5000,
  })

export const useRespondOfferMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'accepted' | 'declined' }) => {
      const { data } = await httpClient.patch(`/offers/${id}/respond`, { status })
      return data as OfferRecord
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: OFFERS_KEY })
    },
  })
}

