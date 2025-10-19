import { Injectable } from '@nestjs/common'

@Injectable()
export class AppService {
  getManifest() {
    return {
      service: 'dispatch-poc-api',
      version: '0.1.0',
      description: 'Core backend for dispatch proof-of-concept',
      endpoints: {
        drivers: '/drivers',
        riders: '/riders',
        trips: '/trips',
        maps: '/maps',
        docs: '/docs',
      },
    }
  }
}
