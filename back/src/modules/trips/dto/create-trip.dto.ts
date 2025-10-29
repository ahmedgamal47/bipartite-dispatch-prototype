import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  IsArray,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator'
import { TRIP_STATUSES, DISPATCH_MODES } from '../schemas/trip.schema'
import type { TripStatus, DispatchMode } from '../schemas/trip.schema'

class TripLocationDto {
  @ApiProperty({ example: 36.737232 })
  @IsNumber()
  lat!: number

  @ApiProperty({ example: 3.086472 })
  @IsNumber()
  lng!: number

  @ApiPropertyOptional({ example: 'Ecole Polytechnique' })
  @IsString()
  @IsOptional()
  address?: string
}

export class CreateTripDto {
  @ApiProperty({ example: '6740f3f5d2e59a456ce4d890' })
  @IsMongoId()
  riderId!: string

  @ApiProperty({ type: TripLocationDto })
  @ValidateNested()
  @Type(() => TripLocationDto)
  pickup!: TripLocationDto

  @ApiProperty({ type: TripLocationDto })
  @ValidateNested()
  @Type(() => TripLocationDto)
  dropoff!: TripLocationDto

  @ApiPropertyOptional({ enum: TRIP_STATUSES })
  @IsEnum(TRIP_STATUSES)
  @IsOptional()
  status?: TripStatus

  @ApiPropertyOptional({ enum: DISPATCH_MODES, default: 'pooled' })
  @IsEnum(DISPATCH_MODES)
  @IsOptional()
  dispatchMode?: DispatchMode

  @ApiPropertyOptional({ type: [String], example: ['pool:h3:87283472fffffff'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[]
}
