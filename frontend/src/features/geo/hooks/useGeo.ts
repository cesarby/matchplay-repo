import { useQuery } from '@tanstack/react-query'

import { geoApi } from '../api/geoApi'

const GEO_STALE = 24 * 60 * 60 * 1000

export function useProvincesQuery() {
  return useQuery({
    queryKey: ['geo', 'provinces'],
    queryFn: () => geoApi.listProvinces(),
    staleTime: GEO_STALE,
  })
}

export function useCitiesQuery(provinceCode: string | undefined) {
  return useQuery({
    queryKey: ['geo', 'cities', provinceCode],
    queryFn: () => geoApi.listCities(provinceCode ?? ''),
    enabled: Boolean(provinceCode),
    staleTime: GEO_STALE,
  })
}

export function useAreasQuery(cityCode: string | undefined) {
  return useQuery({
    queryKey: ['geo', 'areas', cityCode],
    queryFn: () => geoApi.listAreas(cityCode ?? ''),
    enabled: Boolean(cityCode),
    staleTime: GEO_STALE,
  })
}
