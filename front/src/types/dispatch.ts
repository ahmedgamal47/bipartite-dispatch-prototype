export type DriverStatus = 'available' | 'busy' | 'offline'

export type DriverProfile = {
  id: string
  name: string
  status: DriverStatus
  rating: number
  location: {
    lat: number
    lng: number
    h3Index: string
  }
  vehicleNotes?: string
  updatedAt: string
  createdAt: string
}

export type RiderProfile = {
  id: string
  name: string
  phone: string
  defaultPickup?: {
    lat: number
    lng: number
    address?: string
    h3Index?: string
  }
  createdAt: string
}

export type TripRequest = {
  id: string
  riderId: string
  pickup: {
    lat: number
    lng: number
    address?: string
    h3Index?: string
  }
  dropoff: {
    lat: number
    lng: number
    address?: string
    h3Index?: string
  }
  status:
    | 'queued'
    | 'pooling'
    | 'matched'
    | 'offering'
    | 'assigned'
    | 'no_driver'
    | 'expired'
  createdAt: string
  updatedAt: string
}

export type OfferRecord = {
  id: string
  tripId: string
  driverId: string
  status: 'pending' | 'accepted' | 'declined' | 'expired'
  responseMs?: number
  expiresAt: string
}

export type MatchingAssignment = {
  tripId: string
  driverId: string
  driverName: string
  driverStatus: DriverStatus
  distanceMeters: number
}
