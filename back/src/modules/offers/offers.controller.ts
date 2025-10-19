import { Body, Controller, Get, Param, Patch } from '@nestjs/common'
import { OffersService } from './offers.service'
import { RespondOfferDto } from './dto/respond-offer.dto'

@Controller('offers')
export class OffersController {
  constructor(private readonly offersService: OffersService) {}

  @Get()
  list() {
    return this.offersService.listPending()
  }

  @Patch(':id/respond')
  respond(@Param('id') id: string, @Body() body: RespondOfferDto) {
    return this.offersService.respond(id, body.status)
  }
}

