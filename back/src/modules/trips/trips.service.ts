import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import { H3Service } from '../../common/h3.service'
import { CreateTripDto } from './dto/create-trip.dto'
import { UpdateTripDto } from './dto/update-trip.dto'
import { Trip, TripDocument } from './schemas/trip.schema'

@Injectable()
export class TripsService {
  constructor(
    @InjectModel(Trip.name) private readonly tripModel: Model<TripDocument>,
    private readonly h3Service: H3Service,
  ) {}

  async create(payload: CreateTripDto) {
    const riderId = new Types.ObjectId(payload.riderId)
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
    return saved.toObject()
  }

  async findAll() {
    const trips = await this.tripModel.find().exec()
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
    return trip.toObject()
  }
}
