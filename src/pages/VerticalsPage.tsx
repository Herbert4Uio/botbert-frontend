import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { Building2, Plus, Pencil, Trash2, Loader2, X, Shield, Tag, MessageSquareText } from 'lucide-react';
import { useToastStore } from '../store/toastStore';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { TagsInput } from '../components/ui/TagsInput';

interface VerticalConfig {
  _id: string;
  name: string;
  industryType: string;
  tone: string;
  requiredAttributes: string[];
  legalDisclaimers: string[];
  prohibitedTerms: string[];
  conversationPlaybook: string;
  maxRecommendations: number;
  requirePriceDisplay: boolean;
  forbiddenPatterns: string[];
  isActive: boolean;
  customSystemPrompt: string;
  welcomeMessage: string;
  closingMessage: string;
  productDescriptionStyle: string;
  customInstructions: string;
}

const INDUSTRY_TYPES = [
  { value: 'productos', label: 'Productos / Retail' },
  { value: 'restaurante', label: 'Restaurante / Food Service' },
  { value: 'inmobiliaria', label: 'Inmobiliaria / Bienes Raíces' },
  { value: 'servicios', label: 'Servicios (Salón, Taller, etc.)' },
  { value: 'tecnologia', label: 'Tecnología' },
  { value: 'farmacia', label: 'Farmacia / Salud' },
  { value: 'moda', label: 'Moda / Fashion' },
];

const TONE_OPTIONS = [
  { value: 'formal', label: 'Formal' },
  { value: 'casual', label: 'Casual' },
  { value: 'technical', label: 'Técnico' },
];

export function VerticalsPage() {
  const { user } = useAuthStore();
  const [verticals, setVerticals] = useState<VerticalConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<VerticalConfig | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formIndustryType, setFormIndustryType] = useState('productos');
  const [formTone, setFormTone] = useState('casual');
  const [formMaxRecommendations, setFormMaxRecommendations] = useState(3);
  const [formRequirePriceDisplay, setFormRequirePriceDisplay] = useState(true);
  const [formProhibitedTerms, setFormProhibitedTerms] = useState<string[]>([]);
  const [formLegalDisclaimers, setFormLegalDisclaimers] = useState<string[]>([]);
  const [formRequiredAttributes, setFormRequiredAttributes] = useState<string[]>([]);
  const [formForbiddenPatterns, setFormForbiddenPatterns] = useState<string[]>([]);
  const [formCustomSystemPrompt, setFormCustomSystemPrompt] = useState('');
  const [formWelcomeMessage, setFormWelcomeMessage] = useState('');
  const [formClosingMessage, setFormClosingMessage] = useState('');
  const [formProductDescriptionStyle, setFormProductDescriptionStyle] = useState('');
  const [formCustomInstructions, setFormCustomInstructions] = useState('');
  const [formTab, setFormTab] = useState<'config' | 'prompt'>('config');

  const { addToast } = useToastStore();
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isDestructive?: boolean;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const confirmAction = (title: string, message: string, onConfirm: () => void, isDestructive = false) => {
    setModalConfig({ isOpen: true, title, message, onConfirm, isDestructive });
  };

  const canEdit = user?.role === 'OWNER';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/vertical-configs');
      setVerticals(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: formName,
        industryType: formIndustryType,
        tone: formTone,
        maxRecommendations: formMaxRecommendations,
        requirePriceDisplay: formRequirePriceDisplay,
        prohibitedTerms: formProhibitedTerms,
        legalDisclaimers: formLegalDisclaimers,
        requiredAttributes: formRequiredAttributes,
        forbiddenPatterns: formForbiddenPatterns,
        customSystemPrompt: formCustomSystemPrompt,
        welcomeMessage: formWelcomeMessage,
        closingMessage: formClosingMessage,
        productDescriptionStyle: formProductDescriptionStyle,
        customInstructions: formCustomInstructions,
      };

      if (editing) {
        await api.put(`/vertical-configs/${editing._id}`, payload);
        addToast('Vertical actualizado exitosamente', 'success');
      } else {
        await api.post('/vertical-configs', payload);
        addToast('Vertical creado exitosamente', 'success');
      }
      setModalOpen(false);
      fetchData();
    } catch (error) {
      console.error(error);
      addToast('Error guardando el vertical', 'error');
    }
  };

  const handleDelete = (id: string) => {
    confirmAction(
      'Eliminar Vertical',
      '¿Estás seguro de que deseas eliminar este vertical? Esta acción no se puede deshacer.',
      async () => {
        try {
          await api.delete(`/vertical-configs/${id}`);
          fetchData();
          addToast('Vertical eliminado', 'success');
          setModalConfig(prev => ({ ...prev, isOpen: false }));
        } catch (error) {
          console.error(error);
          addToast('Error al eliminar vertical', 'error');
          setModalConfig(prev => ({ ...prev, isOpen: false }));
        }
      },
      true
    );
  };

  const openModal = (v?: VerticalConfig) => {
    if (v) {
      setEditing(v);
      setFormName(v.name);
      setFormIndustryType(v.industryType || 'productos');
      setFormTone(v.tone || 'casual');
      setFormMaxRecommendations(v.maxRecommendations ?? 3);
      setFormRequirePriceDisplay(v.requirePriceDisplay !== false);
      setFormProhibitedTerms(v.prohibitedTerms || []);
      setFormLegalDisclaimers(v.legalDisclaimers || []);
      setFormRequiredAttributes(v.requiredAttributes || []);
      setFormForbiddenPatterns(v.forbiddenPatterns || []);
      setFormCustomSystemPrompt(v.customSystemPrompt || '');
      setFormWelcomeMessage(v.welcomeMessage || '');
      setFormClosingMessage(v.closingMessage || '');
      setFormProductDescriptionStyle(v.productDescriptionStyle || '');
      setFormCustomInstructions(v.customInstructions || '');
    } else {
      setEditing(null);
      setFormName('');
      setFormIndustryType('productos');
      setFormTone('casual');
      setFormMaxRecommendations(3);
      setFormRequirePriceDisplay(true);
      setFormProhibitedTerms([]);
      setFormLegalDisclaimers([]);
      setFormRequiredAttributes([]);
      setFormForbiddenPatterns([]);
      setFormCustomSystemPrompt('');
      setFormWelcomeMessage('');
      setFormClosingMessage('');
      setFormProductDescriptionStyle('');
      setFormCustomInstructions('');
    }
    setFormTab('config');
    setModalOpen(true);
  };

  const getToneLabel = (tone: string) => {
    return TONE_OPTIONS.find((t) => t.value === tone)?.label || tone;
  };

  const getIndustryLabel = (type: string) => {
    return INDUSTRY_TYPES.find((i) => i.value === type)?.label || type;
  };

  const getToneBadgeColor = (tone: string) => {
    switch (tone) {
      case 'formal': return 'bg-blue-100 text-blue-700';
      case 'casual': return 'bg-green-100 text-green-700';
      case 'technical': return 'bg-purple-100 text-purple-700';
      default: return 'bg-corporate-100 text-corporate-600';
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-corporate-100">
        <div>
          <h1 className="text-2xl font-bold text-corporate-900">Verticales</h1>
          <p className="text-corporate-400 text-sm mt-1">Configura el comportamiento de la IA por tipo de negocio</p>
        </div>
        {canEdit && (
          <button
            onClick={() => openModal()}
            className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Nuevo Vertical
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-corporate-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        ) : verticals.length === 0 ? (
          <div className="text-center p-12 text-corporate-400 flex flex-col items-center">
            <Building2 className="w-12 h-12 mb-4 opacity-50" />
            <p>No hay verticales configurados</p>
            <p className="text-sm mt-1">Crea uno para definir el comportamiento de la IA</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="bg-corporate-50 border-b border-corporate-100">
                <tr>
                  <th className="px-6 py-4 font-medium text-corporate-600">Nombre</th>
                  <th className="px-6 py-4 font-medium text-corporate-600">Industria</th>
                  <th className="px-6 py-4 font-medium text-corporate-600">Tono</th>
                  <th className="px-6 py-4 font-medium text-corporate-600">Máx. Rec.</th>
                  <th className="px-6 py-4 font-medium text-corporate-600">Precio</th>
                  <th className="px-6 py-4 font-medium text-corporate-600">Reglas</th>
                  <th className="px-6 py-4 font-medium text-corporate-600">Estado</th>
                  {canEdit && <th className="px-6 py-4 font-medium text-corporate-600 text-right">Acciones</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-corporate-100">
                {verticals.map((v) => (
                  <tr key={v._id} className="hover:bg-corporate-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-corporate-900">{v.name}</td>
                    <td className="px-6 py-4 text-corporate-600">{getIndustryLabel(v.industryType)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getToneBadgeColor(v.tone)}`}>
                        {getToneLabel(v.tone)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-corporate-600 text-center">{v.maxRecommendations ?? 3}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${v.requirePriceDisplay !== false ? 'bg-green-100 text-green-700' : 'bg-corporate-100 text-corporate-500'}`}>
                        {v.requirePriceDisplay !== false ? 'Visible' : 'Oculto'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1">
                        {v.prohibitedTerms?.length > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-600">
                            <Shield className="w-3 h-3" /> {v.prohibitedTerms.length}
                          </span>
                        )}
                        {v.legalDisclaimers?.length > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-600">
                            <Tag className="w-3 h-3" /> {v.legalDisclaimers.length}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${v.isActive !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {v.isActive !== false ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    {canEdit && (
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          onClick={() => openModal(v)}
                          className="p-2 text-corporate-400 hover:text-accent hover:bg-accent/10 rounded-lg transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(v._id)}
                          className="p-2 text-corporate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Create/Edit */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-corporate-100 bg-corporate-50 sticky top-0 z-10">
              <h3 className="font-semibold text-lg text-corporate-900">
                {editing ? 'Editar Vertical' : 'Nuevo Vertical'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-corporate-400 hover:text-corporate-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-corporate-100 sticky top-[73px] bg-white z-10">
              <button
                type="button"
                onClick={() => setFormTab('config')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  formTab === 'config'
                    ? 'text-accent border-b-2 border-accent'
                    : 'text-corporate-400 hover:text-corporate-600'
                }`}
              >
                Configuración
              </button>
              <button
                type="button"
                onClick={() => setFormTab('prompt')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                  formTab === 'prompt'
                    ? 'text-accent border-b-2 border-accent'
                    : 'text-corporate-400 hover:text-corporate-600'
                }`}
              >
                <MessageSquareText className="w-4 h-4" />
                Prompt Parametrizado
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-6">

              {/* ═══════════ TAB: CONFIGURACIÓN ═══════════ */}
              {formTab === 'config' && (
                <>
                  {/* Sección: Info Básica */}
                  <div>
                    <h4 className="font-bold text-sm text-corporate-900 mb-3">Información Básica</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-corporate-700 mb-1">Nombre del Vertical</label>
                        <input
                          type="text" required value={formName} onChange={(e) => setFormName(e.target.value)}
                          className="w-full px-4 py-2 border border-corporate-200 rounded-lg focus:ring-2 focus:ring-accent outline-none"
                          placeholder="Ej. Tienda de Zapatillas"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-corporate-700 mb-1">Tipo de Industria</label>
                        <select
                          required value={formIndustryType} onChange={(e) => setFormIndustryType(e.target.value)}
                          className="w-full px-4 py-2 border border-corporate-200 rounded-lg focus:ring-2 focus:ring-accent outline-none bg-white"
                        >
                          {INDUSTRY_TYPES.map((i) => (
                            <option key={i.value} value={i.value}>{i.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-corporate-700 mb-1">Tono de Voz</label>
                        <select
                          required value={formTone} onChange={(e) => setFormTone(e.target.value)}
                          className="w-full px-4 py-2 border border-corporate-200 rounded-lg focus:ring-2 focus:ring-accent outline-none bg-white"
                        >
                          {TONE_OPTIONS.map((t) => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Sección: Configuración */}
                  <div className="border-t border-corporate-100 pt-4">
                    <h4 className="font-bold text-sm text-corporate-900 mb-3">Configuración</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-corporate-700 mb-1">Máximo de Recomendaciones</label>
                        <input
                          type="number" min={1} max={10} required
                          value={formMaxRecommendations} onChange={(e) => setFormMaxRecommendations(parseInt(e.target.value) || 3)}
                          className="w-full px-4 py-2 border border-corporate-200 rounded-lg focus:ring-2 focus:ring-accent outline-none"
                        />
                        <p className="text-xs text-corporate-400 mt-1">Cuántos productos mostrar por respuesta</p>
                      </div>
                      <div className="flex items-center gap-3 pt-6">
                        <input
                          type="checkbox" id="requirePriceDisplay"
                          checked={formRequirePriceDisplay} onChange={(e) => setFormRequirePriceDisplay(e.target.checked)}
                          className="w-4 h-4 text-accent border-corporate-300 rounded focus:ring-accent"
                        />
                        <label htmlFor="requirePriceDisplay" className="text-sm text-corporate-700">Mostrar precios siempre</label>
                      </div>
                    </div>
                  </div>

                  {/* Sección: Términos Prohibidos */}
                  <div className="border-t border-corporate-100 pt-4">
                    <h4 className="font-bold text-sm text-corporate-900 mb-1">Términos Prohibidos</h4>
                    <p className="text-xs text-corporate-400 mb-3">Palabras o frases que la IA nunca debe mencionar</p>
                    <TagsInput
                      value={formProhibitedTerms}
                      onChange={setFormProhibitedTerms}
                      placeholder="Escribe un término y presiona Enter"
                    />
                  </div>

                  {/* Sección: Disclaimers Legales */}
                  <div className="border-t border-corporate-100 pt-4">
                    <h4 className="font-bold text-sm text-corporate-900 mb-1">Disclaimers Legales</h4>
                    <p className="text-xs text-corporate-400 mb-3">Textos que se incluirán en las respuestas cuando sea necesario</p>
                    <TagsInput
                      value={formLegalDisclaimers}
                      onChange={setFormLegalDisclaimers}
                      placeholder="Ej. Precios sujetos a cambio sin previo aviso"
                    />
                  </div>

                  {/* Sección: Atributos Requeridos */}
                  <div className="border-t border-corporate-100 pt-4">
                    <h4 className="font-bold text-sm text-corporate-900 mb-1">Atributos Requeridos</h4>
                    <p className="text-xs text-corporate-400 mb-3">Información que la IA debe preguntar obligatoriamente</p>
                    <TagsInput
                      value={formRequiredAttributes}
                      onChange={setFormRequiredAttributes}
                      placeholder="Ej. talla, color, ocasión"
                      suggestions={['talla', 'color', 'ocasión', 'presupuesto', 'marca', 'material', 'tamaño']}
                    />
                  </div>

                  {/* Sección: Patrones Prohibidos */}
                  <div className="border-t border-corporate-100 pt-4">
                    <h4 className="font-bold text-sm text-corporate-900 mb-1">Patrones Prohibidos (Regex)</h4>
                    <p className="text-xs text-corporate-400 mb-3">Expresiones regulares que la IA debe evitar</p>
                    <TagsInput
                      value={formForbiddenPatterns}
                      onChange={setFormForbiddenPatterns}
                      placeholder="Ej. /otra tienda/i"
                    />
                  </div>
                </>
              )}

              {/* ═══════════ TAB: PROMPT PARAMETRIZADO ═══════════ */}
              {formTab === 'prompt' && (
                <>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-700">
                    Estas instrucciones se inyectan directamente en el system prompt de la IA.
                    Deja en blanco para usar el comportamiento por defecto.
                    Puedes usar placeholders como <code className="font-mono text-xs bg-amber-100 px-1 rounded">{'{{tenant.name}}'}</code> para referenciar datos del tenant.
                  </div>

                  {/* Mensaje de Bienvenida */}
                  <div>
                    <label className="block text-sm font-semibold text-corporate-900 mb-1">Mensaje de Bienvenida</label>
                    <p className="text-xs text-corporate-400 mb-2">Primer mensaje que la IA envía cuando el cliente inicia contacto</p>
                    <textarea
                      rows={3}
                      value={formWelcomeMessage} onChange={(e) => setFormWelcomeMessage(e.target.value)}
                      className="w-full px-4 py-2 border border-corporate-200 rounded-lg focus:ring-2 focus:ring-accent outline-none resize-y text-sm"
                      placeholder="Ej. ¡Hola! 👋 Bienvenido a {{tenant.name}}. Soy tu asistente virtual..."
                    />
                  </div>

                  {/* Instrucciones Personalizadas */}
                  <div className="border-t border-corporate-100 pt-4">
                    <label className="block text-sm font-semibold text-corporate-900 mb-1">Instrucciones Personalizadas</label>
                    <p className="text-xs text-corporate-400 mb-2">Reglas adicionales específicas para este vertical que se agregan al prompt</p>
                    <textarea
                      rows={4}
                      value={formCustomInstructions} onChange={(e) => setFormCustomInstructions(e.target.value)}
                      className="w-full px-4 py-2 border border-corporate-200 rounded-lg focus:ring-2 focus:ring-accent outline-none resize-y text-sm"
                      placeholder="Ej. Siempre recomienda productos de la marca propia antes que los de terceros..."
                    />
                  </div>

                  {/* Estilo de Descripción de Productos */}
                  <div className="border-t border-corporate-100 pt-4">
                    <label className="block text-sm font-semibold text-corporate-900 mb-1">Estilo de Descripción de Productos</label>
                    <p className="text-xs text-corporate-400 mb-2">Cómo la IA debe presentar la información de cada producto al cliente</p>
                    <textarea
                      rows={3}
                      value={formProductDescriptionStyle} onChange={(e) => setFormProductDescriptionStyle(e.target.value)}
                      className="w-full px-4 py-2 border border-corporate-200 rounded-lg focus:ring-2 focus:ring-accent outline-none resize-y text-sm"
                      placeholder="Ej. Describe cada producto con máximo 2 líneas. Incluye nombre, precio y una característica diferenciadora..."
                    />
                  </div>

                  {/* Mensaje de Cierre */}
                  <div className="border-t border-corporate-100 pt-4">
                    <label className="block text-sm font-semibold text-corporate-900 mb-1">Mensaje de Cierre</label>
                    <p className="text-xs text-corporate-400 mb-2">Texto que la IA envía al finalizar la conversación o cuando no puede ayudar más</p>
                    <textarea
                      rows={3}
                      value={formClosingMessage} onChange={(e) => setFormClosingMessage(e.target.value)}
                      className="w-full px-4 py-2 border border-corporate-200 rounded-lg focus:ring-2 focus:ring-accent outline-none resize-y text-sm"
                      placeholder="Ej. ¡Ha sido un placer ayudarte! Si necesitas algo más, no dudes en escribirnos."
                    />
                  </div>

                  {/* System Prompt Override */}
                  <div className="border-t border-corporate-100 pt-4">
                    <label className="block text-sm font-semibold text-corporate-900 mb-1">System Prompt Override (Avanzado)</label>
                    <p className="text-xs text-corporate-400 mb-2">Reemplaza completamente las instrucciones principales de la IA. Solo para usuarios avanzados.</p>
                    <textarea
                      rows={6}
                      value={formCustomSystemPrompt} onChange={(e) => setFormCustomSystemPrompt(e.target.value)}
                      className="w-full px-4 py-2 border border-corporate-200 rounded-lg focus:ring-2 focus:ring-accent outline-none resize-y text-sm font-mono"
                      placeholder="Deja vacío para usar el prompt por defecto del sistema..."
                    />
                  </div>
                </>
              )}

              {/* Footer */}
              <div className="flex justify-end gap-3 pt-4 border-t border-corporate-100">
                <button
                  type="button" onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-corporate-600 hover:bg-corporate-50 rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg font-medium transition-colors"
                >
                  {editing ? 'Guardar Cambios' : 'Crear Vertical'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        message={modalConfig.message}
        onConfirm={modalConfig.onConfirm}
        onCancel={() => setModalConfig((prev) => ({ ...prev, isOpen: false }))}
        isDestructive={modalConfig.isDestructive}
      />
    </div>
  );
}
