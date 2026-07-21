import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Loader2, Zap, CheckCircle2, X, ArrowLeft, Lightbulb, FileText, Sparkles } from 'lucide-react';
import { useToastStore } from '../store/toastStore';

const EXAMPLES = [
  {
    title: 'Pizzería artesanal',
    text: "Somos una pizzería artesanal llamada 'La Italiana'. Quiero que el bot sea cálido y casual. Siempre preguntar el tamaño de la pizza antes de ofrecer sabores. Ofrecer complementos como papas y bebidas. No vender después de las 10pm.",
  },
  {
    title: 'Pastelería de eventos',
    text: "Somos 'Dulce Tentación', pastelería para cumpleaños y bodas. El bot debe preguntar primero: tipo de evento, número de invitados, fecha del evento. No vender sin saber la fecha exacta. Tenemos tortas, cupcakes y mesas de postres.",
  },
];

export function PromptGeneratorPage() {
  const navigate = useNavigate();
  const { addToast } = useToastStore();

  const [businessDescription, setBusinessDescription] = useState('');
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  const handleGenerate = async () => {
    if (!businessDescription.trim() || businessDescription.trim().length < 10) {
      addToast('Describe tu negocio con al menos 10 caracteres', 'error');
      return;
    }
    setIsGenerating(true);
    try {
      const { data } = await api.post('/sales/generate-prompt', {
        businessDescription: businessDescription.trim(),
      });
      if (data.error) {
        addToast(data.error, 'error');
        return;
      }
      setGeneratedPrompt(data.prompt);
      addToast('Prompt generado exitosamente', 'success');
    } catch (error: any) {
      addToast(error.response?.data?.error || 'Error al generar el prompt', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApply = () => {
    if (!generatedPrompt) return;
    setIsApplying(true);
    navigate('/settings', { state: { generatedPrompt } });
  };

  const handleDiscard = () => {
    setGeneratedPrompt('');
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-corporate-100">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-accent/10 to-accent/5 rounded-xl">
            <Sparkles className="w-8 h-8 text-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-corporate-900">Generador de Prompt IA</h1>
            <p className="text-corporate-500 text-sm mt-1">
              Describe tu negocio y la IA generará un prompt optimizado listo para usar en tu chatbot.
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate('/settings')}
          className="flex items-center gap-2 px-4 py-2.5 text-corporate-600 hover:text-corporate-900 bg-corporate-50 hover:bg-corporate-100 rounded-xl transition-colors text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </button>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ─── COLUMN 1: INPUT ─── */}
        <div className="bg-white rounded-2xl shadow-sm border border-corporate-100 overflow-hidden flex flex-col">
          <div className="p-5 border-b border-corporate-100 bg-gradient-to-r from-corporate-50 to-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-accent" />
              <h2 className="font-bold text-corporate-900">Describe tu negocio</h2>
            </div>
            <span className="text-xs text-corporate-400 font-medium">{businessDescription.length} caracteres</span>
          </div>

          <div className="p-5 flex-1 flex flex-col gap-4">
            <textarea
              value={businessDescription}
              onChange={(e) => setBusinessDescription(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-corporate-200 rounded-xl focus:ring-2 focus:ring-accent outline-none text-corporate-900 text-sm resize-none min-h-[350px] leading-relaxed"
              placeholder="Ej: Somos una pizzería artesanal llamada 'La Italiana'. Quiero que el bot sea cálido y casual. Siempre preguntar el tamaño de la pizza antes de ofrecer sabores. Ofrecer complementos como papas y bebidas. No vender después de las 10pm..."
            />

            {/* Quick examples */}
            <div>
              <p className="text-xs font-semibold text-corporate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5" />
                Ejemplos rápidos
              </p>
              <div className="flex flex-wrap gap-2">
                {EXAMPLES.map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => setBusinessDescription(ex.text)}
                    className="text-xs px-3 py-1.5 bg-corporate-50 hover:bg-corporate-100 text-corporate-600 border border-corporate-200 rounded-lg transition-colors"
                  >
                    {ex.title}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={isGenerating || businessDescription.trim().length < 10}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-accent hover:bg-accent-hover text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generando prompt...
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  Generar Prompt
                </>
              )}
            </button>
          </div>
        </div>

        {/* ─── COLUMN 2: OUTPUT ─── */}
        <div className={`bg-white rounded-2xl shadow-sm border overflow-hidden flex flex-col transition-all ${
          generatedPrompt ? 'border-emerald-200 ring-1 ring-emerald-100/50' : 'border-corporate-100'
        }`}>
          <div className={`p-5 border-b flex items-center justify-between ${
            generatedPrompt
              ? 'bg-gradient-to-r from-emerald-50 to-white border-emerald-100'
              : 'bg-gradient-to-r from-corporate-50 to-white border-corporate-100'
          }`}>
            <div className="flex items-center gap-2">
              <Sparkles className={`w-5 h-5 ${generatedPrompt ? 'text-emerald-500' : 'text-corporate-300'}`} />
              <h2 className={`font-bold ${generatedPrompt ? 'text-emerald-800' : 'text-corporate-400'}`}>
                {generatedPrompt ? 'Prompt generado' : 'Esperando descripción...'}
              </h2>
            </div>
            {generatedPrompt && (
              <span className="text-xs text-emerald-500 font-medium">{generatedPrompt.length} caracteres</span>
            )}
          </div>

          <div className="p-5 flex-1 flex flex-col gap-4">
            {generatedPrompt ? (
              <>
                <textarea
                  value={generatedPrompt}
                  readOnly
                  className="w-full px-4 py-3 bg-corporate-50/50 border border-corporate-200 rounded-xl text-corporate-800 text-sm resize-none min-h-[350px] leading-relaxed cursor-default"
                />
                <div className="flex gap-3">
                  <button
                    onClick={handleApply}
                    disabled={isApplying}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  >
                    {isApplying ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5" />
                    )}
                    {isApplying ? 'Aplicando...' : 'Aplicar a configuración'}
                  </button>
                  <button
                    onClick={handleDiscard}
                    className="flex items-center justify-center gap-2 px-5 py-3 bg-corporate-100 hover:bg-corporate-200 text-corporate-600 rounded-xl text-sm font-medium transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-12 px-6">
                <div className="w-20 h-20 bg-corporate-50 rounded-full flex items-center justify-center mb-5">
                  <Sparkles className="w-10 h-10 text-corporate-300" />
                </div>
                <h3 className="text-lg font-bold text-corporate-400 mb-2">Aún no hay nada aquí</h3>
                <p className="text-sm text-corporate-400 max-w-md leading-relaxed">
                  Escribe cómo funciona tu negocio en la columna izquierda y presiona{' '}
                  <span className="font-semibold text-accent">Generar Prompt</span>.
                  La IA analizará tu descripción y creará un prompt optimizado para tu chatbot.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
