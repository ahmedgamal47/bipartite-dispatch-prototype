import { Injectable, Logger } from '@nestjs/common'
import type { PoolBatch, PoolEntry } from '../types'
import { MatchingService } from './matching.service'
import { TelemetryService } from './telemetry.service'

@Injectable()
export class PoolingService {
  private readonly logger = new Logger(PoolingService.name)
  private readonly pools = new Map<string, PoolBatch>()

  constructor(
    private readonly matchingService: MatchingService,
    private readonly telemetryService: TelemetryService,
  ) {}

  queueTrip(entry: PoolEntry) {
    const poolIndex = entry.pickup.h3Index
    const batch = this.getOrCreate(poolIndex)
    batch.trips = batch.trips.filter((trip) => trip.id !== entry.id)
    batch.trips.push(entry)
    batch.updatedAt = new Date().toISOString()

    this.telemetryService.push({
      type: 'trip_queued',
      data: {
        h3Index: poolIndex,
        tripId: entry.id,
        riderId: entry.riderId,
        status: entry.status,
      },
    })
  }

  getPools() {
    return Array.from(this.pools.values())
  }

  async flush(h3Index?: string) {
    const targets = h3Index ? [h3Index] : Array.from(this.pools.keys())
    const results = []

    for (const key of targets) {
      const batch = this.pools.get(key)
      if (!batch || batch.trips.length === 0) {
        continue
      }

      const result = await this.matchingService.solve(batch)
      results.push(result)

      this.telemetryService.push({
        type: 'pool_flushed',
        data: {
          h3Index: key,
          tripCount: batch.trips.length,
          assignments: result.assignments,
          unassigned: result.unassigned,
        },
      })

      this.telemetryService.push({
        type: 'matching_result',
        data: {
          h3Index: key,
          assignments: result.assignments,
          unassigned: result.unassigned,
          strategy: result.strategy,
          metadata: result.metadata,
        },
      })

      batch.trips = []
      batch.windowStart = new Date().toISOString()
      batch.updatedAt = batch.windowStart
    }

    if (!results.length) {
      this.logger.debug('No pools to flush')
    }

    return results
  }

  private getOrCreate(h3Index: string) {
    let batch = this.pools.get(h3Index)
    if (!batch) {
      batch = {
        h3Index,
        trips: [],
        windowStart: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      this.pools.set(h3Index, batch)
    }
    return batch
  }
}
