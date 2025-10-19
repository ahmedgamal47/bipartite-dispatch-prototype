import { Inject, Injectable, NotFoundException, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Offer, OfferDocument } from './schemas/offer.schema';
import { MatchingResult, PoolEntry } from '../dispatch/types';
import { Trip, TripDocument, TripStatus } from '../trips/schemas/trip.schema';
import { Driver, DriverDocument } from '../drivers/schemas/driver.schema';
import { PoolingService } from '../dispatch/services/pooling.service';

@Injectable()
export class OffersService {
  private readonly offerTimeoutMs: number;
  private readonly timers = new Map<string, NodeJS.Timeout>();

  constructor(
    @InjectModel(Offer.name) private readonly offerModel: Model<OfferDocument>,
    @InjectModel(Trip.name) private readonly tripModel: Model<TripDocument>,
    @InjectModel(Driver.name)
    private readonly driverModel: Model<DriverDocument>,
    @Inject(forwardRef(() => PoolingService))
    private readonly poolingService: PoolingService,
    private readonly configService: ConfigService,
  ) {
    const raw = this.configService.get<string | number>(
      'OFFER_TIMEOUT_SECONDS',
    );
    const parsed =
      typeof raw === 'number'
        ? raw
        : raw !== undefined
          ? Number.parseInt(String(raw), 10)
          : Number.NaN;
    const seconds = Number.isFinite(parsed) && parsed > 0 ? parsed : 30;
    this.offerTimeoutMs = seconds * 1000;
  }

  async createForMatching(result: MatchingResult) {
    if (!result.assignments.length) {
      return;
    }

    const driverIds = result.assignments.map(
      (assignment) => assignment.driverId,
    );
    const driversWithPending = new Set(
      await this.offerModel
        .distinct('driverId', {
          driverId: { $in: driverIds },
          status: 'pending',
        })
        .exec(),
    );
    const tripsToRequeue: Types.ObjectId[] = [];
    const requeuePoolEntries: PoolEntry[] = [];

    const offers: OfferDocument[] = [];
    for (const assignment of result.assignments) {
      const driverObjectId = Types.ObjectId.isValid(assignment.driverId)
        ? new Types.ObjectId(assignment.driverId)
        : assignment.driverId;

      if (driversWithPending.has(assignment.driverId)) {
        tripsToRequeue.push(new Types.ObjectId(assignment.tripId));
        const tripDoc = await this.tripModel.findById(assignment.tripId).exec();
        if (tripDoc) {
          requeuePoolEntries.push(this.toPoolEntry(tripDoc));
        }
        continue;
      }

      await this.expireExistingOffers(assignment.tripId);

      const offer = new this.offerModel({
        tripId: new Types.ObjectId(assignment.tripId),
        driverId: assignment.driverId,
        driverName: assignment.driverName,
        driverStatus: assignment.driverStatus,
        distanceMeters: assignment.distanceMeters,
        status: 'pending',
        expiresAt: new Date(Date.now() + this.offerTimeoutMs),
      });

      const reservation = await this.driverModel
        .updateOne(
          { _id: driverObjectId, status: 'available' },
          { $set: { status: 'reserved' } },
        )
        .exec();

      if (!reservation.modifiedCount) {
        tripsToRequeue.push(new Types.ObjectId(assignment.tripId));
        const tripDoc = await this.tripModel.findById(assignment.tripId).exec();
        if (tripDoc) {
          requeuePoolEntries.push(this.toPoolEntry(tripDoc));
        }
        continue;
      }

      offers.push(offer);
      driversWithPending.add(assignment.driverId);
    }

    if (offers.length) {
      const inserted = await this.offerModel.insertMany(offers);
      // Mark trips as offering
      await this.tripModel.updateMany(
        { _id: { $in: offers.map((offer) => offer.tripId) } },
        { $set: { status: 'offering' } },
      );

      // Trip statuses updated when offers created
      inserted.forEach((doc) => this.registerExpirationTimer(doc));
    }

    if (tripsToRequeue.length) {
      await this.tripModel
        .updateMany(
          { _id: { $in: tripsToRequeue } },
          { $set: { status: 'queued' } },
        )
        .exec();
    }

    requeuePoolEntries.forEach((entry) => this.poolingService.queueTrip(entry));
  }

  async listPending() {
    const offers = await this.offerModel.find({ status: 'pending' }).exec();
    return offers.map((offer) => offer.toObject());
  }

  async respond(id: string, status: 'accepted' | 'declined') {
    const offer = await this.offerModel.findById(id).exec();
    if (!offer) {
      throw new NotFoundException(`Offer ${id} not found`);
    }

    offer.status = status;
    offer.respondedAt = new Date();
    await offer.save();

    this.clearExpirationTimer(offer.id);

    const driverObjectId = Types.ObjectId.isValid(offer.driverId)
      ? new Types.ObjectId(offer.driverId)
      : offer.driverId;

    if (status === 'accepted') {
      await Promise.all([
        this.tripModel
          .updateOne({ _id: offer.tripId }, { $set: { status: 'assigned' } })
          .exec(),
        this.driverModel
          .updateOne({ _id: driverObjectId }, { $set: { status: 'busy' } })
          .exec(),
      ]);
    } else {
      await Promise.all([
        this.tripModel
          .updateOne({ _id: offer.tripId }, { $set: { status: 'queued' } })
          .exec(),
        this.driverModel
          .updateOne({ _id: driverObjectId }, { $set: { status: 'available' } })
          .exec(),
      ]);

      const trip = await this.tripModel.findById(offer.tripId).exec();
      if (trip) {
        this.poolingService.queueTrip(this.toPoolEntry(trip));
      }
    }

    return offer.toObject();
  }

  private async expireExistingOffers(tripId: string) {
    const pending = await this.offerModel
      .find({ tripId: new Types.ObjectId(tripId), status: 'pending' })
      .exec();

    if (!pending.length) {
      return;
    }

    await this.offerModel.updateMany(
      { _id: { $in: pending.map((offer) => offer._id) } },
      { $set: { status: 'expired', respondedAt: new Date() } },
    );

    pending.forEach((offer) => this.clearExpirationTimer(offer.id));
  }

  private registerExpirationTimer(offer: OfferDocument) {
    if (!offer.expiresAt) {
      return;
    }

    const offerId = offer.id;
    this.clearExpirationTimer(offerId);

    const delay = Math.max(0, offer.expiresAt.getTime() - Date.now());
    const timer = setTimeout(
      () => this.handleTimeout(offerId).catch(() => {}),
      delay,
    );
    this.timers.set(offerId, timer);
  }

  private clearExpirationTimer(offerId: string) {
    const timer = this.timers.get(offerId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(offerId);
    }
  }

  private async handleTimeout(offerId: string) {
    const offer = await this.offerModel.findById(offerId).exec();
    if (!offer || offer.status !== 'pending') {
      this.clearExpirationTimer(offerId);
      return;
    }

    offer.status = 'expired';
    offer.respondedAt = new Date();
    await offer.save();

    const driverObjectId = Types.ObjectId.isValid(offer.driverId)
      ? new Types.ObjectId(offer.driverId)
      : offer.driverId;

    await Promise.all([
      this.tripModel
        .updateOne({ _id: offer.tripId }, { $set: { status: 'queued' } })
        .exec(),
      this.driverModel
        .updateOne({ _id: driverObjectId }, { $set: { status: 'available' } })
        .exec(),
    ]);

    this.clearExpirationTimer(offerId);

    const trip = await this.tripModel.findById(offer.tripId).exec();
    if (trip) {
      this.poolingService.queueTrip(this.toPoolEntry(trip));
    }
  }

  private toPoolEntry(trip: TripDocument): PoolEntry {
    const obj = trip.toObject() as any;
    const createdAt =
      (trip as any).createdAt instanceof Date
        ? (trip as any).createdAt
        : obj.createdAt
          ? new Date(obj.createdAt)
          : new Date();
    const updatedAt =
      (trip as any).updatedAt instanceof Date
        ? (trip as any).updatedAt
        : obj.updatedAt
          ? new Date(obj.updatedAt)
          : new Date();

    return {
      id: trip._id.toString(),
      riderId: obj.riderId.toString(),
      status: (obj.status ?? 'queued') as TripStatus,
      pickup: {
        lat: obj.pickup.lat,
        lng: obj.pickup.lng,
        address: obj.pickup.address,
        h3Index: obj.pickup.h3Index,
      },
      dropoff: {
        lat: obj.dropoff.lat,
        lng: obj.dropoff.lng,
        address: obj.dropoff.address,
        h3Index: obj.dropoff.h3Index,
      },
      tags: obj.tags ?? [],
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
    };
  }
}
