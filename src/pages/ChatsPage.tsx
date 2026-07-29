import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { MessageSquare, Bot, User, PauseCircle, PlayCircle, Loader2, Trash2, Send, RefreshCw, PlusCircle } from 'lucide-react';
import { cn } from '../utils/cn';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface Conversation {
  _id: string;
  customerId: { _id: string; profileName: string; whatsappId: string; phoneNumber?: string; };
  branchId: { _id: string; name: string; };
  messages: Message[];
  status: string;
  isAiPaused: boolean;
  updatedAt: string;
}

export function ChatsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChat, setSelectedChat] = useState<Conversation | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isForcingAi, setIsForcingAi] = useState(false);
  const [isInjectMode, setIsInjectMode] = useState(false);

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 10000); // Polling every 10s
    return () => clearInterval(interval);
  }, []);

  const fetchConversations = async () => {
    try {
      const { data } = await api.get('/sales/conversations');
      setConversations(data);
      if (selectedChat) {
        const updatedSelected = data.find((c: Conversation) => c._id === selectedChat._id);
        if (updatedSelected) setSelectedChat(updatedSelected);
      }
      setLoading(false);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  const togglePause = async () => {
    if (!selectedChat) return;
    try {
      const newStatus = !selectedChat.isAiPaused;
      await api.patch(`/sales/conversations/${selectedChat._id}/pause`, { isAiPaused: newStatus });
      setSelectedChat({ ...selectedChat, isAiPaused: newStatus });
      fetchConversations();
    } catch (error) {
      console.error(error);
      alert('Error cambiando estado de IA');
    }
  };

  const clearHistory = async () => {
    if (!window.confirm('¿Estás seguro de borrar toda la memoria de la IA? Se perderá el contexto de todos los chats actuales.')) return;
    try {
      await api.delete('/sales/history');
      setConversations([]);
      setSelectedChat(null);
      alert('Memoria borrada exitosamente.');
    } catch (error) {
      console.error(error);
      alert('Error al borrar la memoria');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChat || !messageInput.trim()) return;

    const currentMsg = messageInput.trim();
    setMessageInput('');
    setIsSending(true);

    try {
      const endpoint = isInjectMode 
        ? `/sales/conversations/${selectedChat._id}/inject` 
        : `/sales/conversations/${selectedChat._id}/message`;
        
      const { data } = await api.post(endpoint, {
        message: currentMsg
      });
      setSelectedChat(data);
      fetchConversations();
      
      if (isInjectMode) {
        setIsInjectMode(false); // Volver al modo normal después de inyectar
      }
    } catch (error) {
      console.error(error);
      alert('Error enviando mensaje');
      setMessageInput(currentMsg); // Restaurar si falla
    } finally {
      setIsSending(false);
    }
  };

  const handleForceAiReply = async () => {
    if (!selectedChat) return;
    setIsForcingAi(true);
    try {
      const { data } = await api.post(`/sales/conversations/${selectedChat._id}/force-reply`);
      setSelectedChat(data);
      fetchConversations();
    } catch (error) {
      console.error(error);
      alert('Error forzando respuesta de IA');
    } finally {
      setIsForcingAi(false);
    }
  };

  return (
    <div className="h-[calc(100vh-80px)] flex gap-4 max-w-7xl mx-auto pb-4">
      
      {/* Sidebar: Lista de Chats */}
      <div className="w-1/3 bg-white rounded-xl shadow-sm border border-corporate-100 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-corporate-100 bg-corporate-50 flex justify-between items-center">
          <h2 className="font-bold text-corporate-900 flex items-center gap-2">
            <MessageSquare className="w-5 h-5" /> Bandeja de Entrada
          </h2>
          <button 
            onClick={clearHistory}
            className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors tooltip-wrapper"
            title="Borrar memoria de toda la IA"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
          {loading && conversations.length === 0 ? (
            <div className="flex justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin text-accent" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center p-8 text-corporate-400 text-sm">
              No hay conversaciones activas
            </div>
          ) : (
            conversations.map(chat => (
              <div 
                key={chat._id}
                onClick={() => setSelectedChat(chat)}
                className={cn(
                  "p-3 rounded-lg cursor-pointer transition-colors border",
                  selectedChat?._id === chat._id 
                    ? "bg-accent/5 border-accent text-accent" 
                    : "border-transparent hover:bg-corporate-50 bg-white"
                )}
              >
                <div className="flex justify-between items-start mb-1">
                  <h4 className="font-bold text-sm text-corporate-900 truncate pr-2">
                    {chat.customerId?.profileName || 'Cliente'}
                  </h4>
                  <span className="text-[10px] font-medium text-corporate-400 whitespace-nowrap">
                    {new Date(chat.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-xs text-corporate-500 truncate mb-2">
                  {chat.messages[chat.messages.length - 1]?.content || 'Sin mensajes'}
                </p>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-medium bg-corporate-100 text-corporate-600 px-2 py-0.5 rounded-md">
                    {chat.branchId?.name || 'Sucursal'}
                  </span>
                  {chat.isAiPaused ? (
                    <span className="text-[10px] font-bold text-red-500 flex items-center gap-1">
                      <PauseCircle className="w-3 h-3" /> IA Pausada
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-green-500 flex items-center gap-1">
                      <Bot className="w-3 h-3" /> IA Activa
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Area: Chat Activo */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-corporate-100 flex flex-col overflow-hidden relative">
        {selectedChat ? (
          <>
            {/* Cabecera del Chat */}
            <div className="p-4 border-b border-corporate-100 flex justify-between items-center bg-white z-10 shadow-sm">
              <div>
                <h3 className="font-bold text-corporate-900 text-lg">
                  {selectedChat.customerId?.profileName || 'Cliente'}
                </h3>
                <p className="text-xs text-corporate-500">
                  +{selectedChat.customerId?.phoneNumber || selectedChat.customerId?.whatsappId?.split('@')[0]?.split(':')[0]}
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleForceAiReply}
                  disabled={isForcingAi}
                  className="px-4 py-2 rounded-lg font-bold text-sm bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors flex items-center gap-2 disabled:opacity-50"
                  title="Obligar a la IA a leer el historial y responder ahora"
                >
                  {isForcingAi ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  Forzar IA
                </button>
                <button 
                  onClick={togglePause}
                  className={cn(
                    "px-4 py-2 rounded-lg font-bold text-sm transition-colors flex items-center gap-2",
                    selectedChat.isAiPaused 
                      ? "bg-green-100 text-green-700 hover:bg-green-200" 
                      : "bg-red-100 text-red-700 hover:bg-red-200"
                  )}
                >
                  {selectedChat.isAiPaused ? (
                    <><PlayCircle className="w-4 h-4" /> Reactivar IA</>
                  ) : (
                    <><PauseCircle className="w-4 h-4" /> Pausar IA</>
                  )}
                </button>
              </div>
            </div>

            {/* Aviso de Pausa */}
            {selectedChat.isAiPaused && (
              <div className="bg-red-50 p-2 text-center border-b border-red-100 text-red-700 text-xs font-medium">
                La Inteligencia Artificial está pausada. Puedes responder desde tu aplicación de WhatsApp.
              </div>
            )}

            {/* Mensajes */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-corporate-50/50" style={{ backgroundImage: 'radial-gradient(#e2e8f0 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
              {selectedChat.messages.map((msg, idx) => {
                const isBot = msg.role === 'assistant';
                return (
                  <div key={idx} className={`flex ${isBot ? 'justify-start' : 'justify-end'}`}>
                    <div className={`flex max-w-[75%] gap-2 ${isBot ? 'flex-row' : 'flex-row-reverse'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${isBot ? 'bg-accent/10 text-accent' : 'bg-corporate-200 text-corporate-600'}`}>
                        {isBot ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                      </div>
                      <div className={`p-3 rounded-2xl ${isBot ? 'bg-white border border-corporate-100 text-corporate-800 rounded-tl-sm' : 'bg-corporate-900 text-white rounded-tr-sm shadow-sm'}`}>
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        <span className={`text-[10px] block mt-1 text-right ${isBot ? 'text-corporate-400' : 'text-corporate-300'}`}>
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Input Manual */}
            <div className="p-4 bg-white border-t border-corporate-100 flex flex-col gap-2">
              <div className="flex items-center gap-4 px-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-corporate-600 hover:text-corporate-900">
                  <input 
                    type="checkbox" 
                    checked={!isInjectMode} 
                    onChange={() => setIsInjectMode(false)}
                    className="accent-accent"
                  />
                  Responder (Envía WS)
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-purple-600 hover:text-purple-800" title="Añade texto como si lo hubiera dicho el cliente, SIN enviar WhatsApp">
                  <input 
                    type="checkbox" 
                    checked={isInjectMode} 
                    onChange={() => setIsInjectMode(true)}
                    className="accent-purple-600"
                  />
                  Inyectar contexto del Cliente
                </label>
              </div>
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder={isInjectMode ? "Escribe lo que el cliente dijo..." : "Escribe un mensaje manual al cliente..."}
                  className={cn(
                    "flex-1 border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 transition-all",
                    isInjectMode 
                      ? "bg-purple-50 border-purple-200 focus:ring-purple-500 focus:bg-white placeholder:text-purple-300 text-purple-900"
                      : "bg-corporate-50 border-corporate-200 focus:ring-accent focus:bg-white"
                  )}
                  disabled={isSending}
                />
                <button
                  type="submit"
                  disabled={isSending || !messageInput.trim()}
                  className={cn(
                    "text-white px-4 py-2 rounded-lg font-bold flex items-center justify-center disabled:opacity-50 transition-colors shadow-sm",
                    isInjectMode ? "bg-purple-600 hover:bg-purple-700" : "bg-accent hover:bg-accent/90"
                  )}
                >
                  {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : (isInjectMode ? <PlusCircle className="w-4 h-4" /> : <Send className="w-4 h-4" />)}
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-corporate-400">
            <MessageSquare className="w-16 h-16 mb-4 opacity-20" />
            <p>Selecciona un chat para ver los mensajes</p>
          </div>
        )}
      </div>

    </div>
  );
}
