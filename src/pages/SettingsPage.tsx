import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { Settings, QrCode, Smartphone, LogOut, Loader2, Shield, Zap, CreditCard, AlertTriangle, Save, Server, Clock, HelpCircle, Plus, Trash2, MessageCircle, ExternalLink } from 'lucide-react';
import { useToastStore } from '../store/toastStore';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { io } from 'socket.io-client';
import { QRCodeSVG } from 'qrcode.react';

interface FaqItem {
  question: string;
  answer: string;
  keywords: string[];
}

export function SettingsPage() {
  const { user } = useAuthStore();
  const [status, setStatus] = useState<'DISCONNECTED' | 'QR_READY' | 'CONNECTED'>('DISCONNECTED');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [connectionMethod, setConnectionMethod] = useState<'qr' | 'pairing'>('qr');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  
  const [tenant, setTenant] = useState<any>(null);
  const [aiMemoryLimit, setAiMemoryLimit] = useState(10);
  const [qrImageBase64, setQrImageBase64] = useState<string>('');
  const [conversationExpirationHours, setConversationExpirationHours] = useState(24);
  const [maxOrdersPerDay, setMaxOrdersPerDay] = useState(5);
  const [maxItemsPerOrder, setMaxItemsPerOrder] = useState(20);
  const [systemPrompt, setSystemPrompt] = useState<string>('');
  const [useCustomSystemPrompt, setUseCustomSystemPrompt] = useState<boolean>(false);
  const [isSavingMemory, setIsSavingMemory] = useState(false);
  
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [greetingKeywords, setGreetingKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [editingFaqIndex, setEditingFaqIndex] = useState<number | null>(null);
  const [faqForm, setFaqForm] = useState<FaqItem>({ question: '', answer: '', keywords: [] });
  const [newFaqKeyword, setNewFaqKeyword] = useState('');
  const [isProductsModifiable, setIsProductsModifiable] = useState<boolean>(false);
  const [modifiableQuestion, setModifiableQuestion] = useState<string>('');

  const location = useLocation();
  const navigate = useNavigate();
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

    const apiUrl = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/whatsapp` : 'http://localhost:3000/whatsapp';
    const socketInstance = io(apiUrl, {
      query: { tenantId: user.tenantId }
    });

    socketInstance.on('status', (data) => {
      setStatus(data.status);
      if (data.status === 'CONNECTED' || data.status === 'DISCONNECTED') {
        setQrCode(null);
        setPairingCode(null);
        setLoading(false);
      }
    });

    socketInstance.on('qr', (data) => {
      setQrCode(data.qr);
      setStatus('QR_READY');
      setLoading(false);
    });

    socketInstance.on('pairingCode', (data) => {
      setPairingCode(data.code);
      setStatus('QR_READY');
      setLoading(false);
    });

    return () => {
      socketInstance.disconnect();
    };
  }, [user]);

  useEffect(() => {
    if (location.state?.generatedPrompt) {
      setSystemPrompt(location.state.generatedPrompt);
      setUseCustomSystemPrompt(true);
      addToast('Prompt generado aplicado. Revisa y guarda los cambios.', 'success');
      window.history.replaceState({}, '');
    }
  }, [location.state]);

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
        setFaqs(data.faqs ?? []);
        setGreetingKeywords(data.greetingKeywords ?? []);
        setIsProductsModifiable(data.isProductsModifiable ?? false);
        setModifiableQuestion(data.modifiableQuestion ?? '');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleConnect = async () => {
    setLoading(true);
    setQrCode(null);
    setPairingCode(null);
    try {
      if (connectionMethod === 'pairing' && phoneNumber.trim()) {
        const cleaned = phoneNumber.trim().replace(/[^0-9]/g, '');
        const { data } = await api.post('/whatsapp/connect/pairing', { phoneNumber: cleaned });
        if (data.error) {
          addToast(data.error, 'error');
          setLoading(false);
        }
      } else {
        await api.post('/whatsapp/connect');
      }
    } catch (error: any) {
      addToast(error.response?.data?.error || 'Error al iniciar conexión', 'error');
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
            useCustomSystemPrompt,
            faqs,
            greetingKeywords,
            isProductsModifiable,
            modifiableQuestion
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

  const handleAddKeyword = () => {
    const trimmed = newKeyword.trim().toLowerCase();
    if (trimmed && !greetingKeywords.includes(trimmed)) {
      setGreetingKeywords([...greetingKeywords, trimmed]);
      setNewKeyword('');
    }
  };

  const handleRemoveKeyword = (index: number) => {
    setGreetingKeywords(greetingKeywords.filter((_, i) => i !== index));
  };

  const handleSaveFaq = () => {
    if (!faqForm.question.trim() || !faqForm.answer.trim()) {
      addToast('La pregunta y respuesta son obligatorias', 'error');
      return;
    }
    if (editingFaqIndex !== null) {
      const updated = [...faqs];
      updated[editingFaqIndex] = faqForm;
      setFaqs(updated);
    } else {
      setFaqs([...faqs, faqForm]);
    }
    setFaqForm({ question: '', answer: '', keywords: [] });
    setEditingFaqIndex(null);
    setNewFaqKeyword('');
  };

  const handleEditFaq = (index: number) => {
    setFaqForm({ ...faqs[index] });
    setEditingFaqIndex(index);
    setNewFaqKeyword('');
  };

  const handleDeleteFaq = (index: number) => {
    setFaqs(faqs.filter((_, i) => i !== index));
    if (editingFaqIndex === index) {
      setFaqForm({ question: '', answer: '', keywords: [] });
      setEditingFaqIndex(null);
    }
  };

  const handleAddFaqKeyword = () => {
    const trimmed = newFaqKeyword.trim().toLowerCase();
    if (trimmed && !faqForm.keywords.includes(trimmed)) {
      setFaqForm({ ...faqForm, keywords: [...faqForm.keywords, trimmed] });
      setNewFaqKeyword('');
    }
  };

  const handleRemoveFaqKeyword = (index: number) => {
    setFaqForm({ ...faqForm, keywords: faqForm.keywords.filter((_, i) => i !== index) });
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

                  <div className="flex w-full bg-corporate-50 rounded-xl p-1">
                    <button
                      onClick={() => setConnectionMethod('qr')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                        connectionMethod === 'qr'
                          ? 'bg-white text-corporate-900 shadow-sm'
                          : 'text-corporate-500 hover:text-corporate-700'
                      }`}
                    >
                      <QrCode className="w-4 h-4" />
                      QR
                    </button>
                    <button
                      onClick={() => setConnectionMethod('pairing')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                        connectionMethod === 'pairing'
                          ? 'bg-white text-corporate-900 shadow-sm'
                          : 'text-corporate-500 hover:text-corporate-700'
                      }`}
                    >
                      <Smartphone className="w-4 h-4" />
                      Código
                    </button>
                  </div>

                  {connectionMethod === 'pairing' && (
                    <div className="w-full">
                      <label className="block text-sm font-medium text-corporate-700 mb-2 text-left">
                        Número de teléfono (con código de país)
                      </label>
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="Ej: 591714254068"
                        className="w-full px-4 py-2.5 bg-white border border-corporate-200 rounded-xl focus:ring-2 focus:ring-accent outline-none text-corporate-900 text-sm"
                      />
                    </div>
                  )}

                  <button
                    onClick={handleConnect}
                    disabled={loading || (connectionMethod === 'pairing' && !phoneNumber.trim())}
                    className="w-full bg-accent hover:bg-accent-hover text-white px-6 py-2.5 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : connectionMethod === 'pairing' ? <Smartphone className="w-5 h-5" /> : <QrCode className="w-5 h-5" />}
                    {loading
                      ? 'Inicializando...'
                      : connectionMethod === 'pairing'
                        ? 'Solicitar Código'
                        : 'Vincular Dispositivo'}
                  </button>
                </>
              )}

              {status === 'QR_READY' && (
                <>
                  {pairingCode ? (
                    <div className="w-full space-y-4">
                      <div className="p-6 bg-corporate-50 border-2 border-dashed border-accent rounded-2xl">
                        <p className="text-sm font-medium text-corporate-500 mb-2 text-center">
                          Introduce este código en WhatsApp
                        </p>
                        <p className="text-3xl font-bold text-accent text-center tracking-[0.25em] select-all font-mono">
                          {pairingCode}
                        </p>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-corporate-900">Código de Vinculación</h3>
                        <p className="text-corporate-500 text-sm mt-2">
                          Abre WhatsApp en tu teléfono, ve a "Dispositivos Vinculados" y selecciona "Vincular con número de teléfono". 
                          Ingresa este código cuando se solicite.
                        </p>
                      </div>
                    </div>
                  ) : (
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

                    {!useCustomSystemPrompt && (
                      <div className="mb-3">
                        <button
                          onClick={() => navigate('/prompt-generator')}
                          className="flex items-center gap-2 text-sm font-medium text-accent hover:text-accent-hover transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Abrir generador de prompts con IA
                        </button>
                      </div>
                    )}

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

          {/* FAQ Configuration Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-corporate-100 overflow-hidden">
            <div className="p-5 border-b border-corporate-50 bg-corporate-50/50 flex items-center gap-3">
              <HelpCircle className="w-5 h-5 text-accent" />
              <h2 className="font-bold text-corporate-900">Preguntas Frecuentes (FAQ)</h2>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-sm text-corporate-500">
                Define preguntas y respuestas que el bot manejará automáticamente sin usar IA. 
                Cuando un cliente envíe un mensaje que coincida con alguna de estas preguntas, 
                recibirá la respuesta instantáneamente.
              </p>

              {/* Existing FAQs List */}
              {faqs.length > 0 && (
                <div className="space-y-3">
                  {faqs.map((faq, index) => (
                    <div key={index} className="bg-corporate-50/50 p-4 rounded-xl border border-corporate-100">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-corporate-900 text-sm truncate" title={faq.question}>
                            P: {faq.question}
                          </p>
                          <p className="text-corporate-600 text-sm mt-1 line-clamp-2" title={faq.answer}>
                            R: {faq.answer}
                          </p>
                          {faq.keywords.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {faq.keywords.map((kw, ki) => (
                                <span key={ki} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-accent/10 text-accent">
                                  {kw}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => handleEditFaq(index)}
                            className="p-1.5 text-corporate-400 hover:text-accent hover:bg-accent/10 rounded-lg transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteFaq(index)}
                            className="p-1.5 text-corporate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* FAQ Form */}
              <div className="bg-corporate-50/50 p-5 rounded-xl border border-corporate-100 space-y-4">
                <p className="text-sm font-bold text-corporate-700">
                  {editingFaqIndex !== null ? 'Editar FAQ' : 'Agregar nueva FAQ'}
                </p>
                
                <div>
                  <label className="block text-sm font-medium text-corporate-700 mb-1">Pregunta</label>
                  <input
                    type="text"
                    value={faqForm.question}
                    onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })}
                    className="w-full px-4 py-2 bg-white border border-corporate-200 rounded-lg focus:ring-2 focus:ring-accent outline-none text-corporate-900 text-sm"
                    placeholder="Ej: ¿Cuál es su horario?"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-corporate-700 mb-1">Respuesta</label>
                  <textarea
                    value={faqForm.answer}
                    onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })}
                    className="w-full px-4 py-2 bg-white border border-corporate-200 rounded-lg focus:ring-2 focus:ring-accent outline-none text-corporate-900 text-sm resize-none min-h-[80px]"
                    placeholder="Ej: Atendemos de lunes a sábado de 9:00 a 18:00."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-corporate-700 mb-1">Palabras Clave (para detectar la pregunta)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newFaqKeyword}
                      onChange={(e) => setNewFaqKeyword(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddFaqKeyword())}
                      className="flex-1 px-4 py-2 bg-white border border-corporate-200 rounded-lg focus:ring-2 focus:ring-accent outline-none text-corporate-900 text-sm"
                      placeholder="Ej: horario"
                    />
                    <button
                      type="button"
                      onClick={handleAddFaqKeyword}
                      className="px-3 py-2 bg-corporate-100 hover:bg-corporate-200 text-corporate-700 rounded-lg transition-colors text-sm font-medium"
                    >
                      + Agregar
                    </button>
                  </div>
                  {faqForm.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {faqForm.keywords.map((kw, ki) => (
                        <span key={ki} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-accent/10 text-accent">
                          {kw}
                          <button onClick={() => handleRemoveFaqKeyword(ki)} className="hover:text-red-500">×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={handleSaveFaq}
                    disabled={!faqForm.question.trim() || !faqForm.answer.trim()}
                    className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {editingFaqIndex !== null ? 'Actualizar FAQ' : 'Agregar FAQ'}
                  </button>
                  {editingFaqIndex !== null && (
                    <button
                      onClick={() => { setFaqForm({ question: '', answer: '', keywords: [] }); setEditingFaqIndex(null); setNewFaqKeyword(''); }}
                      className="px-4 py-2 text-corporate-600 hover:bg-corporate-100 rounded-lg transition-colors text-sm font-medium"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Greeting Keywords Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-corporate-100 overflow-hidden">
            <div className="p-5 border-b border-corporate-50 bg-corporate-50/50 flex items-center gap-3">
              <MessageCircle className="w-5 h-5 text-accent" />
              <h2 className="font-bold text-corporate-900">Saludo Personalizado</h2>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-sm text-corporate-500">
                Agrega una palabra o frase de saludo personalizada que el bot usará al responder a los clientes 
                (después del saludo horario automático). Ej: "¡Hola!", "Bienvenido".
              </p>

              {greetingKeywords.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {greetingKeywords.map((kw, index) => (
                    <span key={index} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-accent/10 text-accent">
                      {kw}
                      <button
                        onClick={() => handleRemoveKeyword(index)}
                        className="hover:text-red-500 transition-colors"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddKeyword())}
                  className="flex-1 px-4 py-2 bg-white border border-corporate-200 rounded-lg focus:ring-2 focus:ring-accent outline-none text-corporate-900 text-sm"
                  placeholder="Ej: ¡Hola!"
                />
                <button
                  onClick={handleAddKeyword}
                  disabled={!newKeyword.trim()}
                  className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Product Modification Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-corporate-100 overflow-hidden">
            <div className="p-5 border-b border-corporate-50 bg-corporate-50/50 flex items-center gap-3">
              <Settings className="w-5 h-5 text-accent" />
              <h2 className="font-bold text-corporate-900">Personalización de Productos</h2>
            </div>
            
            <div className="p-6 space-y-6">
              <p className="text-sm text-corporate-500">
                Permite que los clientes personalicen sus productos al momento de pedir (ej. "sin carne", "soy celíaco", "extra aguacate"). 
                Las notas se guardan en la orden para que tu equipo las tenga en cuenta al preparar el pedido.
              </p>

              <div className="bg-corporate-50/50 p-5 rounded-xl border border-corporate-100">
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-base font-bold text-corporate-900">Habilitar Modificaciones</label>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer"
                          checked={isProductsModifiable}
                          onChange={(e) => setIsProductsModifiable(e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-accent rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                      </label>
                    </div>
                    <p className="text-sm text-corporate-500 mb-4">
                      Al activar esta opción, después de que el cliente elija un producto, la IA le preguntará si desea agregar alguna nota o modificación antes de continuar con el pedido.
                    </p>

                    {isProductsModifiable && (
                      <div>
                        <label className="block text-sm font-bold text-corporate-700 mb-1">Pregunta de Personalización</label>
                        <input
                          type="text"
                          value={modifiableQuestion}
                          onChange={(e) => setModifiableQuestion(e.target.value)}
                          className="w-full px-4 py-3 bg-white border border-corporate-200 rounded-xl focus:ring-2 focus:ring-accent outline-none text-corporate-900 text-sm"
                          placeholder="Ej: ¿Tenés alguna restricción alimenticia o preferencia que debamos tomar en cuenta?"
                        />
                        <p className="text-xs text-corporate-400 mt-2">
                          Esta es la pregunta exacta que la IA le hará al cliente. Personalízala según tu negocio.
                        </p>
                      </div>
                    )}
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
