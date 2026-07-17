import { createBrowserRouter } from 'react-router-dom'

import { BootstrapPage } from '@/pages/BootstrapPage'

export const router = createBrowserRouter([
  {
    path: '*',
    element: <BootstrapPage />,
  },
])
