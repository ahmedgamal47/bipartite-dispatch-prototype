import { IsEnum } from 'class-validator'
import { OFFER_STATUSES } from '../schemas/offer.schema'

export class RespondOfferDto {
  @IsEnum(['accepted', 'declined'] as const)
  status!: 'accepted' | 'declined'
}

