import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios, { AxiosInstance } from 'axios'
import { GeocodeQueryDto } from './dto/geocode-query.dto'
import { ReverseQueryDto } from './dto/reverse-query.dto'

type GeocodeResult = {
  label: string
  lat: number
  lng: number
  type?: string
  address?: Record<string, string>
}

@Injectable()
export class MapsService {
  private readonly http: AxiosInstance
  private readonly logger = new Logger(MapsService.name)

  constructor(private readonly config: ConfigService) {
    const baseURL = config.get<string>('NOMINATIM_BASE_URL', 'https://nominatim.openstreetmap.org')
    const userAgent = config.get<string>(
      'NOMINATIM_USER_AGENT',
      'dispatch-poc/0.1 (contact: dev@dispatch-poc.local)',
    )

    this.http = axios.create({
      baseURL,
      headers: {
        'User-Agent': userAgent,
        Accept: 'application/json',
      },
      timeout: 10_000,
    })
  }

  async geocode(query: GeocodeQueryDto): Promise<GeocodeResult[]> {
    const params: Record<string, string | number> = {
      q: query.query,
      format: 'jsonv2',
      addressdetails: 1,
      extratags: 0,
      limit: query.limit ?? 5,
    }

    if (query.countryCodes?.length) {
      params.countrycodes = query.countryCodes.join(',')
    }

    if (query.language) {
      params.accept_language = query.language
    }

    const { data } = await this.http.get('/search', { params })

    if (!Array.isArray(data)) {
      this.logger.warn('Unexpected geocode response', { data })
      return []
    }

    return data.map((item: any) => ({
      label: item.display_name,
      lat: Number(item.lat),
      lng: Number(item.lon),
      type: item.type,
      address: item.address,
    }))
  }

  async reverse(query: ReverseQueryDto): Promise<GeocodeResult | null> {
    const params: Record<string, string | number> = {
      lat: query.lat,
      lon: query.lng,
      format: 'jsonv2',
      addressdetails: 1,
    }

    if (query.language) {
      params.accept_language = query.language
    }

    const { data } = await this.http.get('/reverse', { params })

    if (!data) {
      return null
    }

    return {
      label: data.display_name,
      lat: Number(data.lat),
      lng: Number(data.lon),
      type: data.type,
      address: data.address,
    }
  }
}

