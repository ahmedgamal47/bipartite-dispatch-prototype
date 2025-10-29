import { Injectable, Logger } from '@nestjs/common';
import type { PoolBatch, PoolEntry, MatchingResult } from '../types';
import { MatchingService } from './matching.service';
import { TelemetryService } from './telemetry.service';
import { OffersService } from '../../offers/offers.service';

@Injectable()
export class PoolingService {
  private readonly logger = new Logger(PoolingService.name);
  private readonly pools = new Map<string, PoolBatch>();

  constructor(
    private readonly matchingService: MatchingService,
    private readonly telemetryService: TelemetryService,
    private readonly offersService: OffersService,
  ) {}

  queueTrip(entry: PoolEntry) {
    if (entry.status === 'no_driver') {
      return;
    }

    const poolIndex = entry.pickup.h3Index;
    const batch = this.getOrCreate(poolIndex);
    batch.trips = batch.trips.filter((trip) => trip.id !== entry.id);
    batch.trips.push(entry);
    batch.updatedAt = new Date().toISOString();

    void this.telemetryService.push({
      type: 'trip_queued',
      data: {
        h3Index: poolIndex,
        tripId: entry.id,
        riderId: entry.riderId,
        status: entry.status,
      },
    });
  }

  getPools() {
    return Array.from(this.pools.values()).filter(
      (batch) => batch.trips.length > 0,
    );
  }

  async dispatchImmediately(entry: PoolEntry) {
    await this.telemetryService.push({
      type: 'single_dispatch_started',
      data: {
        h3Index: entry.pickup.h3Index,
        tripId: entry.id,
        riderId: entry.riderId,
        submittedAt: entry.createdAt,
      },
    });

    const batch: PoolBatch = {
      h3Index: entry.pickup.h3Index,
      trips: [entry],
      windowStart: entry.createdAt,
      updatedAt: new Date().toISOString(),
    };

    const result = await this.matchingService.solve(batch);
    await this.handleDispatchOutcome(batch, result, 'single');
    return result;
  }

  async flush(h3Index?: string) {
    const targets = h3Index ? [h3Index] : Array.from(this.pools.keys());
    const results = [];

    for (const key of targets) {
      const batch = this.pools.get(key);
      if (!batch || batch.trips.length === 0) {
        continue;
      }

      const result = await this.matchingService.solve(batch);
      results.push(result);

      await this.handleDispatchOutcome(batch, result, 'pooled');
    }

    if (!results.length) {
      this.logger.debug('No pools to flush');
    }

    return results;
  }

  private getOrCreate(h3Index: string) {
    let batch = this.pools.get(h3Index);
    if (!batch) {
      batch = {
        h3Index,
        trips: [],
        windowStart: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.pools.set(h3Index, batch);
    }
    return batch;
  }

  private async handleDispatchOutcome(
    batch: PoolBatch,
    result: MatchingResult,
    mode: 'pooled' | 'single',
  ) {
    const requeueEntries: PoolEntry[] = batch.trips
      .filter((trip) => result.unassigned.includes(trip.id))
      .map((trip) => ({
        ...trip,
        status: 'queued',
        updatedAt: new Date().toISOString(),
      }));

    if (mode === 'pooled') {
      await this.telemetryService.push({
        type: 'pool_flushed',
        data: {
          h3Index: batch.h3Index,
          tripCount: batch.trips.length,
          assignments: result.assignments,
          unassigned: result.unassigned,
        },
      });
    }

    await this.offersService.createForMatching(result);

    await this.telemetryService.push({
      type: 'matching_result',
      data: {
        h3Index: batch.h3Index,
        assignments: result.assignments,
        unassigned: result.unassigned,
        strategy: result.strategy,
        metadata: result.metadata,
        mode,
      },
    });

    if (mode === 'pooled') {
      this.pools.delete(batch.h3Index);
    }

    requeueEntries.forEach((entry) => this.queueTrip(entry));
  }
}
