import { lazy } from 'react'
import { createBrowserRouter } from 'react-router-dom'

import { AdminLayout } from '@/app/layouts/AdminLayout'
import { AuthLayout } from '@/app/layouts/AuthLayout'
import { MainLayout } from '@/app/layouts/MainLayout'
import { SuspenseShell } from '@/app/SuspenseShell'
import { ProtectedRoute } from '@/features/auth/guards/ProtectedRoute'
import { RoleRoute } from '@/features/auth/guards/RoleRoute'

const LandingPage = lazy(() => import('@/features/landing/pages/LandingPage'))
const SessionsListPage = lazy(() => import('@/features/sessions/pages/SessionsListPage'))
const SessionDetailPage = lazy(() => import('@/features/sessions/pages/SessionDetailPage'))
const CreateSessionPage = lazy(() => import('@/features/sessions/pages/CreateSessionPage'))
const MySessionsPage = lazy(() => import('@/features/sessions/pages/MySessionsPage'))
const NotFoundPage = lazy(() => import('@/features/sessions/pages/NotFoundPage'))
const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage'))
const RegisterPage = lazy(() => import('@/features/auth/pages/RegisterPage'))
const ProfilePage = lazy(() => import('@/features/profile/pages/ProfilePage'))

export const router = createBrowserRouter([
  {
    element: <SuspenseShell />,
    children: [
      {
        element: <MainLayout />,
        children: [
          { path: '/', element: <LandingPage /> },
          { path: '/sessions', element: <SessionsListPage /> },
          {
            path: '/sessions/new',
            element: (
              <ProtectedRoute>
                <CreateSessionPage />
              </ProtectedRoute>
            ),
          },
          {
            path: '/sessions/mine',
            element: (
              <ProtectedRoute>
                <MySessionsPage />
              </ProtectedRoute>
            ),
          },
          { path: '/sessions/:id', element: <SessionDetailPage /> },
          {
            path: '/profile',
            element: (
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            ),
          },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
      {
        element: <AuthLayout />,
        children: [
          { path: '/login', element: <LoginPage /> },
          { path: '/register', element: <RegisterPage /> },
        ],
      },
      {
        element: (
          <ProtectedRoute>
            <RoleRoute roles={['ADMIN']}>
              <AdminLayout />
            </RoleRoute>
          </ProtectedRoute>
        ),
        children: [],
      },
    ],
  },
])
