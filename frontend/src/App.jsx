import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'

// Admin
import { AuthProvider }    from './admin/context/AuthContext'
import ProtectedRoute      from './admin/components/ProtectedRoute'
import AdminLogin          from './admin/pages/Login'
import Dashboard           from './admin/pages/Dashboard'
import Products            from './admin/pages/Products'
import Orders              from './admin/pages/Orders'
import Settings            from './admin/pages/Settings' 
import { LangProvider }    from './admin/context/LangContext'

// Shop
import { ShopAuthProvider } from './shop/context/AuthContext'
import { CartProvider }     from './shop/context/CartContext'
import Home                 from './shop/pages/Home'
import ProductDetail        from './shop/pages/ProductDetail'
import Cart                 from './shop/pages/Cart'
import Checkout             from './shop/pages/Checkout'
import Account              from './shop/pages/Account'
import AuthCallback         from './shop/pages/AuthCallback'
import Privacy              from './shop/pages/Privacy'  
import Terms                from './shop/pages/Terms'  

// A small layout wrapper just for Admin language and auth
const AdminLayout = () => (
  <LangProvider>
    <AuthProvider>
      <Outlet /> {/* This is where nested admin routes will render */}
    </AuthProvider>
  </LangProvider>
)

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ── Admin Routes (Scoped with AdminLayout) ── */}
        <Route element={<AdminLayout />}>
          <Route path="/admin/login"    element={<AdminLogin />} />
          <Route path="/admin"          element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/admin/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
          <Route path="/admin/orders"   element={<ProtectedRoute><Orders /></ProtectedRoute>} />
          <Route path="/admin/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} /> {/* <-- New Admin route */}
        </Route>

        {/* ── Shop Routes (Scoped with Shop Auth + Cart) ── */}
        <Route element={
          <ShopAuthProvider>
            <CartProvider>
              <Outlet />
            </CartProvider>
          </ShopAuthProvider>
        }>
          <Route path="/"                element={<Home />} />
          <Route path="/product/:id"    element={<ProductDetail />} />
          <Route path="/cart"            element={<Cart />} />
          <Route path="/checkout"        element={<Checkout />} />
          <Route path="/account"         element={<Account />} />
          <Route path="/auth/callback"   element={<AuthCallback />} />
          <Route path="/privacy-policy"    element={<Privacy />} />   {/* <-- New Shop route */}
          <Route path="/terms-of-service"  element={<Terms />} />  {/* <-- New Shop route */}
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}