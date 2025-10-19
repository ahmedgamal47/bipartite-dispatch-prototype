import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { CreateDriverDto } from './dto/create-driver.dto'
import { UpdateDriverDto } from './dto/update-driver.dto'
import { DriversService } from './drivers.service'

@ApiTags('Drivers')
@Controller('drivers')
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  @Post()
  create(@Body() payload: CreateDriverDto) {
    return this.driversService.create(payload)
  }

  @Get()
  findAll() {
    return this.driversService.findAll()
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.driversService.findOne(id)
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() payload: UpdateDriverDto) {
    return this.driversService.update(id, payload)
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string) {
    return this.driversService.remove(id)
  }
}
