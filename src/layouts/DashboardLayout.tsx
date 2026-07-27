import { Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { LogOut, LayoutDashboard, ShoppingBag, Package, Settings, Layers, MapPin, Building2, MessageSquare, Sparkles } from 'lucide-react';
import { cn } from '../utils/cn';
import { ToastContainer } from '../components/ui/ToastContainer';

export function DashboardLayout() {
  const { user, logout } = useAuthStore();

  return (
    <div className="flex h-screen bg-corporate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-[#1a1c23] text-[#94a3b8] flex flex-col shadow-xl z-20">
        <div className="p-6">
          <h1 className="text-xl font-bold flex items-center gap-3 text-white">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
              <LayoutDashboard className="w-5 h-5 text-white" />
            </div>
            <span className="tracking-wide">Botbert</span>
          </h1>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto custom-scrollbar">
          {user?.role === 'SUPERADMIN' ? (
            <div>
              <p className="px-4 text-[10px] font-bold tracking-widest text-[#475569] uppercase mb-2">Administración</p>
              <a href="/tenants" className={cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all text-sm font-medium",
                window.location.pathname.includes('/tenants') ? "bg-accent/10 text-accent" : "hover:bg-[#2d333b] hover:text-white"
              )}>
                <Building2 className="w-4 h-4" />
                Empresas (Tenants)
              </a>
            </div>
          ) : (
            <>
              {/* Grupo 1: Ventas y Atención */}
              <div>
                <p className="px-4 text-[10px] font-bold tracking-widest text-[#475569] uppercase mb-2">Ventas & Atención</p>
                <div className="space-y-1">
                  <a href="/orders" className={cn(
                    "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all text-sm font-medium",
                    window.location.pathname.includes('/orders') ? "bg-accent/10 text-accent" : "hover:bg-[#2d333b] hover:text-white"
                  )}>
                    <ShoppingBag className="w-4 h-4" />
                    Órdenes
                  </a>
                  <a href="/chats" className={cn(
                    "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all text-sm font-medium",
                    window.location.pathname.includes('/chats') ? "bg-accent/10 text-accent" : "hover:bg-[#2d333b] hover:text-white"
                  )}>
                    <MessageSquare className="w-4 h-4" />
                    Chats
                  </a>
                </div>
              </div>

              {/* Grupo 2: Inventario & Productos */}
              <div>
                <p className="px-4 text-[10px] font-bold tracking-widest text-[#475569] uppercase mb-2">Inventario & Productos</p>
                <div className="space-y-1">
                  <a href="/catalog" className={cn(
                    "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all text-sm font-medium",
                    window.location.pathname.includes('/catalog') ? "bg-accent/10 text-accent" : "hover:bg-[#2d333b] hover:text-white"
                  )}>
                    <Package className="w-4 h-4" />
                    Catálogo
                  </a>
                  <a href="/categories" className={cn(
                    "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all text-sm font-medium",
                    window.location.pathname.includes('/categories') ? "bg-accent/10 text-accent" : "hover:bg-[#2d333b] hover:text-white"
                  )}>
                    <Layers className="w-4 h-4" />
                    Categorías
                  </a>
                </div>
              </div>

              {/* Grupo 3: Gestión y Contactos */}
              <div>
                <p className="px-4 text-[10px] font-bold tracking-widest text-[#475569] uppercase mb-2">Gestión & Sistema</p>
                <div className="space-y-1">
                  <a href="/cities" className={cn(
                    "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all text-sm font-medium",
                    window.location.pathname.includes('/cities') ? "bg-accent/10 text-accent" : "hover:bg-[#2d333b] hover:text-white"
                  )}>
                    <MapPin className="w-4 h-4" />
                    Ciudades
                  </a>

                  {(user?.role === 'OWNER') && (
                    <>
                      <a href="/branches" className={cn(
                        "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all text-sm font-medium",
                        window.location.pathname.includes('/branches') ? "bg-accent/10 text-accent" : "hover:bg-[#2d333b] hover:text-white"
                      )}>
                        <Building2 className="w-4 h-4" />
                        Sucursales
                      </a>
                      <a href="/whatsapp" className={cn(
                        "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all text-sm font-medium",
                        window.location.pathname.includes('/whatsapp') ? "bg-accent/10 text-accent" : "hover:bg-[#2d333b] hover:text-white"
                      )}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg>
                        Conexión WhatsApp
                      </a>
                      <a href="/settings" className={cn(
                        "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all text-sm font-medium",
                        window.location.pathname.includes('/settings') && !window.location.pathname.includes('/prompt-generator') ? "bg-accent/10 text-accent" : "hover:bg-[#2d333b] hover:text-white"
                      )}>
                        <Settings className="w-4 h-4" />
                        Configuración
                      </a>
                      <a href="/prompt-generator" className={cn(
                        "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all text-sm font-medium",
                        window.location.pathname.includes('/prompt-generator') ? "bg-accent/10 text-accent" : "hover:bg-[#2d333b] hover:text-white"
                      )}>
                        <Sparkles className="w-4 h-4" />
                        Generador de Prompt
                      </a>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </nav>

        {/* User Profile Section at bottom */}
        <div className="p-4 border-t border-[#2d333b]">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-10 h-10 rounded-full bg-[#2d333b] flex items-center justify-center text-white font-bold border border-[#374151]">
              {user?.username?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate" title={user?.tenantName || user?.username}>{user?.tenantName || user?.username}</p>
              <p className="text-[10px] text-[#94a3b8] truncate font-mono mt-0.5">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center justify-center gap-2 px-4 py-2 w-full rounded-lg text-[#ef4444] hover:bg-[#ef4444]/10 transition-colors text-sm font-bold"
          >
            <LogOut className="w-4 h-4" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">

        <div className="flex-1 overflow-y-auto bg-corporate-50 p-8 custom-scrollbar relative">
          <Outlet />
        </div>
      </main>
      
      {/* Sistema de notificaciones global */}
      <ToastContainer />
    </div>
  );
}
