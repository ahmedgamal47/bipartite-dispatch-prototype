import {
  Button,
  Group,
  Loader,
  Paper,
  Select,
  Stack,
  Text,
  TextInput,
} from '@mantine/core'
import { useEffect, useId, useMemo, useState } from 'react'
import { MapCanvas } from '@/components/map/MapCanvas'
import { useGeocodeSearch } from '@/features/maps/api'
import type { GeocodeResult, LocationValue } from '@/types/maps'

type LocationPickerProps = {
  label: string
  value: LocationValue | null
  onChange: (value: LocationValue | null) => void
  referenceValue?: LocationValue | null
  placeholder?: string
  searchPlaceholder?: string
  height?: number
  countryCodes?: string[]
  mapId?: string
}

export const LocationPicker = ({
  label,
  value,
  onChange,
  placeholder = 'Tap map or use search to select a point',
  searchPlaceholder = 'Search a place or address',
  height = 320,
  countryCodes,
  mapId,
  referenceValue,
}: LocationPickerProps) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState<GeocodeResult[]>([])
  const [selectedResultValue, setSelectedResultValue] = useState<string | null>(null)
  const geocodeSearch = useGeocodeSearch()
  const autoId = useId()
  const canvasKey = mapId ?? autoId

  useEffect(() => {
    // Keep summary list in sync when parent resets value
    if (!value) {
      setSelectedResultValue(null)
      setSearchQuery('')
      setResults([])
      return
    }
  }, [value])

  const summary = useMemo(() => {
    if (!value) {
      return placeholder
    }
    return value.label ?? `${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}`
  }, [value, placeholder])

  const handleMapSelect = (point: { lat: number; lng: number }) => {
    onChange({ lat: point.lat, lng: point.lng })
    setSelectedResultValue(null)
  }

  const handleSearch = async () => {
    const trimmed = searchQuery.trim()
    if (!trimmed) {
      return
    }

    try {
      const payload = {
        query: trimmed,
        limit: 5,
        countryCodes,
      }
      const data = await geocodeSearch.mutateAsync(payload)
      setResults(data)
      if (data.length) {
        const first = data[0]
        setSelectedResultValue('0')
        onChange({ lat: first.lat, lng: first.lng, label: first.label })
      } else {
        setSelectedResultValue(null)
      }
    } catch (error) {
      console.error('Geocode search failed', error)
    }
  }

  const handleSuggestionChange = (nextValue: string | null) => {
    setSelectedResultValue(nextValue)
    if (nextValue === null) {
      return
    }

    const index = Number(nextValue)
    const suggestion = results[index]
    if (suggestion) {
      onChange({ lat: suggestion.lat, lng: suggestion.lng, label: suggestion.label })
    }
  }

  const clearSelection = () => {
    onChange(null)
    setSearchQuery('')
    setResults([])
    setSelectedResultValue(null)
  }

  return (
    <Stack gap="sm">
      <Group justify="space-between" align="flex-end">
        <Text fw={600}>{label}</Text>
        {value && (
          <Button size="xs" variant="subtle" color="red" onClick={clearSelection}>
            Clear
          </Button>
        )}
      </Group>
      <Group align="flex-end" wrap="wrap">
        <TextInput
          label="Search"
          placeholder={searchPlaceholder}
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.currentTarget.value)}
          flex={1}
        />
        <Button onClick={handleSearch} loading={geocodeSearch.isPending} variant="light">
          Lookup
        </Button>
      </Group>
      {geocodeSearch.isPending ? (
        <Loader size="sm" />
      ) : results.length > 0 ? (
        <Select
          label="Suggestions"
          placeholder="Select a location"
          data={results.map((item, index) => ({ value: String(index), label: item.label }))}
          value={selectedResultValue}
          onChange={handleSuggestionChange}
          nothingFoundMessage="No results"
        />
      ) : null}
      <TextInput label="Selection" value={summary} readOnly />
      <Paper withBorder radius="md" p="xs" style={{ height }}>
        <MapCanvas
          selectedPoint={value ?? undefined}
          onSelectPoint={handleMapSelect}
          staticPoints={referenceValue ? [referenceValue] : undefined}
          key={canvasKey}
        />
      </Paper>
    </Stack>
  )
}
