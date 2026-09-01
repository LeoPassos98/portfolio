import { Navigate, Route, Routes } from 'react-router'
import { AuthSessionBootstrap } from './features/auth/components/AuthSessionBootstrap'
import { FirstAccessPage } from './features/auth/pages/FirstAccessPage'
import { LoginPage } from './features/auth/pages/LoginPage'
import { ProtectedRoute } from './features/auth/components/ProtectedRoute'
import { useAuth } from './features/auth/hooks/useAuth'
import { ClientCreatePage } from './features/clients/pages/ClientCreatePage'
import { ClientEditPage } from './features/clients/pages/ClientEditPage'
import { ClientsPage } from './features/clients/pages/ClientsPage'
import { DashboardPage } from './features/dashboard/pages/DashboardPage'
import { EmployeeCreatePage } from './features/employees/pages/EmployeeCreatePage'
import { EmployeeEditPage } from './features/employees/pages/EmployeeEditPage'
import { EmployeeProfilePage } from './features/employees/pages/EmployeeProfilePage'
import { EmployeesPage } from './features/employees/pages/EmployeesPage'
import { OrderCreatePage } from './features/orders/pages/OrderCreatePage'
import { OrderDetailsPage } from './features/orders/pages/OrderDetailsPage'
import { OrderEditPage } from './features/orders/pages/OrderEditPage'
import { OrdersPage } from './features/orders/pages/OrdersPage'

function App() {
  const {
    initialSessionError,
    isInitialSessionLoading,
    retrySessionCheck,
  } = useAuth()

  if (isInitialSessionLoading) {
    return <AuthSessionBootstrap />
  }

  if (initialSessionError) {
    return <AuthSessionBootstrap error onRetry={() => void retrySessionCheck()} />
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/first-access" element={<FirstAccessPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/orders/new" element={<OrderCreatePage />} />
        <Route path="/orders/:orderId" element={<OrderDetailsPage />} />
        <Route path="/orders/:orderId/edit" element={<OrderEditPage />} />
        <Route path="/clients" element={<ClientsPage />} />
        <Route path="/clients/new" element={<ClientCreatePage />} />
        <Route path="/clients/:clientId/edit" element={<ClientEditPage />} />
        <Route element={<ProtectedRoute requiredProfile="admin" />}>
          <Route path="/employees" element={<EmployeesPage />} />
          <Route path="/employees/new" element={<EmployeeCreatePage />} />
          <Route
            path="/employees/:employeeId"
            element={<EmployeeProfilePage />}
          />
          <Route
            path="/employees/:employeeId/edit"
            element={<EmployeeEditPage />}
          />
        </Route>
      </Route>
    </Routes>
  )
}

export default App
