import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument } from 'mongoose'

export type RiderDocument = HydratedDocument<Rider>

@Schema({ _id: false })
export class RiderLocation {
  @Prop({ required: true })
  lat!: number

  @Prop({ required: true })
  lng!: number

  @Prop()
  address?: string
}

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class Rider {
  @Prop({ required: true })
  name!: string

  @Prop({ required: true })
  phone!: string

  @Prop({ type: RiderLocation, required: false })
  defaultPickup?: RiderLocation
}

export const RiderSchema = SchemaFactory.createForClass(Rider)

const applyTransform = (_doc: RiderDocument, ret: any) => {
  if (ret._id) {
    ret.id = ret._id.toString()
    delete ret._id
  }
  return ret
}

RiderSchema.set('toJSON', { versionKey: false, virtuals: true, transform: applyTransform })
RiderSchema.set('toObject', { versionKey: false, virtuals: true, transform: applyTransform })
