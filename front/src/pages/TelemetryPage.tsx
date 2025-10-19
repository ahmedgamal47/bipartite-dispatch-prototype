import { Card, Code, Stack, Text, Title } from '@mantine/core'

const placeholderEvents = [
  {
    label: 'Batch Events',
    description:
      'Pooling outcomes, candidate drivers, solver decisions, and fallback activations.',
  },
  {
    label: 'Offer Events',
    description: 'Driver responses, timeouts, retries, and SLA adherence.',
  },
  {
    label: 'System Health',
    description: 'Latency probes, telemetry counters, and alerting hooks.',
  },
]

export const TelemetryPage = () => {
  return (
    <Stack gap="lg">
      <Title order={2}>Telemetry Stream</Title>
      <Text c="dimmed">
        Connect to backend analytics in later phases. For now we list the events we plan to surface and validate the
        layout.
      </Text>
      <Stack gap="sm">
        {placeholderEvents.map((event) => (
          <Card key={event.label} withBorder padding="lg" radius="md" shadow="xs">
            <Stack gap="xs">
              <Title order={5}>{event.label}</Title>
              <Text c="dimmed">{event.description}</Text>
            </Stack>
          </Card>
        ))}
      </Stack>
      <Card withBorder padding="lg" radius="md" shadow="xs">
        <Stack gap="sm">
          <Title order={5}>Example Payload Shape</Title>
          <Code block>
            {`{
  "batchId": "batch_2025-10-19T12:34:00Z",
  "h3Index": "87283472fffffff",
  "summary": {
    "trips": 3,
    "drivers": 9,
    "optimalMatches": 2,
    "fallbackUsed": false
  }
}`}
          </Code>
        </Stack>
      </Card>
    </Stack>
  )
}
