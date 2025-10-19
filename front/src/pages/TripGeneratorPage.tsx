import {
  Button,
  Card,
  Group,
  MultiSelect,
  NumberInput,
  Stack,
  Text,
  Title,
} from '@mantine/core'
import { useState, useMemo } from 'react'
import { MapContainer, Polygon, TileLayer, useMapEvents } from 'react-leaflet'
import type { LatLngExpression, LatLngLiteral } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { notifications } from '@mantine/notifications'
import { useRidersQuery } from '@/features/riders/api'
import { generateTrips } from '@/features/trips/api-extra'

const defaultCenter: LatLngExpression = [36.7538, 3.0589]

const DrawingLayer = ({ onUpdate }: { onUpdate: (pts: LatLngLiteral[] | ((prev: LatLngLiteral[]) => LatLngLiteral[])) => void }) => {
  useMapEvents({
    click(event) {
      onUpdate((prev) => [...prev, event.latlng])
    },
    contextmenu() {
      onUpdate([])
    },
  })
  return null
}

export const TripGeneratorPage = () => {
  const ridersQuery = useRidersQuery()
  const riderOptions = useMemo(
    () =>
      ridersQuery.data?.map((rider) => ({ value: rider.id, label: `${rider.name} (${rider.phone})` })) ?? [],
    [ridersQuery.data],
  )

  const [riderSelection, setRiderSelection] = useState<string[]>([])
  const [polygon, setPolygon] = useState<LatLngLiteral[]>([])
  const [count, setCount] = useState(10)
  const polygonPoints = polygon.length ? ([...polygon, polygon[0]] as LatLngExpression[]) : []

  const handleGenerate = async () => {
    if (polygon.length < 3) {
      notifications.show({
        title: 'Polygon incomplete',
        message: 'Click at least three points to define an area (right click to reset).',
        color: 'yellow',
      })
      return
    }
    if (!ridersQuery.data?.length) {
      notifications.show({
        title: 'No riders',
        message: 'Create riders before generating trips.',
        color: 'red',
      })
      return
    }

    try {
      await generateTrips({
        count,
        polygon: polygon.map((point) => [point.lng, point.lat]),
        riderIds: riderSelection.length ? riderSelection : undefined,
      })
      notifications.show({
        title: 'Trips created',
        message: `${count} trips generated in the selected fence.`,
        color: 'green',
      })
      setPolygon([])
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unable to generate trips'
      notifications.show({ title: 'Generation failed', message, color: 'red' })
    }
  }

  return (
    <Stack gap="lg">
      <Title order={3}>Trip Generator</Title>
      <Text c="dimmed">
        Click the map to draw a polygon area (right click clears). Select riders (optional) and how many trips to
        generate, then submit to create random pickup/dropoff pairs inside the fence.
      </Text>
      <Group align="flex-end" gap="md">
        <NumberInput
          label="Number of trips"
          min={1}
          max={500}
          value={count}
          onChange={(value) => setCount(Number(value) || 1)}
        />
        <MultiSelect
          label="Riders"
          placeholder={ridersQuery.isLoading ? 'Loading riders…' : 'Use all riders'}
          data={riderOptions}
          value={riderSelection}
          onChange={setRiderSelection}
          searchable
          clearable
        />
        <Text size="sm" c="dimmed">
          Points: {polygon.length}
        </Text>
        <Button variant="subtle" onClick={() => setPolygon([])}>
          Clear Polygon
        </Button>
        <Button onClick={handleGenerate}>Generate Trips</Button>
      </Group>
      <Card withBorder radius="md" style={{ height: 480, overflow: 'hidden' }}>
        <MapContainer
          center={defaultCenter}
          zoom={12}
          style={{ width: '100%', height: '100%' }}
          scrollWheelZoom
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <DrawingLayer onUpdate={setPolygon} />
          {polygonPoints.length ? <Polygon positions={polygonPoints} color="purple" opacity={0.5} /> : null}
        </MapContainer>
      </Card>
    </Stack>
  )
}

