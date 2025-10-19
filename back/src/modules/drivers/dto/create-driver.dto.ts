import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator'
import { DRIVER_STATUSES } from '../schemas/driver.schema'
import type { DriverStatus } from '../schemas/driver.schema'

class DriverLocationDto {
  @ApiProperty({ example: 36.7538 })
  @IsNumber()
  lat!: number

  @ApiProperty({ example: 3.0589 })
  @IsNumber()
  lng!: number
}

export class CreateDriverDto {
  @ApiProperty({ example: 'Imane B.' })
  @IsString()
  @IsNotEmpty()
  name!: string

  @ApiPropertyOptional({ enum: DRIVER_STATUSES })
  @IsEnum(DRIVER_STATUSES, {
    message: 'status must be one of: available, busy, offline',
  })
  @IsOptional()
  status?: DriverStatus

  @ApiPropertyOptional({ example: 4.8, minimum: 0, maximum: 5 })
  @IsNumber()
  @Min(0)
  @Max(5)
  @IsOptional()
  rating?: number

  @ApiProperty({ type: DriverLocationDto })
  @ValidateNested()
  @Type(() => DriverLocationDto)
  location!: DriverLocationDto

  @ApiPropertyOptional({ example: 'Renault Symbol · 4 seats' })
  @IsString()
  @IsOptional()
  vehicleNotes?: string
}
