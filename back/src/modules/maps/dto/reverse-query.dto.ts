import { ApiPropertyOptional } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { IsNumber, IsOptional } from 'class-validator'

export class ReverseQueryDto {
  @ApiPropertyOptional({ description: 'Latitude in WGS84', example: 36.7538 })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  lat!: number

  @ApiPropertyOptional({ description: 'Longitude in WGS84', example: 3.0589 })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  lng!: number

  @ApiPropertyOptional({ description: 'Preferred response language (BCP 47 code)', example: 'fr' })
  @IsOptional()
  language?: string
}

