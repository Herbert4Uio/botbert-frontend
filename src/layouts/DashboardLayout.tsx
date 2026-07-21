import { Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { LogOut, LayoutDashboard, ShoppingBag, Package, Settings, Layers, MapPin, Building2, MessageSquare } from 'lucide-react';
import { cn } from '../utils/cn';
import { ToastContainer } from '../components/ui/ToastContainer';

export function DashboardLayout() {
  const { user, logout } = useAuthStore();

  return (
    <div className="flex h-screen bg-corporate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-corporate-900 text-white flex flex-col">
        <div className="p-6 overflow-hidden">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 flex-shrink-0 text-accent" />
            <span className="truncate">Botbert</span>
          </h1>
          <p className="text-corporate-300 text-sm mt-1 truncate" title={user?.username}>{user?.username}</p>
          {user?.tenantName && (
            <p className="text-accent text-xs mt-1 truncate font-medium bg-accent/10 inline-block px-2 py-0.5 rounded-full" title={user?.tenantName}>
              {user?.tenantName}
            </p>
          )}
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2">
          {user?.role === 'SUPERADMIN' ? (
            <a href="/tenants" className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
              window.location.pathname.includes('/tenants') ? "bg-corporate-800 text-white" : "text-corporate-300 hover:bg-corporate-800/50 hover:text-white"
            )}>
              <Building2 className="w-5 h-5" />
              Empresas (Tenants)
            </a>
          ) : (
            <>
              <a href="/orders" className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                window.location.pathname.includes('/orders') ? "bg-corporate-800 text-white" : "text-corporate-300 hover:bg-corporate-800/50 hover:text-white"
              )}>
                <ShoppingBag className="w-5 h-5" />
                Órdenes
              </a>
              <a href="/chats" className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                window.location.pathname.includes('/chats') ? "bg-corporate-800 text-white" : "text-corporate-300 hover:bg-corporate-800/50 hover:text-white"
              )}>
                <MessageSquare className="w-5 h-5" />
                Chats
              </a>
              
              <a href="/catalog" className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                window.location.pathname.includes('/catalog') ? "bg-corporate-800 text-white" : "text-corporate-300 hover:bg-corporate-800/50 hover:text-white"
              )}>
                <Package className="w-5 h-5" />
                Catálogo
              </a>

              <a href="/categories" className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                window.location.pathname.includes('/categories') ? "bg-corporate-800 text-white" : "text-corporate-300 hover:bg-corporate-800/50 hover:text-white"
              )}>
                <Layers className="w-5 h-5" />
                Categorías
              </a>

              <a href="/cities" className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                window.location.pathname.includes('/cities') ? "bg-corporate-800 text-white" : "text-corporate-300 hover:bg-corporate-800/50 hover:text-white"
              )}>
                <MapPin className="w-5 h-5" />
                Ciudades
              </a>

              {(user?.role === 'OWNER') && (
                <>
                  <a href="/branches" className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors mt-4",
                    window.location.pathname.includes('/branches') ? "bg-corporate-800 text-white" : "text-corporate-300 hover:bg-corporate-800/50 hover:text-white"
                  )}>
                    <Building2 className="w-5 h-5" />
                    Sucursales
                  </a>
                  <a href="/settings" className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                    window.location.pathname.includes('/settings') ? "bg-corporate-800 text-white" : "text-corporate-300 hover:bg-corporate-800/50 hover:text-white"
                  )}>
                    <Settings className="w-5 h-5" />
                    Configuración
                  </a>
                </>
              )}
            </>
          )}
        </nav>

        <div className="p-4 border-t border-corporate-800">
          <button
            onClick={logout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-corporate-300 hover:bg-red-500/10 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <header className="bg-white border-b border-corporate-100 px-8 py-4 sticky top-0 z-10 flex justify-between items-center">
          <h2 className="text-lg font-medium text-corporate-900">
            {window.location.pathname.includes('/tenants') ? 'Gestión de Empresas' :
             window.location.pathname.includes('/orders') ? 'Gestión de Órdenes' : 
             window.location.pathname.includes('/chats') ? 'Chats Activos' :
             window.location.pathname.includes('/prompt-generator') ? 'Generador de Prompt IA' :
             window.location.pathname.includes('/settings') ? 'Configuración de Empresa' :
             window.location.pathname.includes('/branches') ? 'Sucursales' :
             'Sistema'}
          </h2>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent/10 text-accent">
              Rol: {user?.role}
            </span>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto bg-corporate-50 p-8 custom-scrollbar relative">
          <Outlet />
        </div>
      </main>
      
      {/* Sistema de notificaciones global */}
      <ToastContainer />
    </div>
  );
}
