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
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useMemo, useState } from 'react'
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

export const TripsPage = () => {
  const ridersQuery = useRidersQuery()
  const tripsQuery = useTripsQuery()
  const createTrip = useCreateTripMutation()
  const poolsQuery = useDispatchPoolsQuery()
  const telemetryQuery = useDispatchTelemetryQuery()
  const flushPools = useFlushPoolsMutation()

  const [selectedRider, setSelectedRider] = useState<string | null>(null)
  const [pickupLocation, setPickupLocation] = useState<LocationValue | null>(null)
  const [dropoffLocation, setDropoffLocation] = useState<LocationValue | null>(null)
  const [status, setStatus] = useState<TripRequest['status']>('queued')
  const [lastResults, setLastResults] = useState<MatchingResult[]>([])

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

  const handleFlushPools = () => {
    flushPools.mutate(
      {},
      {
        onSuccess: (results) => {
          setLastResults(results)
          const assignmentCount = results.reduce((acc, result) => acc + result.assignments.length, 0)
          const unmatchedCount = results.reduce((acc, result) => acc + result.unassigned.length, 0)

          notifications.show({
            title: 'Pools flushed',
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
    <Flex gap="xl" align="stretch" h="100%">
      <Paper shadow="xs" radius="md" p="xl" withBorder flex="1">
        <Stack gap="md">
          <Title order={4}>Request Trip</Title>
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
          <Button radius="md" onClick={handleSubmit} disabled={!canSubmit} loading={createTrip.isPending}>
            Submit Trip Request
          </Button>
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
                {lastResults.map((result) => (
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
                            <Text size="sm">Trip {assignment.tripId}</Text>
                            <Text size="sm" c="dimmed">
                              Driver {assignment.driverName} ({assignment.driverStatus}) ·
                              {' '}
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
                        <Text size="xs" c="red">
                          Unassigned: {result.unassigned.join(', ')}
                        </Text>
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
            <Button size="xs" variant="light" onClick={handleFlushPools} loading={flushPools.isPending}>
              Flush Now
            </Button>
          </Group>
          <ScrollArea h={180} type="auto">
            <Stack gap="sm">
              {poolsQuery.data?.length ? (
                poolsQuery.data.map((pool) => (
                  <Paper key={pool.h3Index} withBorder radius="md" p="sm">
                    <Group justify="space-between">
                      <Text fw={600}>H3 {pool.h3Index}</Text>
                      <Text size="xs" c="dimmed">
                        Trips: {pool.trips.length} · Updated {formatTimestamp(pool.updatedAt)}
                      </Text>
                    </Group>
                    <Stack gap={4} mt="xs">
                      {pool.trips.map((trip) => (
                        <Text key={trip.id} size="xs" c="dimmed">
                          #{trip.id} · {trip.status} · rider {trip.riderId}
                        </Text>
                      ))}
                    </Stack>
                  </Paper>
                ))
              ) : (
                <Text size="sm" c="dimmed">
                  {poolsQuery.isLoading ? 'Loading pools…' : 'No trips currently pooling.'}
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
  )
}
