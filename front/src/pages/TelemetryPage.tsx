import { Card, Group, Loader, Stack, Text, Title } from '@mantine/core'
import { useMemo } from 'react'
import { useDispatchTelemetryQuery } from '@/features/dispatch/api'

const telemetryLabels: Record<string, string> = {
  trip_queued: 'Trips Queued',
  pool_flushed: 'Pools Flushed',
  matching_result: 'Matching Results',
  offer_created: 'Offers Created',
  offer_accepted: 'Offers Accepted',
  offer_declined: 'Offers Declined',
  offer_timeout: 'Offers Timed Out',
}

const EVENT_ORDER = [
  'trip_queued',
  'pool_flushed',
  'matching_result',
  'offer_created',
  'offer_accepted',
  'offer_declined',
  'offer_timeout',
] as const

export const TelemetryPage = () => {
  const telemetryQuery = useDispatchTelemetryQuery()
  const events = telemetryQuery.data ?? []

  const typeCounts = useMemo(() => {
    return events.reduce<Record<string, number>>((acc, event) => {
      acc[event.type] = (acc[event.type] ?? 0) + 1
      return acc
    }, {})
  }, [events])

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2}>Telemetry Stream</Title>
        {telemetryQuery.isFetching && <Loader size="sm" />}
      </Group>

      <Group gap="md" wrap="wrap">
        {EVENT_ORDER.map((type) => (
          <Card key={type} withBorder padding="md" radius="md" shadow="xs" style={{ minWidth: 180 }}>
            <Stack gap={2}>
              <Text size="xs" c="dimmed">
                {telemetryLabels[type]}
              </Text>
              <Title order={4}>{typeCounts[type] ?? 0}</Title>
            </Stack>
          </Card>
        ))}
      </Group>

      <Card withBorder padding="md" radius="md" shadow="xs">
        <Stack gap="sm">
          <Title order={5}>Recent Events</Title>
          <Text size="xs" c="dimmed">
            Latest {events.length} telemetry entries (newest first).
          </Text>
          <Stack gap="sm">
            {events.length ? (
              events.map((event) => (
                <Card key={event.id} withBorder padding="sm" radius="md" shadow="xs">
                  <Group justify="space-between" align="flex-start">
                    <Stack gap={2}>
                      <Text fw={600}>{telemetryLabels[event.type] ?? event.type}</Text>
                      <Text size="xs" c="dimmed">
                        {JSON.stringify(event.data)}
                      </Text>
                    </Stack>
                    <Text size="xs" c="dimmed">
                      {new Date(event.timestamp).toLocaleString()}
                    </Text>
                  </Group>
                </Card>
              ))
            ) : (
              <Text size="sm" c="dimmed">
                No telemetry yet.
              </Text>
            )}
          </Stack>
        </Stack>
      </Card>
    </Stack>
  )
}
