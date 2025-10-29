import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import type { TelemetryEventType } from '../types';

export type TelemetryEventDocument = HydratedDocument<TelemetryEventEntity>;

@Schema({ timestamps: { createdAt: 'timestamp', updatedAt: false } })
export class TelemetryEventEntity {
  @Prop({
    type: String,
    enum: [
      'trip_queued',
      'pool_flushed',
      'matching_result',
      'offer_created',
      'offer_accepted',
      'offer_declined',
      'offer_timeout',
      'single_dispatch_started',
      'trip_no_driver',
    ],
    required: true,
  })
  type!: TelemetryEventType;

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  data!: Record<string, unknown>;

  @Prop({ type: Date, default: () => new Date() })
  timestamp!: Date;
}

export const TelemetryEventSchema = SchemaFactory.createForClass(TelemetryEventEntity);

TelemetryEventSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc: TelemetryEventDocument, ret: any) => {
    if (ret._id) {
      ret.id = ret._id.toString();
      delete ret._id;
    }
    if (ret.timestamp instanceof Date) {
      ret.timestamp = ret.timestamp.toISOString();
    }
    return ret;
  },
});

TelemetryEventSchema.set('toObject', {
  virtuals: true,
  versionKey: false,
  transform: (_doc: TelemetryEventDocument, ret: any) => {
    if (ret._id) {
      ret.id = ret._id.toString();
      delete ret._id;
    }
    if (ret.timestamp instanceof Date) {
      ret.timestamp = ret.timestamp.toISOString();
    }
    return ret;
  },
});

