import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { CreateRiderDto } from './dto/create-rider.dto'
import { UpdateRiderDto } from './dto/update-rider.dto'
import { RidersService } from './riders.service'

@ApiTags('Riders')
@Controller('riders')
export class RidersController {
  constructor(private readonly ridersService: RidersService) {}

  @Post()
  create(@Body() payload: CreateRiderDto) {
    return this.ridersService.create(payload)
  }

  @Get()
  findAll() {
    return this.ridersService.findAll()
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ridersService.findOne(id)
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() payload: UpdateRiderDto) {
    return this.ridersService.update(id, payload)
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string) {
    return this.ridersService.remove(id)
  }
}
