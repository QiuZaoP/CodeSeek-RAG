import { Navigate, createBrowserRouter } from 'react-router-dom'

import { AppShell } from '@/components/AppShell/AppShell'
import { GuidePage } from '@/pages/GuidePage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { WorkspacePage } from '@/pages/WorkspacePage'

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      {
        path: '/',
        element: <Navigate to="/workspace" replace />,
      },
      {
        path: '/workspace',
        element: <WorkspacePage />,
      },
      {
        path: '/guide',
        element: <GuidePage />,
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
])
