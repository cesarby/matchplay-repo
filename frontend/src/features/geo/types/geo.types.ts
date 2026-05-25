export interface Province {
  code: string
  name: string
}

export interface City {
  code: string
  name: string
  provinceCode: string
}

export interface Area {
  code: string
  name: string
  cityCode: string
}
