import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import type { Model } from 'mongoose'
import { Driver, DriverDocument } from '../../drivers/schemas/driver.schema'
import type { PoolBatch, MatchingResult, MatchingAssignment } from '../types'

const EARTH_RADIUS_METERS = 6_371_000

@Injectable()
export class MatchingService {
  constructor(@InjectModel(Driver.name) private readonly driverModel: Model<DriverDocument>) {}

  async solve(batch: PoolBatch): Promise<MatchingResult> {
    const drivers = await this.driverModel
      .find({ status: 'available' })
      .lean()
      .exec()

    const availableDrivers = drivers.map((driver) => ({
      id: driver._id.toString(),
      name: driver.name,
      status: driver.status,
      location: driver.location,
      rating: driver.rating,
    }))

    const assignments: MatchingAssignment[] = []
    const unassigned: string[] = []
    const usedDrivers = new Set<string>()

    for (const trip of batch.trips) {
      let bestDriver: (typeof availableDrivers)[number] | undefined
      let bestDistance = Number.POSITIVE_INFINITY

      for (const driver of availableDrivers) {
        if (usedDrivers.has(driver.id)) {
          continue
        }

        const distance = this.haversineMeters(
          trip.pickup.lat,
          trip.pickup.lng,
          driver.location.lat,
          driver.location.lng,
        )

        if (distance < bestDistance) {
          bestDriver = driver
          bestDistance = distance
        }
      }

      if (bestDriver) {
        usedDrivers.add(bestDriver.id)
        assignments.push({
          tripId: trip.id,
          driverId: bestDriver.id,
          driverName: bestDriver.name,
          driverStatus: bestDriver.status,
          distanceMeters: Math.round(bestDistance),
        })
      } else {
        unassigned.push(trip.id)
      }
    }

    return {
      h3Index: batch.h3Index,
      tripIds: batch.trips.map((trip) => trip.id),
      assignments,
      unassigned,
      strategy: 'nearest-driver',
      generatedAt: new Date().toISOString(),
      metadata: {
        driversConsidered: availableDrivers.length,
      },
    }
  }

  private haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
    const toRad = (value: number) => (value * Math.PI) / 180
    const dLat = toRad(lat2 - lat1)
    const dLon = toRad(lon2 - lon1)
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return EARTH_RADIUS_METERS * c
  }
}
