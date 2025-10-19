import type { TripStatus } from '../trips/schemas/trip.schema'
import type { DriverStatus } from '../drivers/schemas/driver.schema'

export type PoolEntry = {
  id: string
  riderId: string
  status: TripStatus
  pickup: {
    lat: number
    lng: number
    address?: string
    h3Index: string
  }
  dropoff: {
    lat: number
    lng: number
    address?: string
    h3Index: string
  }
  tags: string[]
  createdAt: string
  updatedAt: string
}

export type PoolBatch = {
  h3Index: string
  trips: PoolEntry[]
  windowStart: string
  updatedAt: string
}

export type MatchingResult = {
  h3Index: string
  tripIds: string[]
  assignments: MatchingAssignment[]
  unassigned: string[]
  strategy: string
  generatedAt: string
  metadata: {
    driversConsidered: number
  }
}

export type MatchingAssignment = {
  tripId: string
  driverId: string
  driverName: string
  driverStatus: DriverStatus
  distanceMeters: number
}

export type TelemetryEventType = 'trip_queued' | 'pool_flushed' | 'matching_result'

export type TelemetryEvent = {
  id: string
  timestamp: string
  type: TelemetryEventType
  data: Record<string, unknown>
}
