import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { CreateTripDto } from './dto/create-trip.dto'
import { UpdateTripDto } from './dto/update-trip.dto'
import { TripsService } from './trips.service'

@ApiTags('Trips')
@Controller('trips')
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  @Post()
  create(@Body() payload: CreateTripDto) {
    return this.tripsService.create(payload)
  }

  @Get()
  findAll() {
    return this.tripsService.findAll()
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tripsService.findOne(id)
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() payload: UpdateTripDto) {
    return this.tripsService.update(id, payload)
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string) {
    return this.tripsService.remove(id)
  }
}
