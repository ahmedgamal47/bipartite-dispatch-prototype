import type { TripStatus, DispatchMode } from '../trips/schemas/trip.schema'
import type { DriverStatus } from '../drivers/schemas/driver.schema'

export type PoolEntry = {
  id: string
  riderId: string
  status: TripStatus
  dispatchMode: DispatchMode
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
  scorecards: MatchingScorecard[]
}

export type MatchingAssignment = {
  tripId: string
  driverId: string
  driverName: string
  driverStatus: DriverStatus
  distanceMeters: number
}

export type MatchingScorecard = {
  tripId: string
  riderId: string
  candidates: MatchingCandidateScore[]
  selectedDriverId: string | null
}

export type MatchingCandidateScore = {
  driverId: string
  driverName: string
  driverStatus: DriverStatus
  distanceMeters: number
  distanceScore: number
  rating: number
  ratingScore: number
  blendedCost: number
  isCandidate: boolean
}

export type TelemetryEventType =
  | 'trip_queued'
  | 'pool_flushed'
  | 'matching_result'
  | 'offer_created'
  | 'offer_accepted'
  | 'offer_declined'
  | 'offer_timeout'
  | 'single_dispatch_started'
  | 'trip_no_driver'

export type TelemetryEvent = {
  id: string
  timestamp: string
  type: TelemetryEventType
  data: Record<string, unknown>
}
