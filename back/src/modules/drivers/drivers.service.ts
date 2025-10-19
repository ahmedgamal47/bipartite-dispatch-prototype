import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { H3Service } from '../../common/h3.service'
import { CreateDriverDto } from './dto/create-driver.dto'
import { UpdateDriverDto } from './dto/update-driver.dto'
import { Driver, DriverDocument } from './schemas/driver.schema'
import { randomUUID } from 'crypto'

@Injectable()
export class DriversService {
  constructor(
    @InjectModel(Driver.name) private readonly driverModel: Model<DriverDocument>,
    private readonly h3Service: H3Service,
  ) {}

  async create(payload: CreateDriverDto) {
    const h3Index = this.h3Service.indexFor(payload.location.lat, payload.location.lng)

    const document = new this.driverModel({
      ...payload,
      status: payload.status ?? 'available',
      rating: payload.rating ?? 5,
      location: {
        ...payload.location,
        h3Index,
      },
    })

    const saved = await document.save()
    return saved.toObject()
  }

  async findAll() {
    const drivers = await this.driverModel.find().exec()
    return drivers.map((driver) => driver.toObject())
  }

  async findOne(id: string) {
    const driver = await this.driverModel.findById(id).exec()
    if (!driver) {
      throw new NotFoundException(`Driver ${id} not found`)
    }
    return driver.toObject()
  }

  async update(id: string, payload: UpdateDriverDto) {
    const driver = await this.driverModel.findById(id).exec()
    if (!driver) {
      throw new NotFoundException(`Driver ${id} not found`)
    }

    if (payload.location) {
      const h3Index = this.h3Service.indexFor(payload.location.lat, payload.location.lng)
      driver.location = {
        ...driver.location,
        ...payload.location,
        h3Index,
      }
    }

    if (payload.name !== undefined) {
      driver.name = payload.name
    }
    if (payload.status !== undefined) {
      driver.status = payload.status
    }
    if (payload.rating !== undefined) {
      driver.rating = payload.rating
    }
    if (payload.vehicleNotes !== undefined) {
      driver.vehicleNotes = payload.vehicleNotes
    }

    await driver.save()
    return driver.toObject()
  }

  async remove(id: string) {
    const driver = await this.driverModel.findById(id).exec()
    if (!driver) {
      throw new NotFoundException(`Driver ${id} not found`)
    }

    await driver.deleteOne()
  }

  async bulkCreate(count: number, coordinates: [number, number][]) {
    if (coordinates.length < 3) {
      throw new Error('Polygon must have at least three points')
    }

    const drivers = Array.from({ length: count }, () => this.randomDriver(coordinates))
    await this.driverModel.insertMany(drivers)
    return drivers.length
  }

  private randomDriver(polygon: [number, number][]) {
    const position = this.randomPointInPolygon(polygon)
    const lat = position[1]
    const lng = position[0]
    const h3Index = this.h3Service.indexFor(lat, lng)
    const names = ['Imane', 'Khaled', 'Amel', 'Yassine', 'Rania', 'Samir', 'Nora', 'Walid', 'Lina', 'Rachid']
    const driverName = names[Math.floor(Math.random() * names.length)]

    return {
      name: `${driverName} ${Math.floor(Math.random() * 1000)}`,
      status: 'available',
      rating: Number((3.5 + Math.random() * 1.5).toFixed(1)),
      location: { lat, lng, h3Index },
      vehicleNotes: 'Generated via bulk utility',
    }
  }

  private randomPointInPolygon(polygon: [number, number][]) {
    const [minLng, maxLng] = polygon.reduce(
      (acc, [lng]) => [Math.min(acc[0], lng), Math.max(acc[1], lng)],
      [polygon[0][0], polygon[0][0]],
    )
    const [minLat, maxLat] = polygon.reduce(
      (acc, [, lat]) => [Math.min(acc[0], lat), Math.max(acc[1], lat)],
      [polygon[0][1], polygon[0][1]],
    )

    while (true) {
      const lng = minLng + Math.random() * (maxLng - minLng)
      const lat = minLat + Math.random() * (maxLat - minLat)
      if (this.pointInPolygon([lng, lat], polygon)) {
        return [lng, lat] as [number, number]
      }
    }
  }

  private pointInPolygon(point: [number, number], polygon: [number, number][]) {
    const [x, y] = point
    let inside = false
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][0]
      const yi = polygon[i][1]
      const xj = polygon[j][0]
      const yj = polygon[j][1]
      const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
      if (intersect) inside = !inside
    }
    return inside
  }

  async removeAll() {
    await this.driverModel.deleteMany({}).exec()
  }
}
