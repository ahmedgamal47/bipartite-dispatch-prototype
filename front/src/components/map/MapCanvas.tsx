import { Box } from '@mantine/core'
import L from 'leaflet'
import type { LatLngExpression, LeafletEventHandlerFnMap, LeafletMouseEvent } from 'leaflet'
import { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, Marker, Polygon, TileLayer, useMapEvents } from 'react-leaflet'
import { cellToBoundary, latLngToCell } from 'h3-js'

import 'leaflet/dist/leaflet.css'

import markerIcon2xUrl from 'leaflet/dist/images/marker-icon-2x.png?url'
import markerIconUrl from 'leaflet/dist/images/marker-icon.png?url'
import markerShadowUrl from 'leaflet/dist/images/marker-shadow.png?url'

type MapCanvasProps = {
  center?: [number, number]
  zoom?: number
  selectedPoint?: { lng: number; lat: number }
  onSelectPoint?: (coords: { lng: number; lat: number }) => void
  staticPoints?: Array<{ lng: number; lat: number }>
  showH3Cells?: boolean
}

const h3ResolutionEnv = Number.parseInt(import.meta.env.VITE_H3_RESOLUTION ?? '', 10)
const H3_RESOLUTION = Number.isFinite(h3ResolutionEnv) ? h3ResolutionEnv : 8

// Configure default marker assets once per bundle load.
const defaultMarkerIcon = L.icon({
  iconRetinaUrl: markerIcon2xUrl,
  iconUrl: markerIconUrl,
  shadowUrl: markerShadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41],
})

const staticMarkerIcon = L.divIcon({
  className: 'map-static-marker',
  html: '<span class="map-static-marker__dot"></span>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
})

const ClickHandler = ({ onSelectPoint }: { onSelectPoint?: MapCanvasProps['onSelectPoint'] }) => {
  useMapEvents({
    click(event: LeafletMouseEvent) {
      onSelectPoint?.({ lng: event.latlng.lng, lat: event.latlng.lat })
    },
  })
  return null
}

/**
 * Lightweight wrapper around Leaflet to keep map setup in one place.
 */
export const MapCanvas = ({
  center = [3.0589, 36.7538],
  zoom = 13,
  selectedPoint,
  onSelectPoint,
  staticPoints,
  showH3Cells = false,
}: MapCanvasProps) => {
  const fallbackLat = center[1]
  const fallbackLng = center[0]
  const fallbackCenter = useMemo<LatLngExpression>(() => [fallbackLat, fallbackLng], [fallbackLat, fallbackLng])
  const [markerPosition, setMarkerPosition] = useState<LatLngExpression | null>(() =>
    selectedPoint ? ([selectedPoint.lat, selectedPoint.lng] as LatLngExpression) : null,
  )
  const lastSelectedRef = useRef<{ lat: number; lng: number } | null>(
    selectedPoint ? { lat: selectedPoint.lat, lng: selectedPoint.lng } : null,
  )
  const pendingUserUpdateRef = useRef(false)

  useEffect(() => {
    if (!selectedPoint) {
      lastSelectedRef.current = null
      if (markerPosition !== null) {
        setMarkerPosition(null)
      }
      return
    }

    const incoming = { lat: selectedPoint.lat, lng: selectedPoint.lng }
    const lastSent = lastSelectedRef.current

    const isSame =
      !!lastSent && Math.abs(lastSent.lat - incoming.lat) < 1e-6 && Math.abs(lastSent.lng - incoming.lng) < 1e-6

    if (pendingUserUpdateRef.current) {
      if (isSame) {
        pendingUserUpdateRef.current = false
        return
      }
      pendingUserUpdateRef.current = false
    }

    if (!isSame) {
      lastSelectedRef.current = incoming
      setMarkerPosition([incoming.lat, incoming.lng] as LatLngExpression)
    }
  }, [selectedPoint?.lat, selectedPoint?.lng, markerPosition])

  const submitSelection = (coords: { lat: number; lng: number }) => {
    pendingUserUpdateRef.current = true
    lastSelectedRef.current = coords
    setMarkerPosition([coords.lat, coords.lng] as LatLngExpression)
    onSelectPoint?.(coords)
  }

  const mapCenter = markerPosition ?? fallbackCenter

  const filteredStaticPoints = useMemo(() => {
    if (!staticPoints || !markerPosition) {
      return staticPoints ?? []
    }
    let markerLat: number
    let markerLng: number
    if (Array.isArray(markerPosition)) {
      const tuple = markerPosition as [number, number]
      markerLat = tuple[0]
      markerLng = tuple[1]
    } else if ('lat' in markerPosition && 'lng' in markerPosition) {
      markerLat = (markerPosition as L.LatLng).lat
      markerLng = (markerPosition as L.LatLng).lng
    } else {
      markerLat = fallbackLat
      markerLng = fallbackLng
    }

    return staticPoints.filter((point) => {
      return Math.abs(point.lat - markerLat) > 1e-6 || Math.abs(point.lng - markerLng) > 1e-6
    })
  }, [staticPoints, markerPosition, fallbackLat, fallbackLng])

  const resolvedCenter = useMemo(() => {
    if (markerPosition) {
      if (Array.isArray(markerPosition)) {
        return { lat: markerPosition[0], lng: markerPosition[1] }
      }
      if ('lat' in markerPosition && 'lng' in markerPosition) {
        const typed = markerPosition as L.LatLng
        return { lat: typed.lat, lng: typed.lng }
      }
    }
    return { lat: fallbackLat, lng: fallbackLng }
  }, [markerPosition, fallbackLat, fallbackLng])

  const markerKey = useMemo(() => {
    if (!markerPosition) {
      return 'marker-none'
    }
    if (Array.isArray(markerPosition)) {
      return `marker-${markerPosition[0]}-${markerPosition[1]}`
    }
    if ('lat' in markerPosition && 'lng' in markerPosition) {
      return `marker-${markerPosition.lat}-${markerPosition.lng}`
    }
    return 'marker-generic'
  }, [markerPosition])

  const markerEventHandlers: LeafletEventHandlerFnMap | undefined = onSelectPoint
    ? {
        dragend(event) {
          const marker = event.target as L.Marker
          const position = marker.getLatLng()
          submitSelection({ lat: position.lat, lng: position.lng })
        },
      }
    : undefined

  const hexPolygons = useMemo(() => {
    if (!showH3Cells) {
      return []
    }
    const points: Array<{ lat: number; lng: number }> = []
    if (selectedPoint) {
      points.push({ lat: selectedPoint.lat, lng: selectedPoint.lng })
    }
    if (staticPoints?.length) {
      for (const point of staticPoints) {
        points.push({ lat: point.lat, lng: point.lng })
      }
    }

    if (points.length === 0) {
      points.push(resolvedCenter)
    }

    const unique = new Map<string, LatLngExpression[]>()

    for (const point of points) {
      try {
        const index = latLngToCell(point.lat, point.lng, H3_RESOLUTION)
        if (unique.has(index)) {
          continue
        }
        const boundary = cellToBoundary(index).map(([lat, lng]) => [lat, lng] as LatLngExpression)
        unique.set(index, boundary)
      } catch (error) {
        console.warn('Failed to build H3 cell for point', point, error)
      }
    }

    return Array.from(unique.entries())
  }, [selectedPoint?.lat, selectedPoint?.lng, staticPoints, showH3Cells, resolvedCenter.lat, resolvedCenter.lng])

  return (
    <Box style={{ width: '100%', height: '100%', borderRadius: '12px', overflow: 'hidden' }}>
      <MapContainer
        center={mapCenter}
        zoom={zoom}
        style={{ width: '100%', height: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution="&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onSelectPoint={submitSelection} />
        {showH3Cells &&
          hexPolygons.map(([index, boundary]) => (
            <Polygon
              key={`h3-${index}`}
              positions={boundary}
              pathOptions={{ color: '#2f9e44', weight: 1, fillOpacity: 0.1 }}
            />
          ))}
        {filteredStaticPoints.map((point, index) => (
          <Marker
            key={`static-${index}-${point.lat}-${point.lng}`}
            position={[point.lat, point.lng] as LatLngExpression}
            icon={staticMarkerIcon}
            interactive={false}
          />
        ))}
        {markerPosition && (
          <Marker
            key={markerKey}
            position={markerPosition}
            icon={defaultMarkerIcon}
            draggable={Boolean(onSelectPoint)}
            eventHandlers={markerEventHandlers}
          />
        )}
      </MapContainer>
    </Box>
  )
}
