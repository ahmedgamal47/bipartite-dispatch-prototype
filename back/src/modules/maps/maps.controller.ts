import { Controller, Get, Query } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { GeocodeQueryDto } from './dto/geocode-query.dto'
import { ReverseQueryDto } from './dto/reverse-query.dto'
import { MapsService } from './maps.service'

@ApiTags('Maps')
@Controller('maps')
export class MapsController {
  constructor(private readonly mapsService: MapsService) {}

  @Get('geocode')
  @ApiOkResponse({ description: 'Geocoding results' })
  geocode(@Query() query: GeocodeQueryDto) {
    return this.mapsService.geocode(query)
  }

  @Get('reverse')
  @ApiOkResponse({ description: 'Reverse geocoding result' })
  reverse(@Query() query: ReverseQueryDto) {
    return this.mapsService.reverse(query)
  }
}

