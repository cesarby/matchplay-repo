import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'

import { ProtectedRoute } from '../guards/ProtectedRoute'
import { useAuthStore } from '../store/authStore'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <div>profile</div>
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<div>login</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('<ProtectedRoute>', () => {
  beforeEach(() => {
    useAuthStore.setState({
      accessToken: null,
      accessTokenExpiresAt: null,
      currentUser: null,
      status: 'idle',
    })
  })

  it('shows splash while booting', () => {
    useAuthStore.setState({ status: 'booting' })
    renderAt('/profile')
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('redirects anonymous to /login', () => {
    useAuthStore.setState({ status: 'anonymous' })
    renderAt('/profile')
    expect(screen.getByText('login')).toBeInTheDocument()
  })

  it('renders children when authenticated', () => {
    useAuthStore.setState({
      status: 'authenticated',
      accessToken: 't',
      accessTokenExpiresAt: 1,
      currentUser: {
        userId: 1,
        email: 'a@b.c',
        username: 'a',
        role: 'USER',
        provinceCode: null,
        cityCode: null,
        areaCode: null,
        ratingAvg: 0,
        rewardPoints: 0,
        selectedAvatarCode: 'av_01',
      },
    })
    renderAt('/profile')
    expect(screen.getByText('profile')).toBeInTheDocument()
  })
})
