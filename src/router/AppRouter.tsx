import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '../components/ui/ProtectedRoute';
import { LoginPage } from '../pages/LoginPage';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { OrdersPage } from '../pages/OrdersPage';
import { CatalogPage } from '../pages/CatalogPage';
import { CategoriesPage } from '../pages/CategoriesPage';
import { CitiesPage } from '../pages/CitiesPage';
import { BranchesPage } from '../pages/BranchesPage';
import { ChatsPage } from '../pages/ChatsPage';
import { SettingsPage } from '../pages/SettingsPage';
import { TenantsPage } from '../pages/TenantsPage';
import { PromptGeneratorPage } from '../pages/PromptGeneratorPage';

export function AppRouter() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/" element={<Navigate to="/orders" replace />} />
            <Route path="/tenants" element={<TenantsPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/catalog" element={<CatalogPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/cities" element={<CitiesPage />} />
            <Route path="/chats" element={<ChatsPage />} />
            <Route path="/branches" element={<BranchesPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/prompt-generator" element={<PromptGeneratorPage />} />
          </Route>
        </Route>
        
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}
