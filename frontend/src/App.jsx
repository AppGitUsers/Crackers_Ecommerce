import { Routes, Route } from 'react-router-dom'

// Storefront
import StorefrontLayout from './components/storefront/StorefrontLayout.jsx'
import HomePage from './pages/storefront/HomePage.jsx'
import CartPage from './pages/storefront/CartPage.jsx'
import CheckoutPage from './pages/storefront/CheckoutPage.jsx'
import OrderSuccessPage from './pages/storefront/OrderSuccessPage.jsx'
import MyOrdersPage from './pages/storefront/MyOrdersPage.jsx'

// Admin
import AdminLoginPage from './pages/admin/AdminLoginPage.jsx'
import AdminLayout from './components/admin/AdminLayout.jsx'
import ProtectedRoute from './components/admin/ProtectedRoute.jsx'
import DashboardPage from './pages/admin/DashboardPage.jsx'
import CategoriesPage from './pages/admin/CategoriesPage.jsx'
import ProductsPage from './pages/admin/ProductsPage.jsx'
import OrdersPage from './pages/admin/OrdersPage.jsx'
import OrderDetailPage from './pages/admin/OrderDetailPage.jsx'
import OffersPage from './pages/admin/OffersPage.jsx'
import FinancePage from './pages/admin/FinancePage.jsx'
import CallsPage from './pages/admin/CallsPage.jsx'
import StaffPage from './pages/admin/staff/StaffPage.jsx'

export default function App() {
  return (
    <Routes>
      {/* ---------- Storefront ---------- */}
      <Route element={<StorefrontLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/order-success/:orderNumber" element={<OrderSuccessPage />} />
        <Route path="/my-orders" element={<MyOrdersPage />} />
      </Route>

      {/* ---------- Admin CRM ---------- */}
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="orders/:id" element={<OrderDetailPage />} />
        <Route path="offers" element={<OffersPage />} />
        <Route path="finance" element={<FinancePage />} />
        <Route path="calls" element={<CallsPage />} />
        <Route path="staff" element={<StaffPage />} />
      </Route>
    </Routes>
  )
}
