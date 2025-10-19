import { Global, Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { H3Service } from './h3.service'

@Global()
@Module({
  imports: [ConfigModule],
  providers: [H3Service],
  exports: [H3Service],
})
export class CommonModule {}
