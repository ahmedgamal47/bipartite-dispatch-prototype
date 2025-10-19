import { Badge, Card, Center, Group, Loader, Stack, Text, Title } from '@mantine/core'
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from 'react-leaflet'
import type { LatLngTuple } from 'leaflet'
import { useEffect, useMemo } from 'react'
import 'leaflet/dist/leaflet.css'
import { useDriversQuery } from '@/features/drivers/api'
import { useTripsQuery } from '@/features/trips/api'

const DEFAULT_CENTER: LatLngTuple = [36.7538, 3.0589]

type FitBoundsProps = {
  points: LatLngTuple[]
}

const FitBounds = ({ points }: FitBoundsProps) => {
  const map = useMap()

  useEffect(() => {
    if (!points.length) {
      return
    }
    if (points.length === 1) {
      map.setView(points[0], 13)
      return
    }
    map.fitBounds(points, { padding: [32, 32] })
  }, [map, points])

  return null
}

export const LiveMapPage = () => {
  const driversQuery = useDriversQuery({ refetchInterval: 5_000 })
  const tripsQuery = useTripsQuery({ refetchInterval: 5_000 })

  const drivers = driversQuery.data ?? []
  const availableDrivers = useMemo(
    () => drivers.filter((driver) => driver.status === 'available'),
    [drivers],
  )
  const busyDriverCount = useMemo(
    () => drivers.filter((driver) => driver.status === 'busy').length,
    [drivers],
  )
  const trips = tripsQuery.data ?? []

  const activeTrips = useMemo(
    () =>
      trips.filter((trip) => !['assigned', 'expired'].includes(trip.status)),
    [trips],
  )

  const mapPoints = useMemo(() => {
    const points: LatLngTuple[] = []
    for (const driver of availableDrivers) {
      if (driver.location) {
        points.push([driver.location.lat, driver.location.lng])
      }
    }
    for (const trip of activeTrips) {
      if (trip.pickup) {
        points.push([trip.pickup.lat, trip.pickup.lng])
      }
    }
    return points
  }, [availableDrivers, activeTrips])

  const isLoading = driversQuery.isLoading || tripsQuery.isLoading

  return (
    <Stack gap="lg" h="100%">
      <Group justify="space-between">
        <Stack gap={4}>
          <Title order={2}>Live Dispatch Map</Title>
          <Text c="dimmed" size="sm">
            Monitor available drivers and active trip requests in real time.
          </Text>
        </Stack>
        {isLoading && <Loader size="sm" />}
      </Group>

      <Group gap="md">
        <Card withBorder padding="md" radius="md">
          <Stack gap={2}>
            <Text size="xs" c="dimmed">
              Available Drivers
            </Text>
            <Title order={4}>{availableDrivers.length}</Title>
          </Stack>
        </Card>
        <Card withBorder padding="md" radius="md">
          <Stack gap={2}>
            <Text size="xs" c="dimmed">
              Busy Drivers
            </Text>
            <Title order={4}>{busyDriverCount}</Title>
          </Stack>
        </Card>
        <Card withBorder padding="md" radius="md">
          <Stack gap={2}>
            <Text size="xs" c="dimmed">
              Active Trips
            </Text>
            <Title order={4}>{activeTrips.length}</Title>
          </Stack>
        </Card>
      </Group>

      <Card withBorder radius="lg" padding="0" style={{ flex: 1, overflow: 'hidden' }}>
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={12}
          style={{ width: '100%', height: '100%', minHeight: 480 }}
          scrollWheelZoom
        >
          <TileLayer
            attribution="&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors &copy; <a href='https://carto.com/attributions'>CARTO</a>"
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />
          {mapPoints.length ? <FitBounds points={mapPoints} /> : null}

          {availableDrivers.map((driver) => (
            <CircleMarker
              key={`driver-${driver.id}`}
              center={[driver.location.lat, driver.location.lng]}
              pathOptions={{ color: '#1971c2', fillColor: '#1971c2' }}
              radius={6}
              opacity={0.9}
            >
              <Tooltip direction="top" offset={[0, -4]} opacity={1} permanent={false}>
                <Stack gap={2}>
                  <Text fw={600} size="xs">
                    {driver.name}
                  </Text>
                  <Text size="xs">
                    Rating: {driver.rating.toFixed(1)}
                  </Text>
                  <Text size="xs">
                    H3: {driver.location.h3Index}
                  </Text>
                </Stack>
              </Tooltip>
            </CircleMarker>
          ))}

          {activeTrips.map((trip) => (
            <CircleMarker
              key={`trip-${trip.id}`}
              center={[trip.pickup.lat, trip.pickup.lng]}
              pathOptions={{ color: '#e8590c', fillColor: '#e8590c' }}
              radius={5}
              opacity={0.85}
            >
              <Tooltip direction="top" offset={[0, -4]} opacity={1} permanent={false}>
                <Stack gap={2}>
                  <Text fw={600} size="xs">
                    Trip {trip.id.slice(-6)}
                  </Text>
                  <Text size="xs">
                    Status: <strong>{trip.status.toUpperCase()}</strong>
                  </Text>
                  <Text size="xs">
                    Pickup H3: {trip.pickup.h3Index ?? '—'}
                  </Text>
                </Stack>
              </Tooltip>
            </CircleMarker>
          ))}
        </MapContainer>
      </Card>

      <Card withBorder radius="md">
        <Group gap="md">
          <Group gap={6}>
            <Badge color="blue" size="lg" radius="sm">
              Driver
            </Badge>
            <Text size="sm" c="dimmed">
              Location of available drivers (blue).
            </Text>
          </Group>
          <Group gap={6}>
            <Badge color="orange" size="lg" radius="sm">
              Trip
            </Badge>
            <Text size="sm" c="dimmed">
              Pickup points of active trip requests (orange).
            </Text>
          </Group>
        </Group>
      </Card>

      {!drivers.length && !activeTrips.length && !isLoading && (
        <Center>
          <Text c="dimmed">No drivers or trips to display. Seed the system to populate the map.</Text>
        </Center>
      )}
    </Stack>
  )
}
