import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, Types } from 'mongoose'

export type TripDocument = HydratedDocument<Trip>

export const TRIP_STATUSES = [
  'queued',
  'pooling',
  'matched',
  'offering',
  'assigned',
  'no_driver',
  'expired',
] as const

export type TripStatus = (typeof TRIP_STATUSES)[number]

@Schema({ _id: false })
export class TripLocation {
  @Prop({ required: true })
  lat!: number

  @Prop({ required: true })
  lng!: number

  @Prop()
  address?: string

  @Prop({ required: true })
  h3Index!: string
}

@Schema({ timestamps: true })
export class Trip {
  @Prop({ type: Types.ObjectId, ref: 'Rider', required: true })
  riderId!: Types.ObjectId

  @Prop({ type: TripLocation, required: true })
  pickup!: TripLocation

  @Prop({ type: TripLocation, required: true })
  dropoff!: TripLocation

  @Prop({ required: true, enum: TRIP_STATUSES, default: 'queued' })
  status!: TripStatus

  @Prop({ type: [String], default: [] })
  tags!: string[]
}

export const TripSchema = SchemaFactory.createForClass(Trip)

const applyTransform = (_doc: TripDocument, ret: any) => {
  if (ret._id) {
    ret.id = ret._id.toString()
    delete ret._id
  }
  if (ret.riderId) {
    ret.riderId = ret.riderId.toString()
  }
  return ret
}

TripSchema.set('toJSON', { versionKey: false, virtuals: true, transform: applyTransform })
TripSchema.set('toObject', { versionKey: false, virtuals: true, transform: applyTransform })
