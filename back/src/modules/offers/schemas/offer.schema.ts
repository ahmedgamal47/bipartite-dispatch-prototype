import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, Types } from 'mongoose'

export type OfferDocument = HydratedDocument<Offer>

export const OFFER_STATUSES = ['pending', 'accepted', 'declined', 'expired'] as const
export type OfferStatus = (typeof OFFER_STATUSES)[number]

@Schema({ timestamps: true })
export class Offer {
  @Prop({ type: Types.ObjectId, ref: 'Trip', required: true })
  tripId!: Types.ObjectId

  @Prop({ required: true })
  driverId!: string

  @Prop({ required: true })
  driverName!: string

  @Prop({ required: true })
  driverStatus!: string

  @Prop({ required: true })
  distanceMeters!: number

  @Prop({ required: true, enum: OFFER_STATUSES, default: 'pending' })
  status!: OfferStatus

  @Prop()
  expiresAt?: Date

  @Prop()
  respondedAt?: Date
}

export const OfferSchema = SchemaFactory.createForClass(Offer)

OfferSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc: OfferDocument, ret: any) => {
    if (ret._id) {
      ret.id = ret._id.toString()
      delete ret._id
    }
    if (ret.tripId) {
      ret.tripId = ret.tripId.toString()
    }
    return ret
  },
})

OfferSchema.set('toObject', {
  virtuals: true,
  versionKey: false,
  transform: (_doc: OfferDocument, ret: any) => {
    if (ret._id) {
      ret.id = ret._id.toString()
      delete ret._id
    }
    if (ret.tripId) {
      ret.tripId = ret.tripId.toString()
    }
    return ret
  },
})

