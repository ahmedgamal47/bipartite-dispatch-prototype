import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import { H3Service } from '../../common/h3.service'
import { CreateTripDto } from './dto/create-trip.dto'
import { UpdateTripDto } from './dto/update-trip.dto'
import { Trip, TripDocument, TripStatus } from './schemas/trip.schema'
import { Rider, RiderDocument } from '../riders/schemas/rider.schema'
import { PoolingService } from '../dispatch/services/pooling.service'
import type { PoolEntry } from '../dispatch/types'

@Injectable()
export class TripsService {
  constructor(
    @InjectModel(Trip.name) private readonly tripModel: Model<TripDocument>,
    @InjectModel(Rider.name) private readonly riderModel: Model<RiderDocument>,
    private readonly h3Service: H3Service,
    private readonly poolingService: PoolingService,
  ) {}

  async create(payload: CreateTripDto) {
    const riderId = new Types.ObjectId(payload.riderId)
    const riderExists = await this.riderModel.exists({ _id: riderId }).exec()
    if (!riderExists) {
      throw new NotFoundException(`Rider ${payload.riderId} not found`)
    }
    const pickupH3 = this.h3Service.indexFor(payload.pickup.lat, payload.pickup.lng)
    const dropoffH3 = this.h3Service.indexFor(payload.dropoff.lat, payload.dropoff.lng)

    const document = new this.tripModel({
      riderId,
      pickup: { ...payload.pickup, h3Index: pickupH3 },
      dropoff: { ...payload.dropoff, h3Index: dropoffH3 },
      status: payload.status ?? 'queued',
      tags: payload.tags ?? [],
    })

    const saved = await document.save()
    const object = saved.toObject()

    this.poolingService.queueTrip(this.asPoolEntry(object))

    return object
  }

  async findAll() {
    const trips = await this.tripModel
      .find()
      .sort({ createdAt: -1 })
      .exec()
    return trips.map((trip) => trip.toObject())
  }

  async findOne(id: string) {
    const trip = await this.tripModel.findById(id).exec()
    if (!trip) {
      throw new NotFoundException(`Trip ${id} not found`)
    }
    return trip.toObject()
  }

  async update(id: string, payload: UpdateTripDto) {
    const trip = await this.tripModel.findById(id).exec()
    if (!trip) {
      throw new NotFoundException(`Trip ${id} not found`)
    }

    if (payload.pickup) {
      const pickupH3 = this.h3Service.indexFor(payload.pickup.lat, payload.pickup.lng)
      trip.pickup = { ...trip.pickup, ...payload.pickup, h3Index: pickupH3 }
    }

    if (payload.dropoff) {
      const dropoffH3 = this.h3Service.indexFor(payload.dropoff.lat, payload.dropoff.lng)
      trip.dropoff = { ...trip.dropoff, ...payload.dropoff, h3Index: dropoffH3 }
    }

    if (payload.status) {
      trip.status = payload.status
    }

    if (payload.tags) {
      trip.tags = payload.tags
    }

    if (payload.riderId) {
      trip.riderId = new Types.ObjectId(payload.riderId)
    }

    await trip.save()
    const object = trip.toObject()
    this.poolingService.queueTrip(this.asPoolEntry(object))
    return object
  }

  async remove(id: string) {
    const trip = await this.tripModel.findById(id).exec()
    if (!trip) {
      throw new NotFoundException(`Trip ${id} not found`)
    }

    await trip.deleteOne()
  }

  async removeAll() {
    await this.tripModel.deleteMany({}).exec()
  }

  async bulkGenerate(count: number, coordinates: [number, number][], riderIds?: string[]) {
    if (coordinates.length < 3) {
      throw new BadRequestException('Polygon must have at least three points')
    }

    const riderFilter = riderIds && riderIds.length ? { _id: { $in: riderIds.map((id) => new Types.ObjectId(id)) } } : {}
    const riders = await this.riderModel.find(riderFilter).lean().exec()

    if (!riders.length) {
      throw new BadRequestException('No riders available for trip generation')
    }

    const documents: TripDocument[] = []

    for (let i = 0; i < count; i++) {
      const rider = riders[Math.floor(Math.random() * riders.length)]
      const pickupPoint = this.randomPointInPolygon(coordinates)
      let dropoffPoint = this.randomPointInPolygon(coordinates)

      // ensure dropoff differs meaningfully from pickup
      if (Math.abs(dropoffPoint[0] - pickupPoint[0]) < 1e-6 && Math.abs(dropoffPoint[1] - pickupPoint[1]) < 1e-6) {
        dropoffPoint = this.randomPointInPolygon(coordinates)
      }

      const pickupH3 = this.h3Service.indexFor(pickupPoint[1], pickupPoint[0])
      const dropoffH3 = this.h3Service.indexFor(dropoffPoint[1], dropoffPoint[0])

      const trip = new this.tripModel({
        riderId: rider._id,
        pickup: {
          lat: pickupPoint[1],
          lng: pickupPoint[0],
          h3Index: pickupH3,
        },
        dropoff: {
          lat: dropoffPoint[1],
          lng: dropoffPoint[0],
          h3Index: dropoffH3,
        },
        status: 'queued',
        tags: ['generated'],
      })

      documents.push(trip)
    }

    if (!documents.length) {
      return 0
    }

    const inserted = await this.tripModel.insertMany(documents)

    inserted.forEach((doc) => this.poolingService.queueTrip(this.asPoolEntry(doc.toObject())))
    return inserted.length
  }

  private asPoolEntry(doc: any): PoolEntry {
    return {
      id: doc.id,
      riderId: doc.riderId.toString(),
      status: doc.status as TripStatus,
      pickup: {
        lat: doc.pickup.lat,
        lng: doc.pickup.lng,
        address: doc.pickup.address,
        h3Index: doc.pickup.h3Index,
      },
      dropoff: {
        lat: doc.dropoff.lat,
        lng: doc.dropoff.lng,
        address: doc.dropoff.address,
        h3Index: doc.dropoff.h3Index,
      },
      tags: doc.tags ?? [],
      createdAt: new Date(doc.createdAt).toISOString(),
      updatedAt: new Date(doc.updatedAt).toISOString(),
    }
  }

  private randomPointInPolygon(polygon: [number, number][]) {
    const [minLng, maxLng] = polygon.reduce(
      (acc, [lng]) => [Math.min(acc[0], lng), Math.max(acc[1], lng)],
      [polygon[0][0], polygon[0][0]],
    )
    const [minLat, maxLat] = polygon.reduce(
      (acc, [, lat]) => [Math.min(acc[0], lat), Math.max(acc[1], lat)],
      [polygon[0][1], polygon[0][1]],
    )

    while (true) {
      const lng = minLng + Math.random() * (maxLng - minLng)
      const lat = minLat + Math.random() * (maxLat - minLat)
      if (this.pointInPolygon([lng, lat], polygon)) {
        return [lng, lat] as [number, number]
      }
    }
  }

  private pointInPolygon(point: [number, number], polygon: [number, number][]) {
    const [x, y] = point
    let inside = false
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][0]
      const yi = polygon[i][1]
      const xj = polygon[j][0]
      const yj = polygon[j][1]
      const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
      if (intersect) inside = !inside
    }
    return inside
  }
}
