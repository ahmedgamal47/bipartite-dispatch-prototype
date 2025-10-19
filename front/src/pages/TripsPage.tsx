import {
  Button,
  Divider,
  Flex,
  Paper,
  Select,
  Stack,
  Text,
  Title,
} from '@mantine/core'
import { useState } from 'react'
import { LocationPicker } from '@/components/location/LocationPicker'
import type { LocationValue } from '@/types/maps'

export const TripsPage = () => {
  const [pickupLocation, setPickupLocation] = useState<LocationValue | null>(null)
  const [dropoffLocation, setDropoffLocation] = useState<LocationValue | null>(null)

  return (
    <Flex gap="xl" align="stretch" h="100%">
      <Paper shadow="xs" radius="md" p="xl" withBorder flex="1">
        <Stack gap="md">
          <Title order={4}>Request Trip</Title>
          <Select label="Select Rider" placeholder="Choose rider" data={[]} />
          <Divider />
          <LocationPicker
            label="Pickup"
            value={pickupLocation}
            onChange={setPickupLocation}
            countryCodes={['dz']}
            height={280}
            mapId="trip-pickup"
          />
          <LocationPicker
            label="Dropoff"
            value={dropoffLocation}
            onChange={setDropoffLocation}
            countryCodes={['dz']}
            height={280}
            mapId="trip-dropoff"
          />
          <Divider />
          <Button radius="md">Submit Trip Request</Button>
        </Stack>
      </Paper>
      <Stack flex={1.2} gap="md">
        <Title order={4}>Dispatch Timeline</Title>
        <Paper withBorder radius="md" p="md" shadow="xs">
          <Text c="dimmed">
            Dispatch events will appear here: pooling window, candidate drivers, solver outputs, and offers.
          </Text>
        </Paper>
      </Stack>
    </Flex>
  )
}
