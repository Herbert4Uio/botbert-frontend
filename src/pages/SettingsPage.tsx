import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { Settings, QrCode, Smartphone, LogOut, Loader2, Shield, Zap, CreditCard, AlertTriangle, Save, Server, Clock } from 'lucide-react';
import { useToastStore } from '../store/toastStore';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { io } from 'socket.io-client';
import { QRCodeSVG } from 'qrcode.react';

export function SettingsPage() {
  const { user } = useAuthStore();
  const [status, setStatus] = useState<'DISCONNECTED' | 'QR_READY' | 'CONNECTED'>('DISCONNECTED');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const [tenant, setTenant] = useState<any>(null);
  const [aiMemoryLimit, setAiMemoryLimit] = useState(10);
  const [qrImageBase64, setQrImageBase64] = useState<string>('');
  const [conversationExpirationHours, setConversationExpirationHours] = useState(24);
  const [maxOrdersPerDay, setMaxOrdersPerDay] = useState(5);
  const [maxItemsPerOrder, setMaxItemsPerOrder] = useState(20);
  const [systemPrompt, setSystemPrompt] = useState<string>('');
  const [useCustomSystemPrompt, setUseCustomSystemPrompt] = useState<boolean>(false);
  const [isSavingMemory, setIsSavingMemory] = useState(false);

  const { addToast } = useToastStore();
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    requiredInputText?: string;
    onConfirm: () => void;
    isDestructive?: boolean;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const confirmAction = (title: string, message: string, onConfirm: () => void, isDestructive = false, requiredInputText?: string) => {
    setModalConfig({ isOpen: true, title, message, requiredInputText, onConfirm, isDestructive });
  };

  useEffect(() => {
    if (!user) return;
    
    fetchStatus();
    fetchTenantConfig();

    const socketInstance = io(import.meta.env.VITE_API_URL || 'http://localhost:3000/whatsapp', {
      query: { tenantId: user.tenantId }
    });

    socketInstance.on('status', (data) => {
      setStatus(data.status);
      if (data.status === 'CONNECTED' || data.status === 'DISCONNECTED') {
        setQrCode(null);
        setLoading(false);
      }
    });

    socketInstance.on('qr', (data) => {
      setQrCode(data.qr);
      setStatus('QR_READY');
      setLoading(false);
    });

    return () => {
      socketInstance.disconnect();
    };
  }, [user]);

  const fetchStatus = async () => {
    try {
      const { data } = await api.get('/whatsapp/status');
      setStatus(data.status);
      if (data.qr) setQrCode(data.qr);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchTenantConfig = async () => {
    try {
      const { data } = await api.get('/tenants/my-tenant');
      setTenant(data);
      if (data) {
        setAiMemoryLimit(data.aiMemoryLimit ?? 10);
        setQrImageBase64(data.qrImageBase64 ?? '');
        setConversationExpirationHours(data.conversationExpirationHours ?? 24);
        setMaxOrdersPerDay(data.maxOrdersPerDay ?? 5);
        setMaxItemsPerOrder(data.maxItemsPerOrder ?? 20);
        setSystemPrompt(data.systemPrompt ?? '');
        setUseCustomSystemPrompt(data.useCustomSystemPrompt ?? false);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleConnect = async () => {
    setLoading(true);
    try {
      await api.post('/whatsapp/connect');
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    confirmAction(
      'Desconectar WhatsApp',
      '¿Estás seguro de cerrar la sesión de WhatsApp? La IA dejará de responder mensajes y perderás la conexión.',
      async () => {
        try {
          await api.post('/whatsapp/disconnect');
          setStatus('DISCONNECTED');
          setQrCode(null);
          addToast('Sesión de WhatsApp cerrada', 'success');
          setModalConfig((prev) => ({ ...prev, isOpen: false }));
        } catch (error) {
          console.error(error);
          addToast('Error al cerrar sesión', 'error');
          setModalConfig((prev) => ({ ...prev, isOpen: false }));
        }
      },
      true
    );
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setQrImageBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveConfig = () => {
    confirmAction(
      'Guardar Configuración',
      '¿Estás seguro de guardar estos cambios? Esto actualizará las reglas del Bot para todos tus clientes.',
      async () => {
        if (!tenant) return;
        setIsSavingMemory(true);
        try {
          await api.put(`/tenants/${tenant._id}`, { 
            aiMemoryLimit, 
            qrImageBase64,
            conversationExpirationHours,
            maxOrdersPerDay,
            maxItemsPerOrder,
            systemPrompt,
            useCustomSystemPrompt
          });
          addToast('Configuración actualizada exitosamente', 'success');
          setModalConfig((prev) => ({ ...prev, isOpen: false }));
        } catch(e) {
          addToast('Error al actualizar configuración', 'error');
          setModalConfig((prev) => ({ ...prev, isOpen: false }));
        } finally {
          setIsSavingMemory(false);
        }
      }
    );
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-corporate-100">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-corporate-50 rounded-xl">
            <Settings className="w-8 h-8 text-corporate-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-corporate-900">Configuración General</h1>
            <p className="text-corporate-500 text-sm mt-1">Administra la conexión de WhatsApp y las reglas de Inteligencia Artificial.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: WhatsApp Connection */}
        <div className="lg:col-span-1 space-y-8">
          <div className="bg-white rounded-2xl shadow-sm border border-corporate-100 overflow-hidden">
            <div className="p-5 border-b border-corporate-50 bg-corporate-50/50 flex items-center gap-3">
              <Smartphone className="w-5 h-5 text-corporate-600" />
              <h2 className="font-bold text-corporate-900">Conexión de WhatsApp</h2>
            </div>
            
            <div className="p-6 flex flex-col items-center text-center space-y-6">
              {status === 'DISCONNECTED' && (
                <>
                  <div className="w-20 h-20 bg-corporate-50 rounded-full flex items-center justify-center border-4 border-white shadow-sm">
                    <Smartphone className="w-8 h-8 text-corporate-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-corporate-900">Desconectado</h3>
                    <p className="text-corporate-500 text-sm mt-2">
                      El asistente requiere un dispositivo vinculado para enviar y recibir mensajes.
                    </p>
                  </div>
                  <button 
                    onClick={handleConnect}
                    disabled={loading}
                    className="w-full bg-accent hover:bg-accent-hover text-white px-6 py-2.5 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <QrCode className="w-5 h-5" />}
                    {loading ? 'Inicializando...' : 'Vincular Dispositivo'}
                  </button>
                </>
              )}

              {status === 'QR_READY' && (
                <>
                  <div className="p-4 bg-white border border-corporate-200 rounded-2xl shadow-sm inline-block">
                    {qrCode ? (
                       <QRCodeSVG value={qrCode} size={200} />
                    ) : (
                       <div className="w-[200px] h-[200px] flex items-center justify-center">
                          <Loader2 className="w-8 h-8 animate-spin text-accent" />
                       </div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-corporate-900">Escanea el QR</h3>
                    <p className="text-corporate-500 text-sm mt-2">
                      Abre WhatsApp en tu teléfono, ve a "Dispositivos Vinculados" y escanea este código.
                    </p>
                  </div>
                </>
              )}

              {status === 'CONNECTED' && (
                <>
                  <div className="relative">
                    <div className="w-20 h-20 bg-green-50 border-4 border-white shadow-sm rounded-full flex items-center justify-center relative z-10">
                      <Smartphone className="w-8 h-8 text-green-500" />
                    </div>
                    <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-20"></div>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-green-600">¡Dispositivo Conectado!</h3>
                    <p className="text-corporate-500 text-sm mt-2">
                      El Asistente IA está escuchando y respondiendo a los mensajes de tus clientes.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Maintenance Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-corporate-100 overflow-hidden">
            <div className="p-5 border-b border-corporate-50 bg-corporate-50/50 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              <h2 className="font-bold text-corporate-900">Zona de Riesgo</h2>
            </div>
            
            <div className="p-6 space-y-4">
              <button 
                onClick={() => {
                  confirmAction(
                    'Limpiar Memoria de la IA',
                    '¿Estás seguro de que quieres que la IA olvide el historial de TODOS los chats? Esto obligará a todos los clientes a reiniciar su flujo de compra.',
                    async () => {
                      try {
                        await api.delete('/sales/history');
                        addToast('¡Memoria de la IA borrada exitosamente!', 'success');
                        setModalConfig((prev) => ({ ...prev, isOpen: false }));
                      } catch (e) {
                        addToast('Error al borrar la memoria.', 'error');
                        setModalConfig((prev) => ({ ...prev, isOpen: false }));
                      }
                    },
                    true
                  );
                }}
                className="w-full bg-orange-50 text-orange-600 hover:bg-orange-100 border border-orange-200 px-4 py-3 rounded-xl font-medium transition-colors flex items-center justify-between text-sm"
              >
                <span className="flex items-center gap-2">
                  <Server className="w-4 h-4" />
                  Limpiar Memoria de la IA
                </span>
              </button>

              <button 
                onClick={handleDisconnect}
                disabled={status === 'DISCONNECTED'}
                className="w-full bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 px-4 py-3 rounded-xl font-medium transition-colors flex items-center justify-between text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="flex items-center gap-2">
                  <LogOut className="w-4 h-4" />
                  Cerrar Sesión WhatsApp
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: IA & Store Config */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-2xl shadow-sm border border-corporate-100 overflow-hidden">
            <div className="p-5 border-b border-corporate-50 bg-corporate-50/50 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-accent" />
                <h2 className="font-bold text-corporate-900">Reglas y Prevención de Fraudes</h2>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              
              <div className="grid grid-cols-1 gap-6">
                <div className="bg-corporate-50/50 p-5 rounded-xl border border-corporate-100">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-white rounded-lg border border-corporate-100 shadow-sm">
                      <Clock className="w-5 h-5 text-corporate-600" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-base font-bold text-corporate-900 mb-1">Caducidad de Sesión del Cliente (Horas)</label>
                      <p className="text-sm text-corporate-500 mb-3">
                        Establece el tiempo máximo de inactividad permitido antes de que el bot "olvide" el contexto del chat. 
                        Si un cliente deja de responder por este tiempo, la Inteligencia Artificial reiniciará la conversación 
                        desde cero la próxima vez que el cliente envíe un mensaje. (Recomendado: 24 horas).
                      </p>
                      <div className="flex items-center gap-3 max-w-[200px]">
                        <input 
                          type="number" 
                          value={conversationExpirationHours} 
                          onChange={(e) => setConversationExpirationHours(Number(e.target.value))}
                          className="w-full px-3 py-2 bg-white border border-corporate-200 rounded-lg focus:ring-2 focus:ring-accent outline-none text-corporate-900 font-bold"
                          min={1}
                          max={72}
                        />
                        <span className="text-sm font-semibold text-corporate-500">Horas</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-corporate-50/50 p-5 rounded-xl border border-corporate-100">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-white rounded-lg border border-corporate-100 shadow-sm">
                      <Shield className="w-5 h-5 text-corporate-600" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-base font-bold text-corporate-900 mb-1">Límite Diario de Órdenes por Cliente</label>
                      <p className="text-sm text-corporate-500 mb-3">
                        Bloqueo de seguridad para evitar que clientes falsos, bots de la competencia o usuarios malintencionados saturen el sistema. 
                        Define la cantidad máxima de pedidos separados que un mismo número de WhatsApp puede concretar en un plazo de 24 horas. 
                        Superado el límite, la IA les sugerirá contactar a soporte humano.
                      </p>
                      <div className="flex items-center gap-3 max-w-[200px]">
                        <input 
                          type="number" 
                          value={maxOrdersPerDay} 
                          onChange={(e) => setMaxOrdersPerDay(Number(e.target.value))}
                          className="w-full px-3 py-2 bg-white border border-corporate-200 rounded-lg focus:ring-2 focus:ring-accent outline-none text-corporate-900 font-bold"
                          min={1}
                        />
                        <span className="text-sm font-semibold text-corporate-500">Órdenes</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-corporate-50/50 p-5 rounded-xl border border-corporate-100">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-white rounded-lg border border-corporate-100 shadow-sm">
                      <Shield className="w-5 h-5 text-corporate-600" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-base font-bold text-corporate-900 mb-1">Límite de Productos por Orden</label>
                      <p className="text-sm text-corporate-500 mb-3">
                        Evita compras con cantidades absurdas (ej. un cliente pidiendo "1,000,000 de zapatos" para confundir a la IA). 
                        Define la cantidad máxima unitaria permitida por cada producto dentro de un mismo pedido.
                      </p>
                      <div className="flex items-center gap-3 max-w-[200px]">
                        <input 
                          type="number" 
                          value={maxItemsPerOrder} 
                          onChange={(e) => setMaxItemsPerOrder(Number(e.target.value))}
                          className="w-full px-3 py-2 bg-white border border-corporate-200 rounded-lg focus:ring-2 focus:ring-accent outline-none text-corporate-900 font-bold"
                          min={1}
                        />
                        <span className="text-sm font-semibold text-corporate-500">Unidades</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-corporate-50/50 p-5 rounded-xl border border-corporate-100">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-white rounded-lg border border-corporate-100 shadow-sm">
                      <Zap className="w-5 h-5 text-corporate-600" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-base font-bold text-corporate-900 mb-1">Límite de Memoria Semántica (Mensajes)</label>
                      <p className="text-sm text-corporate-500 mb-3">
                        Define cuántos de los últimos mensajes enviados/recibidos leerá la IA antes de responder. 
                        Un número mayor permite conversaciones más humanas y contextuadas, pero consume notablemente más Tokens y aumenta el costo por mensaje.
                        Se recomienda entre 10 y 15 para un equilibrio ideal entre costo y contexto.
                      </p>
                      <div className="flex items-center gap-3 max-w-[200px]">
                        <input 
                          type="number" 
                          value={aiMemoryLimit} 
                          onChange={(e) => setAiMemoryLimit(Number(e.target.value))}
                          className="w-full px-3 py-2 bg-white border border-corporate-200 rounded-lg focus:ring-2 focus:ring-accent outline-none text-corporate-900 font-bold"
                          min={1}
                          max={50}
                        />
                        <span className="text-sm font-semibold text-corporate-500">Mensajes</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Nueva fila para el System Prompt */}
              <div className="bg-corporate-50/50 p-5 rounded-xl border border-corporate-100">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-white rounded-lg border border-corporate-100 shadow-sm">
                    <Zap className="w-5 h-5 text-corporate-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-base font-bold text-corporate-900">Personalidad e Instrucciones Base (System Prompt)</label>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer"
                          checked={useCustomSystemPrompt}
                          onChange={(e) => {
                            if (e.target.checked) {
                              confirmAction(
                                'Habilitar Prompt 100% Personalizado',
                                '¡ATENCIÓN! Al habilitar esta opción, la IA ignorará TODAS las reglas predeterminadas del sistema (Modelo de ventas, límites de seguridad, recolección de ciudad, validación de stock, etc.). Tendrás que escribir toda la lógica de ventas manualmente en el campo inferior. ¿Estás seguro de que quieres sobreescribir el cerebro del bot?',
                                () => {
                                  setUseCustomSystemPrompt(true);
                                  setModalConfig(prev => ({...prev, isOpen: false}));
                                },
                                true,
                                'CONFIRMAR'
                              );
                            } else {
                              setUseCustomSystemPrompt(false);
                            }
                          }}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-accent rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                      </label>
                    </div>
                    <p className="text-sm text-corporate-500 mb-3">
                      {useCustomSystemPrompt 
                        ? 'Estás usando un Prompt 100% Personalizado. Ninguna regla de seguridad o flujo de ventas predeterminado se aplicará.' 
                        : 'Define cómo se comportará la IA de forma general. El sistema le inyectará a esta instrucción todas las herramientas de venta (AIDA, Handoff, Catálogo) por detrás de forma invisible.'}
                    </p>
                    <textarea 
                      value={systemPrompt}
                      onChange={(e) => setSystemPrompt(e.target.value)}
                      className={`w-full px-4 py-3 bg-white border ${useCustomSystemPrompt ? 'border-red-300 ring-1 ring-red-100' : 'border-corporate-200'} rounded-xl focus:ring-2 focus:ring-accent outline-none text-corporate-900 resize-y min-h-[120px] font-medium`}
                      placeholder="Ej: Eres el Asistente de Ventas Inteligente. Tu objetivo es ayudar al cliente a encontrar el producto ideal y cerrar la venta..."
                    />
                  </div>
                </div>
              </div>

            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-corporate-100 overflow-hidden">
            <div className="p-5 border-b border-corporate-50 bg-corporate-50/50 flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-corporate-600" />
              <h2 className="font-bold text-corporate-900">Pagos con QR</h2>
            </div>
            
            <div className="p-6">
              <div className="flex flex-col md:flex-row gap-6 items-start">
                <div className="flex-1 space-y-4">
                  <p className="text-sm text-corporate-600">
                    Sube una imagen del código QR bancario de tu empresa. El Bot de ventas lo enviará automáticamente cuando el cliente decida usar este método de pago.
                  </p>
                  
                  <div className="relative">
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="block w-full text-sm text-corporate-500
                        file:mr-4 file:py-2.5 file:px-4
                        file:rounded-lg file:border-0
                        file:text-sm file:font-semibold
                        file:bg-corporate-50 file:text-corporate-700
                        hover:file:bg-corporate-100 file:cursor-pointer
                        border border-corporate-200 rounded-xl bg-white
                        focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                </div>
                
                {qrImageBase64 ? (
                  <div className="w-full md:w-48 flex-shrink-0 bg-corporate-50 border border-corporate-200 rounded-xl p-3 flex flex-col items-center">
                    <span className="text-xs font-bold text-corporate-400 uppercase tracking-wider mb-2">Previsualización</span>
                    <img src={qrImageBase64} alt="QR de Pagos" className="w-full h-auto aspect-square object-contain bg-white rounded-lg shadow-sm border border-corporate-100" />
                  </div>
                ) : (
                  <div className="w-full md:w-48 flex-shrink-0 bg-corporate-50 border border-dashed border-corporate-200 rounded-xl p-3 flex flex-col items-center justify-center aspect-square text-corporate-400 text-xs text-center">
                    Sin imagen cargada
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button 
              onClick={handleSaveConfig}
              disabled={isSavingMemory}
              className="bg-accent hover:bg-accent-hover text-white px-8 py-3.5 rounded-xl font-bold shadow-md shadow-accent/20 transition-all flex items-center justify-center gap-2 min-w-[200px]"
            >
              {isSavingMemory ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {isSavingMemory ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>

        </div>
      </div>

      <ConfirmModal
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        message={modalConfig.message}
        requiredInputText={modalConfig.requiredInputText}
        onConfirm={modalConfig.onConfirm}
        onCancel={() => setModalConfig((prev) => ({ ...prev, isOpen: false }))}
        isDestructive={modalConfig.isDestructive}
      />
    </div>
  );
}
