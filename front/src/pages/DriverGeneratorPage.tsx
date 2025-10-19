import { Button, Card, Group, NumberInput, Stack, Text, Title } from '@mantine/core'
import { useState } from 'react'
import { MapContainer, Polygon, TileLayer, useMapEvents } from 'react-leaflet'
import type { LatLngExpression, LatLngLiteral } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { notifications } from '@mantine/notifications'
import { generateDrivers } from '@/features/drivers/api-extra'

const defaultCenter: LatLngExpression = [36.7538, 3.0589]

const DrawingLayer = ({ onUpdate }: { onUpdate: (points: LatLngLiteral[] | ((prev: LatLngLiteral[]) => LatLngLiteral[])) => void }) => {
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

export const DriverGeneratorPage = () => {
  const [polygon, setPolygon] = useState<LatLngLiteral[]>([])
  const [count, setCount] = useState(10)
  const polygonPoints = polygon.length ? ([...polygon, polygon[0]] as LatLngExpression[]) : []

  const handleGenerate = async () => {
    if (polygon.length < 3) {
      notifications.show({
        title: 'Polygon incomplete',
        message: 'Please click at least three points to define an area. Right click to reset.',
        color: 'yellow',
      })
      return
    }

    try {
      await generateDrivers({
        count,
        polygon: polygon.map((point) => [point.lng, point.lat]),
      })
      notifications.show({
        title: 'Drivers created',
        message: `${count} drivers generated within the selected area.`,
        color: 'green',
      })
      setPolygon([])
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unable to generate drivers'
      notifications.show({ title: 'Generation failed', message, color: 'red' })
    }
  }

  return (
    <Stack gap="lg">
      <Title order={3}>Driver Generator</Title>
      <Text c="dimmed">
        Click on the map to draw a polygon (right click to reset). Enter how many drivers to generate inside that
        fence, then hit Generate.
      </Text>
      <Group align="flex-end" gap="md">
        <NumberInput
          label="Number of drivers"
          min={1}
          max={500}
          value={count}
          onChange={(value) => setCount(Number(value) || 1)}
        />
        <Text size="sm" c="dimmed">
          Points: {polygon.length}
        </Text>
        <Button onClick={() => setPolygon([])} variant="subtle">
          Clear Polygon
        </Button>
        <Button onClick={handleGenerate}>Generate Drivers</Button>
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
          {polygonPoints.length ? <Polygon positions={polygonPoints} color="blue" opacity={0.5} /> : null}
        </MapContainer>
      </Card>
    </Stack>
  )
}
