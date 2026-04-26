import "./App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import DashboardLayout from "./pages/DashboardLayout";
import DashboardHome from "./pages/DashboardHome";
import DashboardProducts from "./pages/DashboardProducts";
import DashboardOrders from "./pages/DashboardOrders";
import DashboardCustomers from "./pages/DashboardCustomers";
import DashboardAnalytics from "./pages/DashboardAnalytics";
import DashboardSettings from "./pages/DashboardSettings";
import DashboardAffiliates from "./pages/DashboardAffiliates";
import Storefront from "./pages/Storefront";
import ProductDetail from "./pages/ProductDetail";
import Checkout from "./pages/Checkout";

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-12 text-center text-zinc-500">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <Toaster position="top-right" richColors />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/store/:username" element={<Storefront />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/dashboard" element={<Protected><DashboardLayout /></Protected>}>
              <Route index element={<DashboardHome />} />
              <Route path="products" element={<DashboardProducts />} />
              <Route path="orders" element={<DashboardOrders />} />
              <Route path="customers" element={<DashboardCustomers />} />
              <Route path="analytics" element={<DashboardAnalytics />} />
              <Route path="affiliates" element={<DashboardAffiliates />} />
              <Route path="settings" element={<DashboardSettings />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}
