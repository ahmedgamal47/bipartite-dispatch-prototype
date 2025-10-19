import { Injectable } from '@nestjs/common'
import { latLngToCell } from 'h3-js'

@Injectable()
export class H3Service {
  private readonly defaultResolution = 8

  indexFor(lat: number, lng: number, resolution = this.defaultResolution) {
    return latLngToCell(lat, lng, resolution)
  }
}

