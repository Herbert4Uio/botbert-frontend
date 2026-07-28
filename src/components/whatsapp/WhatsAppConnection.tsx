import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { io } from 'socket.io-client';
import { QRCodeSVG } from 'qrcode.react';
import { Smartphone, QrCode, LogOut, Loader2, Trash2 } from 'lucide-react';
import { useToastStore } from '../../store/toastStore';
import { ConfirmModal } from '../ui/ConfirmModal';

interface Props {
  tenantId: string;
}

export function WhatsAppConnection({ tenantId }: Props) {
  const [status, setStatus] = useState<'DISCONNECTED' | 'QR_READY' | 'CONNECTED'>('DISCONNECTED');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isDestructive?: boolean;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const { addToast } = useToastStore();

  useEffect(() => {
    fetchStatus();

    const apiUrl = import.meta.env.VITE_API_URL
      ? `${import.meta.env.VITE_API_URL}/whatsapp`
      : 'http://localhost:3000/whatsapp';

    const socketInstance = io(apiUrl, { query: { tenantId } });

    socketInstance.on('status', (data) => {
      if (data.status === 'DISCONNECTED') {
        setQrCode(null);
        setLoading(false);
      } else if (data.status === 'CONNECTED') {
        setLoading(false);
        setQrCode(null);
      }
      setStatus(data.status);
    });

    socketInstance.on('qr', (data) => {
      setStatus('QR_READY');
      setQrCode(data.qr);
      setLoading(false);
    });



    return () => { socketInstance.disconnect(); };
  }, [tenantId]);

  const fetchStatus = async () => {
    try {
      const { data } = await api.get('/whatsapp/status');
      setStatus(data.status);
      if (data.qr) setQrCode(data.qr);
    } catch { }
  };

  const handleConnect = async () => {
    setLoading(true);
    setQrCode(null);
    try {
      await api.post('/whatsapp/connect');
      setTimeout(() => {
        setLoading((prev) => {
          if (prev) addToast('La conexión está tomando más de lo esperado. Verifica que el servidor de WhatsApp esté respondiendo.', 'info');
          return prev;
        });
      }, 30000);
    } catch (error: any) {
      addToast(error.response?.data?.error || 'Error al iniciar conexión', 'error');
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    setModalConfig({
      isOpen: true,
      title: 'Desconectar WhatsApp',
      message: '¿Estás seguro de cerrar la sesión de WhatsApp? La IA dejará de responder mensajes y perderás la conexión.',
      isDestructive: true,
      onConfirm: async () => {
        try {
          await api.post('/whatsapp/disconnect');
          setStatus('DISCONNECTED');
          setQrCode(null);
          setModalConfig((prev) => ({ ...prev, isOpen: false }));
          addToast('Sesión de WhatsApp cerrada', 'success');
        } catch {
          addToast('Error al cerrar sesión', 'error');
          setModalConfig((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleResetMemory = () => {
    setModalConfig({
      isOpen: true,
      title: 'Limpiar Memoria de la IA',
      message: '¿Estás seguro de reiniciar la memoria de la IA? Los clientes actuales empezarán desde cero la próxima vez que escriban, pero el historial en la base de datos NO se borrará.',
      isDestructive: true,
      onConfirm: async () => {
        try {
          const res = await api.post('/sales/reset-memory');
          setModalConfig((prev) => ({ ...prev, isOpen: false }));
          addToast(`Memoria limpiada. ${res.data.count} chats reiniciados.`, 'success');
        } catch (error: any) {
          addToast('Error al limpiar la memoria', 'error');
          setModalConfig((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const reset = () => {
    setStatus('DISCONNECTED');
    setQrCode(null);
    setLoading(false);
  };

  return (
    <>
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
              <button onClick={reset} className="w-full bg-corporate-100 hover:bg-corporate-200 text-corporate-700 px-6 py-2.5 rounded-xl font-medium transition-colors text-sm">
                Cancelar
              </button>
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

      <div className="bg-white rounded-2xl shadow-sm border border-corporate-100 overflow-hidden">
        <div className="p-5 border-b border-corporate-50 bg-corporate-50/50 flex items-center gap-3">
          <span className="w-5 h-5 flex items-center justify-center">
            <span className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
          </span>
          <h2 className="font-bold text-corporate-900">Zona de Riesgo</h2>
        </div>
        <div className="p-6 space-y-4">
          <button
            onClick={handleResetMemory}
            className="w-full bg-orange-50 text-orange-600 hover:bg-orange-100 border border-orange-200 px-4 py-3 rounded-xl font-medium transition-colors flex items-center justify-between text-sm"
          >
            <span className="flex items-center gap-2">
              <Trash2 className="w-4 h-4" />
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

      <ConfirmModal
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        message={modalConfig.message}
        isDestructive={modalConfig.isDestructive}
        onConfirm={modalConfig.onConfirm}
        onCancel={() => setModalConfig((prev) => ({ ...prev, isOpen: false }))}
      />
    </>
  );
}