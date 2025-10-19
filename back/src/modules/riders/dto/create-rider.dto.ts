import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator'

class RiderLocationDto {
  @ApiProperty({ example: 36.752887 })
  @IsNumber()
  lat!: number

  @ApiProperty({ example: 3.042048 })
  @IsNumber()
  lng!: number

  @ApiPropertyOptional({ example: 'Place Audin, Algiers' })
  @IsString()
  @IsOptional()
  address?: string
}

export class CreateRiderDto {
  @ApiProperty({ example: 'Adam R.' })
  @IsString()
  @IsNotEmpty()
  name!: string

  @ApiProperty({ example: '+213555001122' })
  @IsString()
  @IsNotEmpty()
  phone!: string

  @ApiPropertyOptional({ type: RiderLocationDto })
  @ValidateNested()
  @Type(() => RiderLocationDto)
  @IsOptional()
  defaultPickup?: RiderLocationDto
}
