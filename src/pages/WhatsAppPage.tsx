import { useAuthStore } from '../store/authStore';
import { WhatsAppConnection } from '../components/whatsapp/WhatsAppConnection';

export function WhatsAppPage() {
  const { user } = useAuthStore();

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-corporate-100">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-corporate-50 rounded-xl">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-corporate-600"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-corporate-900">Conexión a WhatsApp</h1>
            <p className="text-corporate-500 text-sm mt-1">Vincula tu número de teléfono para que el Bot empiece a responder.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="lg:col-span-1 space-y-8">
          {user?.tenantId && <WhatsAppConnection tenantId={user.tenantId} />}
        </div>
        <div className="lg:col-span-1 space-y-4">
           <div className="bg-corporate-900 text-white p-6 rounded-2xl shadow-sm relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-10">
               <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
             </div>
             <h3 className="font-bold text-lg mb-2 relative z-10">¿Cómo vincular?</h3>
             <ul className="space-y-3 text-sm text-corporate-300 relative z-10">
               <li className="flex gap-2"><span className="text-accent font-bold">1.</span> Abre WhatsApp en tu teléfono celular.</li>
               <li className="flex gap-2"><span className="text-accent font-bold">2.</span> Toca el ícono de menú (tres puntos) o Configuración.</li>
               <li className="flex gap-2"><span className="text-accent font-bold">3.</span> Selecciona "Dispositivos Vinculados".</li>
               <li className="flex gap-2"><span className="text-accent font-bold">4.</span> Toca "Vincular un dispositivo" y apunta al código QR.</li>
             </ul>
           </div>
        </div>
      </div>
    </div>
  );
}
