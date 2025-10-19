import { Injectable, NotFoundException } from '@nestjs/common'
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
}
