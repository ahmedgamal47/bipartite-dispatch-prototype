import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import type { TelemetryEvent, TelemetryEventType } from '../types';
import {
  TelemetryEventDocument,
  TelemetryEventEntity,
} from '../schemas/telemetry-event.schema';

const MAX_EVENTS = 200;

@Injectable()
export class TelemetryService {
  private readonly logger = new Logger(TelemetryService.name);

  constructor(
    @InjectModel(TelemetryEventEntity.name)
    private readonly telemetryModel: Model<TelemetryEventDocument>,
  ) {}

  async push(event: {
    type: TelemetryEventType;
    data: Record<string, unknown>;
    timestamp?: string;
  }) {
    await this.telemetryModel.create({
      type: event.type,
      data: event.data,
      timestamp: event.timestamp ? new Date(event.timestamp) : new Date(),
    });

    const total = await this.telemetryModel.estimatedDocumentCount().exec();
    const excess = total - MAX_EVENTS;
    if (excess > 0) {
      const oldest = await this.telemetryModel
        .find()
        .sort({ timestamp: 1 })
        .limit(excess)
        .select('_id')
        .lean()
        .exec();

      await this.telemetryModel
        .deleteMany({ _id: { $in: oldest.map((doc) => doc._id) } })
        .exec()
        .catch((error) =>
          this.logger.warn(`Failed to trim telemetry events: ${error.message}`),
        );
    }
  }

  async getEvents(limit = 50): Promise<TelemetryEvent[]> {
    const docs = await this.telemetryModel
      .find()
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean()
      .exec();

    return docs.map((doc) => ({
      id: doc._id.toString(),
      timestamp: new Date(doc.timestamp).toISOString(),
      type: doc.type,
      data: doc.data ?? {},
    }));
  }
}
