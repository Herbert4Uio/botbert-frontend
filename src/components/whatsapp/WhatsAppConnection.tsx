import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { io } from 'socket.io-client';
import { QRCodeSVG } from 'qrcode.react';
import { Smartphone, QrCode, LogOut, Loader2 } from 'lucide-react';
import { useToastStore } from '../../store/toastStore';
import { ConfirmModal } from '../ui/ConfirmModal';

interface Props {
  tenantId: string;
}

export function WhatsAppConnection({ tenantId }: Props) {
  const [status, setStatus] = useState<'DISCONNECTED' | 'QR_READY' | 'CONNECTED'>('DISCONNECTED');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [connectionMethod, setConnectionMethod] = useState<'qr' | 'pairing'>('qr');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [pairingCode, setPairingCode] = useState<string | null>(null);
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

    socketInstance.on('pairingCode', (data) => {
      setPairingCode(data.code);
      setStatus('QR_READY');
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
    setPairingCode(null);
    try {
      if (connectionMethod === 'pairing' && phoneNumber.trim()) {
        const cleaned = phoneNumber.trim().replace(/[^0-9]/g, '');
        const { data } = await api.post('/whatsapp/connect/pairing', { phoneNumber: cleaned });
        if (data.error) {
          addToast(data.error, 'error');
          setLoading(false);
          return;
        }
        addToast('Solicitando código de vinculación...', 'info');
      } else {
        await api.post('/whatsapp/connect');
      }

      setTimeout(() => {
        setLoading((prev) => {
          if (prev) addToast('La conexión está tomando más de lo esperado. Si no recibes el código en 30s más, intenta de nuevo.', 'info');
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
          setPairingCode(null);
          setModalConfig((prev) => ({ ...prev, isOpen: false }));
          addToast('Sesión de WhatsApp cerrada', 'success');
        } catch {
          addToast('Error al cerrar sesión', 'error');
          setModalConfig((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const reset = () => {
    setStatus('DISCONNECTED');
    setQrCode(null);
    setPairingCode(null);
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
              <div className="flex w-full bg-corporate-50 rounded-xl p-1">
                <button
                  onClick={() => { setConnectionMethod('qr'); setQrCode(null); setPairingCode(null); }}
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
                  onClick={() => { setConnectionMethod('pairing'); setQrCode(null); setPairingCode(null); }}
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
                    Número de teléfono con código de país (sin +)
                  </label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="Ej: 591714254068"
                    className="w-full px-4 py-2.5 bg-white border border-corporate-200 rounded-xl focus:ring-2 focus:ring-accent outline-none text-corporate-900 text-sm"
                  />
                  <p className="text-xs text-corporate-400 text-left mt-1">Ejemplo: 591714254068 (Bolivia), 5215512345678 (México)</p>
                </div>
              )}

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

          {pairingCode && (
            <>
              <div className="w-full space-y-4">
                {status === 'CONNECTED' && (
                  <div className="flex items-center justify-center gap-2 text-green-600 text-sm font-medium mb-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    Dispositivo vinculado correctamente
                  </div>
                )}
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
                    Abre WhatsApp en tu teléfono, ve a <strong>Dispositivos Vinculados</strong> {'>'} <strong>Vincular con número de teléfono</strong> e ingresa este código.
                  </p>
                </div>
              </div>
              <button onClick={reset} className="w-full bg-corporate-100 hover:bg-corporate-200 text-corporate-700 px-6 py-2.5 rounded-xl font-medium transition-colors text-sm">
                Cancelar
              </button>
            </>
          )}

          {!pairingCode && status === 'QR_READY' && (
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

          {!pairingCode && status === 'CONNECTED' && (
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
        <div className="p-6">
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