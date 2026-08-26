import { Navigate, Route, Routes } from 'react-router'
import { FirstAccessPage } from './features/auth/pages/FirstAccessPage'
import { LoginPage } from './features/auth/pages/LoginPage'
import { ClientCreatePage } from './features/clients/pages/ClientCreatePage'
import { ClientEditPage } from './features/clients/pages/ClientEditPage'
import { ClientsPage } from './features/clients/pages/ClientsPage'
import { DashboardPage } from './features/dashboard/pages/DashboardPage'
import { EmployeesPage } from './features/employees/pages/EmployeesPage'
import { OrderCreatePage } from './features/orders/pages/OrderCreatePage'
import { OrderDetailsPage } from './features/orders/pages/OrderDetailsPage'
import { OrderEditPage } from './features/orders/pages/OrderEditPage'
import { OrdersPage } from './features/orders/pages/OrdersPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/first-access" element={<FirstAccessPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/orders" element={<OrdersPage />} />
      <Route path="/orders/new" element={<OrderCreatePage />} />
      <Route path="/orders/:orderId" element={<OrderDetailsPage />} />
      <Route path="/orders/:orderId/edit" element={<OrderEditPage />} />
      <Route path="/clients" element={<ClientsPage />} />
      <Route path="/clients/new" element={<ClientCreatePage />} />
      <Route path="/clients/:clientId/edit" element={<ClientEditPage />} />
      <Route path="/employees" element={<EmployeesPage />} />
    </Routes>
  )
}

export default App
