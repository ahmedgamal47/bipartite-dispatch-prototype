import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { CreateRiderDto } from './dto/create-rider.dto'
import { UpdateRiderDto } from './dto/update-rider.dto'
import { Rider, RiderDocument } from './schemas/rider.schema'

@Injectable()
export class RidersService {
  constructor(@InjectModel(Rider.name) private readonly riderModel: Model<RiderDocument>) {}

  async create(payload: CreateRiderDto) {
    const rider = new this.riderModel(payload)
    const saved = await rider.save()
    return saved.toObject()
  }

  async findAll() {
    const riders = await this.riderModel.find().exec()
    return riders.map((rider) => rider.toObject())
  }

  async findOne(id: string) {
    const rider = await this.riderModel.findById(id).exec()
    if (!rider) {
      throw new NotFoundException(`Rider ${id} not found`)
    }
    return rider.toObject()
  }

  async update(id: string, payload: UpdateRiderDto) {
    const rider = await this.riderModel.findById(id).exec()
    if (!rider) {
      throw new NotFoundException(`Rider ${id} not found`)
    }

    if (payload.name !== undefined) {
      rider.name = payload.name
    }
    if (payload.phone !== undefined) {
      rider.phone = payload.phone
    }
    if (payload.defaultPickup !== undefined) {
      rider.defaultPickup = payload.defaultPickup
    }

    await rider.save()
    return rider.toObject()
  }

  async remove(id: string) {
    const rider = await this.riderModel.findById(id).exec()
    if (!rider) {
      throw new NotFoundException(`Rider ${id} not found`)
    }

    await rider.deleteOne()
  }
}
