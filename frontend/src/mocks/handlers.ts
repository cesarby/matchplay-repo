import { http, HttpResponse } from 'msw'

const API = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

export const handlers = [
  http.post(`${API}/auth/refresh`, () => HttpResponse.json({}, { status: 401 })),

  http.get(`${API}/auth/me`, () => HttpResponse.json({}, { status: 401 })),

  http.get(`${API}/sessions`, () =>
    HttpResponse.json({
      content: [],
      page: 0,
      size: 20,
      totalElements: 0,
      totalPages: 0,
      last: true,
    }),
  ),
]
