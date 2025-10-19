import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { H3Service } from '../../common/h3.service'
import { CreateDriverDto } from './dto/create-driver.dto'
import { UpdateDriverDto } from './dto/update-driver.dto'
import { Driver, DriverDocument } from './schemas/driver.schema'

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
}
