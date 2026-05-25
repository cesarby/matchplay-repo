import { lazy } from 'react'
import { createBrowserRouter } from 'react-router-dom'

import { AdminLayout } from '@/app/layouts/AdminLayout'
import { AuthLayout } from '@/app/layouts/AuthLayout'
import { MainLayout } from '@/app/layouts/MainLayout'
import { SuspenseShell } from '@/app/SuspenseShell'
import { ProtectedRoute } from '@/features/auth/guards/ProtectedRoute'
import { RoleRoute } from '@/features/auth/guards/RoleRoute'

const HomePage = lazy(() => import('@/features/sessions/pages/HomePage'))
const NotFoundPage = lazy(() => import('@/features/sessions/pages/NotFoundPage'))
const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage'))
const RegisterPage = lazy(() => import('@/features/auth/pages/RegisterPage'))

export const router = createBrowserRouter([
  {
    element: <SuspenseShell />,
    children: [
      {
        element: <MainLayout />,
        children: [
          { path: '/', element: <HomePage /> },
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
