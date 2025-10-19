import { Card, SimpleGrid, Stack, Table, Text, Title } from '@mantine/core'

export const OffersPage = () => {
  return (
    <>
      <Title order={2} mb="lg">
        Offer Lifecycle Monitor
      </Title>
      <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="lg" mb="xl">
        {[{ label: 'Active Offers', value: '0' }, { label: 'Acceptance Rate', value: '0%' }, { label: 'Average Response Time', value: '—' }].map((stat) => (
          <Card key={stat.label} withBorder padding="lg" radius="md" shadow="sm">
            <Stack gap={4}>
              <Text size="sm" c="dimmed">
                {stat.label}
              </Text>
              <Text size="xl" fw={600}>
                {stat.value}
              </Text>
            </Stack>
          </Card>
        ))}
      </SimpleGrid>
      <Card withBorder radius="md" shadow="sm" padding="lg">
        <Stack gap="md">
          <Title order={4}>Offer Queue</Title>
          <Table highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Trip</Table.Th>
                <Table.Th>Driver</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Timeout</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              <Table.Tr>
                <Table.Td colSpan={4}>
                  <Text ta="center" c="dimmed">
                    Awaiting dispatch results.
                  </Text>
                </Table.Td>
              </Table.Tr>
            </Table.Tbody>
          </Table>
          <Text c="dimmed">
            This table will display outstanding offers and let you drive accept/decline actions in later phases.
          </Text>
        </Stack>
      </Card>
    </>
  )
}
