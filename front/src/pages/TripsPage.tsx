import {
  Button,
  Divider,
  Flex,
  Group,
  Loader,
  Paper,
  Pill,
  ScrollArea,
  Select,
  Stack,
  Table,
  Text,
  Title,
  Modal,
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import { useEffect, useMemo, useState } from 'react'
import { modals } from '@mantine/modals'
import { LocationPicker } from '@/components/location/LocationPicker'
import { useRidersQuery } from '@/features/riders/api'
import { useCreateTripMutation, useTripsQuery } from '@/features/trips/api'
import type { LocationValue } from '@/types/maps'
import type { TripRequest } from '@/types/dispatch'
import {
  useDispatchPoolsQuery,
  useDispatchTelemetryQuery,
  useFlushPoolsMutation,
  type MatchingResult,
} from '@/features/dispatch/api'
import { useOffersQuery, useRespondOfferMutation } from '@/features/offers/api'
import { httpClient } from '@/lib/httpClient'

const TRIP_STATUSES: TripRequest['status'][] = [
  'queued',
  'pooling',
  'matched',
  'offering',
  'assigned',
  'no_driver',
  'expired',
]

const statusColor: Record<TripRequest['status'], string> = {
  queued: 'blue',
  pooling: 'cyan',
  matched: 'green',
  offering: 'yellow',
  assigned: 'teal',
  no_driver: 'red',
  expired: 'gray',
}

const formatTimestamp = (value: string) => new Date(value).toLocaleString()

const getRemainingTimeLabel = (expiresAt?: string, nowTs?: number) => {
  if (!expiresAt) {
    return { label: 'n/a', isExpired: false }
  }

  const expiresMs = new Date(expiresAt).getTime()
  if (Number.isNaN(expiresMs)) {
    return { label: 'n/a', isExpired: false }
  }

  const diffSeconds = Math.floor((expiresMs - (nowTs ?? Date.now())) / 1000)
  if (diffSeconds <= 0) {
    return { label: 'Expired', isExpired: true }
  }

  const minutes = Math.floor(diffSeconds / 60)
  const seconds = diffSeconds % 60

  return {
    label: `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
    isExpired: diffSeconds <= 10,
  }
}

export const TripsPage = () => {
  const ridersQuery = useRidersQuery()
  const tripsQuery = useTripsQuery()
  const createTrip = useCreateTripMutation()
  const poolsQuery = useDispatchPoolsQuery()
  const telemetryQuery = useDispatchTelemetryQuery()
  const flushPools = useFlushPoolsMutation()
  const offersQuery = useOffersQuery()
  const respondOffer = useRespondOfferMutation()

  const [selectedRider, setSelectedRider] = useState<string | null>(null)
  const [pickupLocation, setPickupLocation] = useState<LocationValue | null>(null)
  const [dropoffLocation, setDropoffLocation] = useState<LocationValue | null>(null)
  const [status, setStatus] = useState<TripRequest['status']>('queued')
  const [lastResults, setLastResults] = useState<MatchingResult[]>([])
  const [opened, { open, close }] = useDisclosure(false)
  const [selectedResultIndex, setSelectedResultIndex] = useState<number | null>(null)
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(Date.now())
    }, 1000)

    return () => {
      window.clearInterval(interval)
    }
  }, [])

  const openScorecard = (resultIndex: number, tripId: string) => {
    setSelectedResultIndex(resultIndex)
    setSelectedTripId(tripId)
    open()
  }

  const closeScorecard = () => {
    setSelectedResultIndex(null)
    setSelectedTripId(null)
    close()
  }

  const activeScorecard = useMemo(() => {
    if (selectedResultIndex === null || selectedTripId === null) {
      return null
    }

    const result = lastResults[selectedResultIndex]
    return result?.scorecards.find((card) => card.tripId === selectedTripId) ?? null
  }, [lastResults, selectedResultIndex, selectedTripId])

  const riderOptions = useMemo(
    () =>
      ridersQuery.data?.map((rider) => ({
        value: rider.id,
        label: `${rider.name} (${rider.phone})`,
      })) ?? [],
    [ridersQuery.data],
  )

  const riderLabelById = useMemo(() => {
    const map = new Map<string, string>()
    ridersQuery.data?.forEach((rider) => {
      map.set(rider.id, rider.name)
    })
    return map
  }, [ridersQuery.data])

  const canSubmit = Boolean(selectedRider && pickupLocation && dropoffLocation)

  const resetForm = () => {
    setSelectedRider(null)
    setPickupLocation(null)
    setDropoffLocation(null)
    setStatus('queued')
  }

  const handleFlushPools = (targetH3Index?: string) => {
    const payload = targetH3Index ? { h3Index: targetH3Index } : {}
    flushPools.mutate(
      payload,
      {
        onSuccess: (results) => {
          setLastResults(results)
          const assignmentCount = results.reduce((acc, result) => acc + result.assignments.length, 0)
          const unmatchedCount = results.reduce((acc, result) => acc + result.unassigned.length, 0)

          notifications.show({
            title: targetH3Index ? `Pool ${targetH3Index} released` : 'Pools released',
            message: `Assignments: ${assignmentCount}, Unassigned: ${unmatchedCount}`,
            color: assignmentCount > 0 ? 'green' : unmatchedCount > 0 ? 'yellow' : 'blue',
          })
        },
        onError: (error: unknown) => {
          const message = error instanceof Error ? error.message : 'Unable to flush pools'
          notifications.show({ title: 'Dispatch error', message, color: 'red' })
        },
      },
    )
  }

  const handleRespondOffer = async (id: string, status: 'accepted' | 'declined') => {
    try {
      await respondOffer.mutateAsync({ id, status })
      notifications.show({
        title: `Offer ${status}`,
        message: `Offer ${id} marked as ${status}.`,
        color: status === 'accepted' ? 'green' : 'yellow',
      })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unable to respond to offer'
      notifications.show({ title: 'Offer error', message, color: 'red' })
    }
  }

  const handleSubmit = async () => {
    if (!selectedRider || !pickupLocation || !dropoffLocation) {
      notifications.show({
        title: 'Missing information',
        message: 'Select rider, pickup, and dropoff locations before submitting.',
        color: 'yellow',
      })
      return
    }

    try {
      await createTrip.mutateAsync({
        riderId: selectedRider,
        pickup: {
          lat: pickupLocation.lat,
          lng: pickupLocation.lng,
          address: pickupLocation.label,
        },
        dropoff: {
          lat: dropoffLocation.lat,
          lng: dropoffLocation.lng,
          address: dropoffLocation.label,
        },
        status,
      })

      notifications.show({
        title: 'Trip created',
        message: 'Trip request queued successfully.',
        color: 'green',
      })
      resetForm()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unable to create trip'
      notifications.show({ title: 'Request failed', message, color: 'red' })
    }
  }

  return (
    <>
      <Flex gap="xl" align="stretch" h="100%">
      <Paper shadow="xs" radius="md" p="xl" withBorder flex="1">
        <Group justify="space-between" mb="md">
          <Title order={4}>Request Trip</Title>
          <Button
            variant="light"
            color="red"
            onClick={() =>
              modals.openConfirmModal({
                title: 'Remove all trips?',
                centered: true,
                labels: { confirm: 'Delete all', cancel: 'Cancel' },
                confirmProps: { color: 'red' },
                children: (
                  <Text size="sm">This will permanently remove every trip. Are you sure?</Text>
                ),
                onConfirm: async () => {
                  try {
                    await httpClient.delete('/trips')
                    notifications.show({
                      title: 'Trips removed',
                      message: 'All trips have been deleted.',
                      color: 'red',
                    })
                    tripsQuery.refetch()
                  } catch (error: unknown) {
                    const message =
                      error instanceof Error ? error.message : 'Unable to delete trips'
                    notifications.show({ title: 'Delete all failed', message, color: 'red' })
                  }
                },
              })
            }
          >
            Delete All
          </Button>
        </Group>
        <Stack gap="md">
          <Select
            label="Select Rider"
            placeholder={ridersQuery.isLoading ? 'Loading riders…' : 'Choose rider'}
            data={riderOptions}
            value={selectedRider}
            onChange={(value) => setSelectedRider(value)}
            searchable
            nothingFoundMessage={ridersQuery.isLoading ? 'Loading…' : 'No riders found'}
          />
          <Select
            label="Initial Status"
            data={TRIP_STATUSES.map((value) => ({ value, label: value.toUpperCase() }))}
            value={status}
            onChange={(value) => setStatus((value as TripRequest['status']) ?? 'queued')}
          />
          <Divider />
          <LocationPicker
            label="Pickup"
            value={pickupLocation}
            onChange={setPickupLocation}
            countryCodes={['dz']}
            height={240}
            mapId="trip-pickup"
          />
          <LocationPicker
            label="Dropoff"
            value={dropoffLocation}
            onChange={setDropoffLocation}
            countryCodes={['dz']}
            height={240}
            mapId="trip-dropoff"
          />
          <Divider />
          <Group>
            <Button radius="md" onClick={handleSubmit} disabled={!canSubmit} loading={createTrip.isPending}>
              Submit Trip Request
            </Button>
          </Group>
        </Stack>
      </Paper>
      <Stack flex={1.3} gap="md">
        <Paper withBorder radius="md" p="md" shadow="xs" style={{ overflow: 'auto' }}>
          <Group justify="space-between" mb="md">
            <Title order={5}>Recent Trips</Title>
            {tripsQuery.isFetching && <Loader size="sm" />}
          </Group>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Trip</Table.Th>
                <Table.Th>Rider</Table.Th>
                <Table.Th>Pickup</Table.Th>
                <Table.Th>Dropoff</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Created</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {tripsQuery.data?.length ? (
                tripsQuery.data.map((trip) => (
                  <Table.Tr key={trip.id}>
                    <Table.Td>{trip.id}</Table.Td>
                    <Table.Td>{riderLabelById.get(trip.riderId) ?? trip.riderId}</Table.Td>
                    <Table.Td>
                      {trip.pickup.address ?? `${trip.pickup.lat.toFixed(4)}, ${trip.pickup.lng.toFixed(4)}`}
                    </Table.Td>
                    <Table.Td>
                      {trip.dropoff.address ?? `${trip.dropoff.lat.toFixed(4)}, ${trip.dropoff.lng.toFixed(4)}`}
                    </Table.Td>
                    <Table.Td>
                      <Pill color={statusColor[trip.status]}>{trip.status.toUpperCase()}</Pill>
                    </Table.Td>
                    <Table.Td>{formatTimestamp(trip.createdAt)}</Table.Td>
                  </Table.Tr>
                ))
              ) : (
                <Table.Tr>
                  <Table.Td colSpan={6}>
                    <Text ta="center" c="dimmed">
                      {tripsQuery.isLoading ? 'Loading trips…' : 'No trips yet. Submit one to get started.'}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </Paper>

        <Paper withBorder radius="md" p="md" shadow="xs" style={{ overflow: 'hidden' }}>
          <Group justify="space-between" mb="md">
            <Title order={6}>Pending Offers</Title>
            {offersQuery.isFetching && <Loader size="sm" />}
          </Group>
          <ScrollArea h={200} type="auto">
            <Stack gap="xs">
              {offersQuery.data?.length ? (
                offersQuery.data.map((offer) => {
                  const { label: remainingLabel, isExpired } = getRemainingTimeLabel(offer.expiresAt, now)
                  const expiresDisplay =
                    remainingLabel === 'Expired'
                      ? 'Expired'
                      : remainingLabel === 'n/a'
                        ? 'No expiration set'
                        : `Expires in ${remainingLabel}`

                  return (
                    <Paper key={offer.id} withBorder radius="md" p="sm">
                      <Group justify="space-between">
                        <Stack gap={2}>
                          <Text fw={500}>Offer {offer.id}</Text>
                          <Text size="xs" c="dimmed">
                            Trip {offer.tripId} · Driver {offer.driverName} ({offer.driverStatus}) · {offer.distanceMeters} m
                          </Text>
                          <Text size="xs" c={isExpired ? 'red' : 'dimmed'}>
                            {expiresDisplay}
                          </Text>
                        </Stack>
                        <Group gap="xs">
                          <Button
                            size="xs"
                            color="green"
                            variant="light"
                            loading={respondOffer.isPending}
                            onClick={() => handleRespondOffer(offer.id, 'accepted')}
                          >
                            Accept
                          </Button>
                          <Button
                            size="xs"
                            color="red"
                            variant="light"
                            loading={respondOffer.isPending}
                            onClick={() => handleRespondOffer(offer.id, 'declined')}
                          >
                            Decline
                          </Button>
                        </Group>
                      </Group>
                    </Paper>
                  )
                })
              ) : (
                <Text size="sm" c="dimmed">
                  {offersQuery.isLoading ? 'Loading offers…' : 'No pending offers.'}
                </Text>
              )}
            </Stack>
          </ScrollArea>
        </Paper>

        <Paper withBorder radius="md" p="md" shadow="xs" style={{ overflow: 'hidden' }}>
          <Group justify="space-between" mb="md">
            <Title order={6}>Latest Matching Results</Title>
            {lastResults.length > 0 && (
              <Text size="xs" c="dimmed">
                {lastResults.length} batches · Last run {formatTimestamp(lastResults[0].generatedAt)}
              </Text>
            )}
          </Group>
          {lastResults.length ? (
            <ScrollArea h={200} type="auto">
              <Stack gap="sm">
                {lastResults.map((result, resultIndex) => (
                  <Paper key={`${result.h3Index}-${result.generatedAt}`} withBorder radius="md" p="sm">
                    <Group justify="space-between" align="flex-start">
                      <Stack gap={4}>
                        <Text fw={600}>H3 {result.h3Index}</Text>
                        <Text size="xs" c="dimmed">
                          Strategy: {result.strategy} · Drivers considered: {result.metadata.driversConsidered}
                        </Text>
                      </Stack>
                      <Text size="xs" c="dimmed">
                        Generated {formatTimestamp(result.generatedAt)}
                      </Text>
                    </Group>
                    <Stack gap={4} mt="sm">
                      {result.assignments.length ? (
                        result.assignments.map((assignment) => (
                          <Group key={assignment.tripId} justify="space-between">
                            <Button
                              variant="subtle"
                              size="xs"
                              onClick={() => openScorecard(resultIndex, assignment.tripId)}
                            >
                              Trip {assignment.tripId}
                            </Button>
                            <Text size="sm" c="dimmed">
                              Driver {assignment.driverName} ({assignment.driverStatus}) ·{' '}
                              {assignment.distanceMeters} m
                            </Text>
                          </Group>
                        ))
                      ) : (
                        <Text size="sm" c="dimmed">
                          No assignments.
                        </Text>
                      )}
                      {result.unassigned.length > 0 && (
                        <Group gap="xs" wrap="wrap">
                          <Text size="xs" c="red">
                            Unassigned:
                          </Text>
                          {result.unassigned.map((tripId) => (
                            <Button
                              key={tripId}
                              variant="subtle"
                              size="xs"
                              color="red"
                              onClick={() => openScorecard(resultIndex, tripId)}
                            >
                              Trip {tripId}
                            </Button>
                          ))}
                        </Group>
                      )}
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            </ScrollArea>
          ) : (
            <Text size="sm" c="dimmed">
              Flush pools to see matching results.
            </Text>
          )}
        </Paper>

        <Paper withBorder radius="md" p="md" shadow="xs" style={{ overflow: 'hidden' }}>
          <Group justify="space-between" mb="md">
            <Title order={6}>Pooling Window</Title>
            <Button
              size="xs"
              variant="light"
              onClick={() => handleFlushPools()}
              loading={flushPools.isPending}
            >
              Release All
            </Button>
          </Group>
          <ScrollArea h={180} type="auto">
            <Stack gap="sm">
              {poolsQuery.data?.length ? (
                poolsQuery.data.map((pool) => (
                  <Paper key={pool.h3Index} withBorder radius="md" p="sm">
                    <Group justify="space-between" align="flex-start">
                      <Stack gap={2}>
                        <Text fw={600}>H3 {pool.h3Index}</Text>
                        <Text size="xs" c="dimmed">
                          Trips: {pool.trips.length} - Updated {formatTimestamp(pool.updatedAt)}
                        </Text>
                      </Stack>
                      <Button
                        size="xs"
                        variant="light"
                        onClick={() => handleFlushPools(pool.h3Index)}
                        loading={flushPools.isPending}
                      >
                        Release
                      </Button>
                    </Group>
                    <Stack gap={4} mt="xs">
                      {pool.trips.map((trip) => (
                        <Text key={trip.id} size="xs" c="dimmed">
                          #{trip.id} - {trip.status} - rider {trip.riderId}
                        </Text>
                      ))}
                    </Stack>
                  </Paper>
                ))
              ) : (
                <Text size="sm" c="dimmed">
                  {poolsQuery.isLoading ? 'Loading pools.' : 'No trips currently pooling.'}
                </Text>
              )}
            </Stack>
          </ScrollArea>
        </Paper>
        <Paper withBorder radius="md" p="md" shadow="xs" style={{ overflow: 'hidden' }}>
          <Group justify="space-between" mb="md">
            <Title order={6}>Telemetry</Title>
            {telemetryQuery.isFetching && <Loader size="sm" />}
          </Group>
          <ScrollArea h={200} type="auto">
            <Stack gap="xs">
              {telemetryQuery.data?.length ? (
                telemetryQuery.data.map((event) => (
                  <Paper key={event.id} withBorder radius="md" p="sm">
                    <Group justify="space-between">
                      <Text fw={500}>{event.type}</Text>
                      <Text size="xs" c="dimmed">
                        {formatTimestamp(event.timestamp)}
                      </Text>
                    </Group>
                    <Text size="xs" c="dimmed">
                      {JSON.stringify(event.data)}
                    </Text>
                  </Paper>
                ))
              ) : (
                <Text size="sm" c="dimmed">
                  {telemetryQuery.isLoading ? 'Collecting telemetry…' : 'No telemetry yet.'}
                </Text>
              )}
            </Stack>
          </ScrollArea>
        </Paper>
      </Stack>
      </Flex>

      <Modal
        opened={opened}
        onClose={closeScorecard}
        title={`Scorecard${selectedTripId ? ` · Trip ${selectedTripId}` : ''}`}
        size="lg"
        withinPortal
      >
        {activeScorecard ? (
          <Stack gap="sm">
            <Text size="sm" c="dimmed">
              Rider: {riderLabelById.get(activeScorecard.riderId) ?? activeScorecard.riderId}
            </Text>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Driver</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Distance (m)</Table.Th>
                  <Table.Th>Distance Score</Table.Th>
                  <Table.Th>Rating</Table.Th>
                  <Table.Th>Rating Score</Table.Th>
                  <Table.Th>Blended Cost</Table.Th>
                  <Table.Th>Candidate</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {activeScorecard.candidates.map((candidate) => (
                  <Table.Tr key={candidate.driverId}>
                    <Table.Td>{candidate.driverName}</Table.Td>
                    <Table.Td>{candidate.driverStatus}</Table.Td>
                    <Table.Td>{candidate.distanceMeters}</Table.Td>
                    <Table.Td>{candidate.distanceScore.toFixed(3)}</Table.Td>
                    <Table.Td>{candidate.rating.toFixed(1)}</Table.Td>
                    <Table.Td>{candidate.ratingScore.toFixed(3)}</Table.Td>
                    <Table.Td>{candidate.blendedCost.toFixed(3)}</Table.Td>
                    <Table.Td>{candidate.isCandidate ? '✔' : '—'}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Stack>
        ) : (
          <Text size="sm">Select a trip from the matching results to view details.</Text>
        )}
      </Modal>
    </>
  )
}
