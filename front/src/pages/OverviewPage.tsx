import { Card, SimpleGrid, Stack, Text, Title } from '@mantine/core'

const featureCards = [
  {
    title: 'Driver Network',
    description:
      'Onboard drivers, update live locations, and manage operational readiness across H3 cells.',
  },
  {
    title: 'Rider Demand',
    description:
      'Create rider accounts, capture pickup/dropoff intents, and feed the dispatch intake pipeline.',
  },
  {
    title: 'Dispatch Flow',
    description:
      'Visualize pooling, matching, solver decisions, and offer lifecycles for each trip batch.',
  },
  {
    title: 'Telemetry & Analytics',
    description:
      'Inspect batch inputs, solver outcomes, SLA breaches, and acceptance funnels in real time.',
  },
]

export const OverviewPage = () => {
  return (
    <>
      <Title order={2} mb="md">
        Proof-of-Concept Overview
      </Title>
      <Text c="dimmed" size="md" mb="xl">
        Use this console to simulate Yassir&apos;s dispatch workflow end-to-end.
        Configure drivers and riders, trigger trips, and observe how pooling,
        matching, and offers come together in one place.
      </Text>
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
        {featureCards.map((card) => (
          <Card key={card.title} shadow="sm" padding="lg" radius="md" withBorder>
            <Stack gap="sm">
              <Title order={4}>{card.title}</Title>
              <Text c="dimmed">{card.description}</Text>
            </Stack>
          </Card>
        ))}
      </SimpleGrid>
    </>
  )
}
