import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument } from 'mongoose'

export type DriverDocument = HydratedDocument<Driver>

export const DRIVER_STATUSES = ['available', 'busy', 'offline'] as const
export type DriverStatus = (typeof DRIVER_STATUSES)[number]

@Schema({ _id: false })
export class DriverLocation {
  @Prop({ required: true })
  lat!: number

  @Prop({ required: true })
  lng!: number

  @Prop({ required: true })
  h3Index!: string
}

@Schema({ timestamps: true })
export class Driver {
  @Prop({ required: true })
  name!: string

  @Prop({ required: true, enum: DRIVER_STATUSES, default: 'available' })
  status!: DriverStatus

  @Prop({ required: true, min: 0, max: 5, default: 5 })
  rating!: number

  @Prop({ type: DriverLocation, required: true })
  location!: DriverLocation

  @Prop()
  vehicleNotes?: string
}

export const DriverSchema = SchemaFactory.createForClass(Driver)

const applyTransform = (_doc: DriverDocument, ret: any) => {
  if (ret._id) {
    ret.id = ret._id.toString()
    delete ret._id
  }
  return ret
}

DriverSchema.set('toJSON', { versionKey: false, virtuals: true, transform: applyTransform })
DriverSchema.set('toObject', { versionKey: false, virtuals: true, transform: applyTransform })
