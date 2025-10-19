import { Injectable } from '@nestjs/common'
import { randomUUID } from 'crypto'
import type { TelemetryEvent, TelemetryEventType } from '../types'

const MAX_EVENTS = 200

@Injectable()
export class TelemetryService {
  private readonly events: TelemetryEvent[] = []

  push(event: { type: TelemetryEventType; data: Record<string, unknown>; timestamp?: string }) {
    const payload: TelemetryEvent = {
      id: randomUUID(),
      timestamp: event.timestamp ?? new Date().toISOString(),
      type: event.type,
      data: event.data,
    }

    this.events.unshift(payload)
    if (this.events.length > MAX_EVENTS) {
      this.events.length = MAX_EVENTS
    }
  }

  getEvents() {
    return this.events
  }
}
