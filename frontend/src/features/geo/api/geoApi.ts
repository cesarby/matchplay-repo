import { httpClient } from '@/shared/api/httpClient'

import type { Area, City, Province } from '../types/geo.types'

export const geoApi = {
  listProvinces: () => httpClient.get<Province[]>('/geo/provinces').then((r) => r.data),
  listCities: (provinceCode: string) =>
    httpClient.get<City[]>('/geo/cities', { params: { provinceCode } }).then((r) => r.data),
  listAreas: (cityCode: string) =>
    httpClient.get<Area[]>('/geo/areas', { params: { cityCode } }).then((r) => r.data),
}
