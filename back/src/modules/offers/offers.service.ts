import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import { Offer, OfferDocument } from './schemas/offer.schema'
import { MatchingResult } from '../dispatch/types'
import { Trip, TripDocument } from '../trips/schemas/trip.schema'
import { Driver, DriverDocument } from '../drivers/schemas/driver.schema'

@Injectable()
export class OffersService {
  constructor(
    @InjectModel(Offer.name) private readonly offerModel: Model<OfferDocument>,
    @InjectModel(Trip.name) private readonly tripModel: Model<TripDocument>,
    @InjectModel(Driver.name) private readonly driverModel: Model<DriverDocument>,
  ) {}

  async createForMatching(result: MatchingResult) {
    if (!result.assignments.length) {
      return
    }

    const offers: OfferDocument[] = []
    for (const assignment of result.assignments) {
      await this.expireExistingOffers(assignment.tripId)

      const offer = new this.offerModel({
        tripId: new Types.ObjectId(assignment.tripId),
        driverId: assignment.driverId,
        driverName: assignment.driverName,
        driverStatus: assignment.driverStatus,
        distanceMeters: assignment.distanceMeters,
        status: 'pending',
      })

      offers.push(offer)
    }

    if (offers.length) {
      await this.offerModel.insertMany(offers)
      // Mark trips as offering
      await this.tripModel.updateMany(
        { _id: { $in: offers.map((offer) => offer.tripId) } },
        { $set: { status: 'offering' } },
      )

      // Trip statuses updated when offers created
    }
  }

  async listPending() {
    const offers = await this.offerModel.find({ status: 'pending' }).exec()
    return offers.map((offer) => offer.toObject())
  }

  async respond(id: string, status: 'accepted' | 'declined') {
    const offer = await this.offerModel.findById(id).exec()
    if (!offer) {
      throw new NotFoundException(`Offer ${id} not found`)
    }

    offer.status = status
    offer.respondedAt = new Date()
    await offer.save()

    const driverObjectId = Types.ObjectId.isValid(offer.driverId)
      ? new Types.ObjectId(offer.driverId)
      : offer.driverId

    if (status === 'accepted') {
      await Promise.all([
        this.tripModel.updateOne({ _id: offer.tripId }, { $set: { status: 'assigned' } }).exec(),
        this.driverModel.updateOne({ _id: driverObjectId }, { $set: { status: 'busy' } }).exec(),
      ])
    } else {
      await Promise.all([
        this.tripModel.updateOne({ _id: offer.tripId }, { $set: { status: 'queued' } }).exec(),
        this.driverModel.updateOne({ _id: driverObjectId }, { $set: { status: 'available' } }).exec(),
      ])
    }

    return offer.toObject()
  }

  private async expireExistingOffers(tripId: string) {
    await this.offerModel.updateMany(
      { tripId: new Types.ObjectId(tripId), status: 'pending' },
      { $set: { status: 'expired', respondedAt: new Date() } },
    )
  }
}
