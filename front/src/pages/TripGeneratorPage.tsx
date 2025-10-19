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
import type { LatLngExpression, LatLngLiteral, LatLngTuple } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { notifications } from '@mantine/notifications'
import { useRidersQuery } from '@/features/riders/api'
import { generateTrips } from '@/features/trips/api-extra'
import { cellToBoundary, gridDisk, latLngToCell } from 'h3-js'

const defaultCenter: LatLngTuple = [36.7538, 3.0589]
const h3Resolution = Number.isFinite(Number(import.meta.env.VITE_H3_RESOLUTION))
  ? Number(import.meta.env.VITE_H3_RESOLUTION)
  : 8

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

  const hexPolygons = useMemo(() => {
    const seeds = polygon.length
      ? polygon.map((point) => ({ lat: point.lat, lng: point.lng }))
      : [{ lat: defaultCenter[0], lng: defaultCenter[1] }]

    const unique = new Map<string, LatLngTuple[]>()

    for (const seed of seeds) {
      try {
        const origin = latLngToCell(seed.lat, seed.lng, h3Resolution)
        const disk = gridDisk(origin, 1)
        const cellIndexes = Array.isArray(disk) ? disk : Array.from(disk as Iterable<string>)
        cellIndexes.forEach((index) => {
          if (unique.has(index)) {
            return
          }
          const boundary = cellToBoundary(index).map(([lat, lng]) => [lat, lng] as LatLngTuple)
          unique.set(index, boundary)
        })
      } catch {
        // ignore
      }
    }

    return Array.from(unique.values())
  }, [polygon])

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
            attribution="&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors &copy; <a href='https://carto.com/attributions'>CARTO</a>"
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />
          {hexPolygons.map((boundary, index) => (
            <Polygon
              key={`trip-h3-cell-${index}`}
              positions={boundary}
              pathOptions={{ color: '#adb5bd', weight: 1, fillOpacity: 0 }}
            />
          ))}
          <DrawingLayer onUpdate={setPolygon} />
          {polygonPoints.length ? <Polygon positions={polygonPoints} color="purple" opacity={0.5} /> : null}
        </MapContainer>
      </Card>
    </Stack>
  )
}
