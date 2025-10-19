import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { latLngToCell } from 'h3-js'

@Injectable()
export class H3Service {
  private readonly defaultResolution: number

  constructor(private readonly configService: ConfigService) {
    const raw = this.configService.get<string | number>('H3_RESOLUTION')
    const parsed =
      typeof raw === 'number'
        ? raw
        : raw !== undefined
          ? Number.parseInt(String(raw), 10)
          : Number.NaN
    this.defaultResolution = Number.isFinite(parsed) ? parsed : 8
  }

  indexFor(lat: number, lng: number, resolution = this.defaultResolution) {
    return latLngToCell(lat, lng, resolution)
  }
}
