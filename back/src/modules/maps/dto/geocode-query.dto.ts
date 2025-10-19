import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
} from 'class-validator'

export class GeocodeQueryDto {
  @ApiProperty({ description: 'Search text, e.g. landmark, street, or city', example: 'Algiers airport' })
  @IsString()
  @IsNotEmpty()
  query!: string

  @ApiPropertyOptional({
    description: 'Maximum number of results to return',
    default: 5,
    minimum: 1,
    maximum: 10,
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  @Min(1)
  @Max(10)
  @Transform(({ value }) => (value !== undefined ? Number(value) : value))
  limit?: number

  @ApiPropertyOptional({
    description: 'Comma-separated list of ISO 3166-1 alpha2 country codes to filter results',
    example: 'dz,fr',
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string'
      ? value
          .split(',')
          .map((code: string) => code.trim().toLowerCase())
          .filter(Boolean)
      : value,
  )
  @IsArray()
  @IsString({ each: true })
  countryCodes?: string[]

  @ApiPropertyOptional({ description: 'Preferred response language (BCP 47 code)', example: 'fr' })
  @IsOptional()
  @IsString()
  language?: string
}

