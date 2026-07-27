import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { TagsInput } from '../components/ui/TagsInput';
import {
  GitBranch, Plus, Pencil, Trash2, Loader2, X, Copy,
  ChevronRight, ChevronDown, ToggleLeft, ToggleRight,
  ArrowRight, Settings2,
  Target, Wrench, Clock, Shield,
  ChevronsUp, ChevronsDown, LayoutTemplate, MessageSquare,
} from 'lucide-react';

// ─── Types ───

interface PhaseTransition {
  trigger: string;
  targetPhase: string;
  condition: string;
  delayMs: number;
}

interface PhaseGoal {
  type: string;
  description: string;
  requiredEntities: string[];
  maxTurns: number;
  fallbackAction: string;
}

interface PhaseAutoResponse {
  trigger: string;
  message: string;
  condition: string;
}

interface PlaybookPhase {
  id: string;
  name: string;
  phaseType: string;
  order: number;
  enabled: boolean;
  instructions: string;
  systemPromptOverride: string;
  goal: PhaseGoal | null;
  transitions: PhaseTransition[];
  autoResponses: PhaseAutoResponse[];
  skipAI: boolean;
  requiredTools: string[];
  blockedTools: string[];
  maxTurns: number;
  timeoutMinutes: number;
  handoffOnTimeout: boolean;
  customData: Record<string, any>;
}

interface Playbook {
  _id: string;
  name: string;
  description: string;
  verticalType: string;
  isActive: boolean;
  isDefault: boolean;
  phases: PlaybookPhase[];
  globalInstructions: string;
  maxConversationTurns: number;
  timeoutMinutes: number;
  handoffMessage: string;
  fallbackPhase: string;
  createdAt: string;
}

// ─── Constants ───

const PHASE_TYPES = [
  { value: 'GREETING', label: 'Saludo', color: 'bg-green-100 text-green-700' },
  { value: 'CITY_REQUIRED', label: 'Ciudad Requerida', color: 'bg-blue-100 text-blue-700' },
  { value: 'DISCOVERY', label: 'Descubrimiento', color: 'bg-purple-100 text-purple-700' },
  { value: 'SEARCH_READY', label: 'Listo para Buscar', color: 'bg-amber-100 text-amber-700' },
  { value: 'RECOMMENDATION', label: 'Recomendación', color: 'bg-cyan-100 text-cyan-700' },
  { value: 'LOGISTICS', label: 'Logística', color: 'bg-orange-100 text-orange-700' },
  { value: 'ORDER_READY', label: 'Listo para Orden', color: 'bg-rose-100 text-rose-700' },
  { value: 'COMPLETED', label: 'Completado', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'CUSTOM', label: 'Custom', color: 'bg-corporate-100 text-corporate-600' },
];

const TRIGGER_TYPES = [
  { value: 'MESSAGE_RECEIVED', label: 'Mensaje Recibido' },
  { value: 'TOOL_CALLED', label: 'Herramienta Llamada' },
  { value: 'CITY_DETECTED', label: 'Ciudad Detectada' },
  { value: 'PRODUCT_CHOSEN', label: 'Producto Elegido' },
  { value: 'ORDER_GENERATED', label: 'Orden Generada' },
  { value: 'TIMEOUT', label: 'Timeout' },
  { value: 'USER_REQUEST', label: 'Solicitud del Usuario' },
  { value: 'AUTO_ADVANCE', label: 'Avance Automático' },
  { value: 'PHASE_MAX_TURNS', label: 'Máx. Turnos de Fase' },
];

const GOAL_TYPES = [
  { value: 'COLLECT_INFO', label: 'Recopilar Info' },
  { value: 'RECOMMEND', label: 'Recomendar' },
  { value: 'CLOSE_SALE', label: 'Cerrar Venta' },
  { value: 'HANDOFF', label: 'Handoff / Transferir' },
  { value: 'INFORM', label: 'Informar' },
  { value: 'CUSTOM', label: 'Custom' },
];

const VERTICAL_TYPES = [
  { value: 'retail', label: 'Retail' },
  { value: 'restaurante', label: 'Restaurante' },
  { value: 'inmobiliaria', label: 'Inmobiliaria' },
  { value: 'servicios', label: 'Servicios' },
  { value: 'general', label: 'General' },
];

const ALL_TOOLS = ['buscar_productos', 'generar_orden', 'actualizar_resumen_venta'];

const EMPTY_GOAL: PhaseGoal = {
  type: 'COLLECT_INFO',
  description: '',
  requiredEntities: [],
  maxTurns: 5,
  fallbackAction: '',
};

const newPhase = (): PlaybookPhase => ({
  id: `phase_${Date.now()}`,
  name: 'Nueva Fase',
  phaseType: 'CUSTOM',
  order: 0,
  enabled: true,
  instructions: '',
  systemPromptOverride: '',
  goal: null,
  transitions: [],
  autoResponses: [],
  skipAI: false,
  requiredTools: [],
  blockedTools: [],
  maxTurns: 10,
  timeoutMinutes: 60,
  handoffOnTimeout: false,
  customData: {},
});

// ─── Helpers ───

const getPhaseTypeConfig = (type: string) =>
  PHASE_TYPES.find((t) => t.value === type) || PHASE_TYPES[PHASE_TYPES.length - 1];

// ─── Main Component ───

export function PlaybooksPage() {
  const { user } = useAuthStore();
  const { addToast } = useToastStore();

  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Playbook | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ── Playbook Form State ──
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formVerticalType, setFormVerticalType] = useState('retail');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formIsDefault, setFormIsDefault] = useState(false);
  const [formGlobalInstructions, setFormGlobalInstructions] = useState('');
  const [formMaxConversationTurns, setFormMaxConversationTurns] = useState(50);
  const [formTimeoutMinutes, setFormTimeoutMinutes] = useState(120);
  const [formHandoffMessage, setFormHandoffMessage] = useState('Te estoy transfiriendo con un asesor. Un momento por favor.');
  const [formFallbackPhase, setFormFallbackPhase] = useState('DISCOVERY');
  const [formPhases, setFormPhases] = useState<PlaybookPhase[]>([]);
  const [formTab, setFormTab] = useState<'general' | 'phases'>('general');

  // ── Phase Detail Modal ──
  const [phaseModalOpen, setPhaseModalOpen] = useState(false);
  const [editingPhaseIdx, setEditingPhaseIdx] = useState<number | null>(null);
  const [phaseForm, setPhaseForm] = useState<PlaybookPhase>(newPhase());

  // ── Template Modal ──
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateType, setTemplateType] = useState('retail');

  // ── Duplicate Modal ──
  const [dupModalOpen, setDupModalOpen] = useState(false);
  const [dupSourceId, setDupSourceId] = useState('');
  const [dupName, setDupName] = useState('');

  const canEdit = user?.role === 'OWNER' || user?.role === 'ADMIN';

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

  useEffect(() => {
    fetchPlaybooks();
  }, []);

  const fetchPlaybooks = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/playbooks');
      setPlaybooks(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // ─── Playbook CRUD ───

  const handleSavePlaybook = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: formName,
        description: formDescription,
        verticalType: formVerticalType,
        isActive: formIsActive,
        isDefault: formIsDefault,
        globalInstructions: formGlobalInstructions,
        maxConversationTurns: formMaxConversationTurns,
        timeoutMinutes: formTimeoutMinutes,
        handoffMessage: formHandoffMessage,
        fallbackPhase: formFallbackPhase,
        phases: formPhases,
      };

      if (editing) {
        await api.put(`/playbooks/${editing._id}`, payload);
        addToast('Playbook actualizado', 'success');
      } else {
        await api.post('/playbooks', payload);
        addToast('Playbook creado', 'success');
      }
      setModalOpen(false);
      fetchPlaybooks();
    } catch (error) {
      console.error(error);
      addToast('Error guardando el playbook', 'error');
    }
  };

  const handleDelete = (id: string) => {
    confirmAction(
      'Eliminar Playbook',
      '¿Estás seguro de que deseas eliminar este playbook? Esta acción no se puede deshacer.',
      async () => {
        try {
          await api.delete(`/playbooks/${id}`);
          fetchPlaybooks();
          addToast('Playbook eliminado', 'success');
          setModalConfig((prev) => ({ ...prev, isOpen: false }));
        } catch (error) {
          console.error(error);
          addToast('Error al eliminar', 'error');
          setModalConfig((prev) => ({ ...prev, isOpen: false }));
        }
      },
      true
    );
  };

  const handleCreateFromTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/playbooks/from-template', {
        verticalType: templateType,
        name: templateName || undefined,
      });
      addToast('Playbook creado desde plantilla', 'success');
      setTemplateModalOpen(false);
      setTemplateName('');
      fetchPlaybooks();
    } catch (error) {
      console.error(error);
      addToast('Error creando desde plantilla', 'error');
    }
  };

  const handleDuplicate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(`/playbooks/${dupSourceId}/duplicate`, { name: dupName });
      addToast('Playbook duplicado', 'success');
      setDupModalOpen(false);
      setDupName('');
      fetchPlaybooks();
    } catch (error) {
      console.error(error);
      addToast('Error al duplicar', 'error');
    }
  };

  const openEditModal = (pb: Playbook) => {
    setEditing(pb);
    setFormName(pb.name);
    setFormDescription(pb.description || '');
    setFormVerticalType(pb.verticalType || 'general');
    setFormIsActive(pb.isActive);
    setFormIsDefault(pb.isDefault);
    setFormGlobalInstructions(pb.globalInstructions || '');
    setFormMaxConversationTurns(pb.maxConversationTurns ?? 50);
    setFormTimeoutMinutes(pb.timeoutMinutes ?? 120);
    setFormHandoffMessage(pb.handoffMessage || '');
    setFormFallbackPhase(pb.fallbackPhase || 'DISCOVERY');
    setFormPhases(pb.phases ? pb.phases.map((p) => ({ ...p, transitions: p.transitions || [], autoResponses: p.autoResponses || [], requiredTools: p.requiredTools || [], blockedTools: p.blockedTools || [] })) : []);
    setFormTab('general');
    setModalOpen(true);
  };

  const openCreateModal = () => {
    setEditing(null);
    setFormName('');
    setFormDescription('');
    setFormVerticalType('retail');
    setFormIsActive(true);
    setFormIsDefault(false);
    setFormGlobalInstructions('');
    setFormMaxConversationTurns(50);
    setFormTimeoutMinutes(120);
    setFormHandoffMessage('Te estoy transfiriendo con un asesor. Un momento por favor.');
    setFormFallbackPhase('DISCOVERY');
    setFormPhases([]);
    setFormTab('general');
    setModalOpen(true);
  };

  // ─── Phase Management ───

  const addNewPhase = () => {
    const phase = newPhase();
    phase.order = formPhases.length;
    setFormPhases([...formPhases, phase]);
  };

  const removePhase = (idx: number) => {
    setFormPhases(formPhases.filter((_, i) => i !== idx));
  };

  const movePhase = (idx: number, direction: 'up' | 'down') => {
    const arr = [...formPhases];
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= arr.length) return;
    [arr[idx], arr[swapIdx]] = [arr[swapIdx], arr[idx]];
    arr.forEach((p, i) => (p.order = i));
    setFormPhases(arr);
  };

  const openPhaseDetail = (idx: number) => {
    setEditingPhaseIdx(idx);
    setPhaseForm({ ...formPhases[idx] });
    setPhaseModalOpen(true);
  };

  const savePhaseDetail = () => {
    if (editingPhaseIdx === null) return;
    const updated = [...formPhases];
    updated[editingPhaseIdx] = { ...phaseForm };
    setFormPhases(updated);
    setPhaseModalOpen(false);
  };

  const togglePhaseEnabled = (idx: number) => {
    const updated = [...formPhases];
    updated[idx] = { ...updated[idx], enabled: !updated[idx].enabled };
    setFormPhases(updated);
  };

  // ─── Phase Sub-Editors ───

  const addTransition = () => {
    setPhaseForm({
      ...phaseForm,
      transitions: [
        ...phaseForm.transitions,
        { trigger: 'MESSAGE_RECEIVED', targetPhase: '', condition: '', delayMs: 0 },
      ],
    });
  };

  const updateTransition = (idx: number, field: keyof PhaseTransition, value: any) => {
    const updated = [...phaseForm.transitions];
    (updated[idx] as any)[field] = value;
    setPhaseForm({ ...phaseForm, transitions: updated });
  };

  const removeTransition = (idx: number) => {
    setPhaseForm({
      ...phaseForm,
      transitions: phaseForm.transitions.filter((_, i) => i !== idx),
    });
  };

  const addAutoResponse = () => {
    setPhaseForm({
      ...phaseForm,
      autoResponses: [...phaseForm.autoResponses, { trigger: '', message: '', condition: '' }],
    });
  };

  const updateAutoResponse = (idx: number, field: keyof PhaseAutoResponse, value: string) => {
    const updated = [...phaseForm.autoResponses];
    (updated[idx] as any)[field] = value;
    setPhaseForm({ ...phaseForm, autoResponses: updated });
  };

  const removeAutoResponse = (idx: number) => {
    setPhaseForm({
      ...phaseForm,
      autoResponses: phaseForm.autoResponses.filter((_, i) => i !== idx),
    });
  };

  // ─── Render ───

  const getVerticalBadge = (type: string) => {
    const colors: Record<string, string> = {
      retail: 'bg-blue-100 text-blue-700',
      restaurante: 'bg-orange-100 text-orange-700',
      inmobiliaria: 'bg-purple-100 text-purple-700',
      servicios: 'bg-cyan-100 text-cyan-700',
      general: 'bg-corporate-100 text-corporate-600',
    };
    return colors[type] || colors.general;
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-corporate-100">
        <div>
          <h1 className="text-2xl font-bold text-corporate-900">Playbooks de Conversación</h1>
          <p className="text-corporate-400 text-sm mt-1">
            Define el flujo de ventas paso a paso: fases, transiciones, objetivos y herramientas
          </p>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <button
              onClick={() => setTemplateModalOpen(true)}
              className="border border-corporate-200 hover:bg-corporate-50 text-corporate-700 px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <LayoutTemplate className="w-4 h-4" />
              Desde Plantilla
            </button>
            <button
              onClick={openCreateModal}
              className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Nuevo Playbook
            </button>
          </div>
        )}
      </div>

      {/* Playbook List */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-corporate-100 flex justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        ) : playbooks.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-corporate-100 text-center p-12 text-corporate-400 flex flex-col items-center">
            <GitBranch className="w-12 h-12 mb-4 opacity-50" />
            <p>No hay playbooks configurados</p>
            <p className="text-sm mt-1">Crea uno desde cero o elige una plantilla</p>
          </div>
        ) : (
          playbooks.map((pb) => (
            <div
              key={pb._id}
              className="bg-white rounded-xl shadow-sm border border-corporate-100 overflow-hidden"
            >
              {/* Playbook Row */}
              <div className="flex items-center gap-4 p-5">
                <button
                  onClick={() => setExpandedId(expandedId === pb._id ? null : pb._id)}
                  className="text-corporate-400 hover:text-corporate-600 transition-colors"
                >
                  {expandedId === pb._id ? (
                    <ChevronDown className="w-5 h-5" />
                  ) : (
                    <ChevronRight className="w-5 h-5" />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <h3 className="font-bold text-corporate-900 truncate">{pb.name}</h3>
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${getVerticalBadge(pb.verticalType)}`}>
                      {pb.verticalType}
                    </span>
                    {pb.isDefault && (
                      <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
                        Default
                      </span>
                    )}
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${pb.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {pb.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  <p className="text-sm text-corporate-400 mt-0.5 truncate">{pb.description || 'Sin descripción'}</p>
                </div>

                <div className="flex items-center gap-2 text-sm text-corporate-500">
                  <GitBranch className="w-4 h-4" />
                  <span>{pb.phases?.length || 0} fases</span>
                </div>

                {canEdit && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setDupSourceId(pb._id);
                        setDupName(`${pb.name} (copia)`);
                        setDupModalOpen(true);
                      }}
                      className="p-2 text-corporate-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors"
                      title="Duplicar"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openEditModal(pb)}
                      className="p-2 text-corporate-400 hover:text-accent hover:bg-accent/10 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(pb._id)}
                      className="p-2 text-corporate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Expanded Phase Preview */}
              {expandedId === pb._id && pb.phases && pb.phases.length > 0 && (
                <div className="border-t border-corporate-100 bg-corporate-50/50 px-5 py-4">
                  <div className="flex items-center gap-1 overflow-x-auto pb-1">
                    {pb.phases
                      .sort((a, b) => a.order - b.order)
                      .map((phase, idx) => {
                        const cfg = getPhaseTypeConfig(phase.phaseType);
                        return (
                          <div key={phase.id} className="flex items-center gap-1 flex-shrink-0">
                            <div
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                                phase.enabled
                                  ? `${cfg.color} border-current/20`
                                  : 'bg-corporate-100 text-corporate-400 border-corporate-200 line-through'
                              }`}
                            >
                              <div className="font-bold">{phase.name}</div>
                              <div className="text-[10px] opacity-70">{cfg.label}</div>
                            </div>
                            {idx < (pb.phases?.length || 0) - 1 && (
                              <ArrowRight className="w-3 h-3 text-corporate-300 flex-shrink-0" />
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* PLAYBOOK CREATE / EDIT MODAL                          */}
      {/* ═══════════════════════════════════════════════════════ */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-corporate-100 bg-corporate-50 flex-shrink-0">
              <h3 className="font-semibold text-lg text-corporate-900">
                {editing ? 'Editar Playbook' : 'Nuevo Playbook'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-corporate-400 hover:text-corporate-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-corporate-100 flex-shrink-0">
              <button
                type="button"
                onClick={() => setFormTab('general')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  formTab === 'general'
                    ? 'text-accent border-b-2 border-accent'
                    : 'text-corporate-400 hover:text-corporate-600'
                }`}
              >
                Configuración General
              </button>
              <button
                type="button"
                onClick={() => setFormTab('phases')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                  formTab === 'phases'
                    ? 'text-accent border-b-2 border-accent'
                    : 'text-corporate-400 hover:text-corporate-600'
                }`}
              >
                <GitBranch className="w-4 h-4" />
                Fases ({formPhases.length})
              </button>
            </div>

            {/* Content */}
            <form onSubmit={handleSavePlaybook} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* ── TAB: General ── */}
              {formTab === 'general' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-corporate-700 mb-1">Nombre</label>
                      <input
                        type="text" required value={formName} onChange={(e) => setFormName(e.target.value)}
                        className="w-full px-4 py-2 border border-corporate-200 rounded-lg focus:ring-2 focus:ring-accent outline-none"
                        placeholder="Ej. Playbook Retail Premium"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-corporate-700 mb-1">Descripción</label>
                      <input
                        type="text" value={formDescription} onChange={(e) => setFormDescription(e.target.value)}
                        className="w-full px-4 py-2 border border-corporate-200 rounded-lg focus:ring-2 focus:ring-accent outline-none"
                        placeholder="Breve descripción del propósito de este playbook"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-corporate-700 mb-1">Tipo de Vertical</label>
                      <select
                        value={formVerticalType} onChange={(e) => setFormVerticalType(e.target.value)}
                        className="w-full px-4 py-2 border border-corporate-200 rounded-lg focus:ring-2 focus:ring-accent outline-none bg-white"
                      >
                        {VERTICAL_TYPES.map((v) => (
                          <option key={v.value} value={v.value}>{v.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-corporate-700 mb-1">Fase de Fallback</label>
                      <select
                        value={formFallbackPhase} onChange={(e) => setFormFallbackPhase(e.target.value)}
                        className="w-full px-4 py-2 border border-corporate-200 rounded-lg focus:ring-2 focus:ring-accent outline-none bg-white"
                      >
                        {PHASE_TYPES.map((p) => (
                          <option key={p.value} value={p.value}>{p.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2 flex gap-6">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox" checked={formIsActive} onChange={(e) => setFormIsActive(e.target.checked)}
                          className="w-4 h-4 text-accent border-corporate-300 rounded focus:ring-accent"
                        />
                        <span className="text-sm text-corporate-700">Activo</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox" checked={formIsDefault} onChange={(e) => setFormIsDefault(e.target.checked)}
                          className="w-4 h-4 text-accent border-corporate-300 rounded focus:ring-accent"
                        />
                        <span className="text-sm text-corporate-700">Playbook por defecto del tenant</span>
                      </label>
                    </div>
                  </div>

                  <div className="border-t border-corporate-100 pt-4">
                    <h4 className="font-bold text-sm text-corporate-900 mb-3">Límites Globales</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-corporate-500 mb-1">Máx. Turnos Conversación</label>
                        <input
                          type="number" min={1} max={200}
                          value={formMaxConversationTurns} onChange={(e) => setFormMaxConversationTurns(parseInt(e.target.value) || 50)}
                          className="w-full px-3 py-2 border border-corporate-200 rounded-lg focus:ring-2 focus:ring-accent outline-none text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-corporate-500 mb-1">Timeout (minutos)</label>
                        <input
                          type="number" min={5} max={1440}
                          value={formTimeoutMinutes} onChange={(e) => setFormTimeoutMinutes(parseInt(e.target.value) || 120)}
                          className="w-full px-3 py-2 border border-corporate-200 rounded-lg focus:ring-2 focus:ring-accent outline-none text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-corporate-500 mb-1">Mensaje de Handoff</label>
                        <input
                          type="text" value={formHandoffMessage} onChange={(e) => setFormHandoffMessage(e.target.value)}
                          className="w-full px-3 py-2 border border-corporate-200 rounded-lg focus:ring-2 focus:ring-accent outline-none text-sm"
                          placeholder="Te transfiero con un asesor..."
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-corporate-100 pt-4">
                    <label className="block text-sm font-medium text-corporate-700 mb-1">Instrucciones Globales</label>
                    <p className="text-xs text-corporate-400 mb-2">Instrucciones que aplican a todas las fases del playbook</p>
                    <textarea
                      rows={4} value={formGlobalInstructions} onChange={(e) => setFormGlobalInstructions(e.target.value)}
                      className="w-full px-4 py-2 border border-corporate-200 rounded-lg focus:ring-2 focus:ring-accent outline-none resize-y text-sm"
                      placeholder="Ej. Siempre preguntar el nombre del cliente antes de generar una orden..."
                    />
                  </div>
                </>
              )}

              {/* ── TAB: Phases ── */}
              {formTab === 'phases' && (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-corporate-500">
                      Arrange las fases en orden. Cada fase define qué hace la IA en ese momento de la conversación.
                    </p>
                    {canEdit && (
                      <button
                        type="button" onClick={addNewPhase}
                        className="text-accent text-sm font-medium flex items-center gap-1 hover:text-accent-hover"
                      >
                        <Plus className="w-4 h-4" /> Agregar Fase
                      </button>
                    )}
                  </div>

                  {formPhases.length === 0 && (
                    <div className="text-center py-12 bg-corporate-50 rounded-lg border border-dashed border-corporate-200">
                      <GitBranch className="w-10 h-10 mx-auto mb-3 text-corporate-300" />
                      <p className="text-corporate-500 font-medium">No hay fases definidas</p>
                      <p className="text-sm text-corporate-400 mt-1">Agrega fases para definir el flujo de la conversación</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    {formPhases.map((phase, idx) => {
                      const cfg = getPhaseTypeConfig(phase.phaseType);
                      return (
                        <div
                          key={phase.id}
                          className={`flex items-center gap-3 p-4 rounded-lg border transition-colors ${
                            phase.enabled
                              ? 'bg-white border-corporate-200 hover:border-accent/30'
                              : 'bg-corporate-50 border-corporate-200 opacity-60'
                          }`}
                        >
                          {/* Order controls */}
                          <div className="flex flex-col gap-0.5 flex-shrink-0">
                            <button
                              type="button" onClick={() => movePhase(idx, 'up')} disabled={idx === 0}
                              className="p-0.5 text-corporate-300 hover:text-corporate-600 disabled:opacity-30"
                            >
                              <ChevronsUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button" onClick={() => movePhase(idx, 'down')} disabled={idx === formPhases.length - 1}
                              className="p-0.5 text-corporate-300 hover:text-corporate-600 disabled:opacity-30"
                            >
                              <ChevronsDown className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Number */}
                          <div className="w-7 h-7 rounded-full bg-corporate-100 flex items-center justify-center text-xs font-bold text-corporate-600 flex-shrink-0">
                            {idx + 1}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-corporate-900 truncate">{phase.name}</span>
                              <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium ${cfg.color}`}>
                                {cfg.label}
                              </span>
                              {!phase.enabled && (
                                <span className="text-[10px] text-corporate-400 italic">deshabilitada</span>
                              )}
                            </div>
                            <p className="text-xs text-corporate-400 truncate mt-0.5">
                              {phase.instructions || 'Sin instrucciones'}
                            </p>
                          </div>

                          {/* Meta */}
                          <div className="flex items-center gap-3 text-xs text-corporate-400 flex-shrink-0">
                            {phase.transitions.length > 0 && (
                              <span className="flex items-center gap-1">
                                <ArrowRight className="w-3 h-3" /> {phase.transitions.length}
                              </span>
                            )}
                            {phase.maxTurns && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {phase.maxTurns}
                              </span>
                            )}
                            {(phase.requiredTools.length > 0 || phase.blockedTools.length > 0) && (
                              <span className="flex items-center gap-1">
                                <Wrench className="w-3 h-3" />
                              </span>
                            )}
                          </div>

                          {/* Actions */}
                          {canEdit && (
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button
                                type="button"
                                onClick={() => togglePhaseEnabled(idx)}
                                className="p-1.5 rounded-lg transition-colors text-corporate-400 hover:text-corporate-700 hover:bg-corporate-100"
                                title={phase.enabled ? 'Deshabilitar' : 'Habilitar'}
                              >
                                {phase.enabled ? <ToggleRight className="w-5 h-5 text-green-500" /> : <ToggleLeft className="w-5 h-5" />}
                              </button>
                              <button
                                type="button" onClick={() => openPhaseDetail(idx)}
                                className="p-1.5 text-corporate-400 hover:text-accent hover:bg-accent/10 rounded-lg transition-colors"
                                title="Configurar fase"
                              >
                                <Settings2 className="w-4 h-4" />
                              </button>
                              <button
                                type="button" onClick={() => removePhase(idx)}
                                className="p-1.5 text-corporate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Eliminar fase"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
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
                  {editing ? 'Guardar Cambios' : 'Crear Playbook'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* PHASE DETAIL MODAL                                    */}
      {/* ═══════════════════════════════════════════════════════ */}
      {phaseModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-5 border-b border-corporate-100 bg-corporate-50 flex-shrink-0">
              <h3 className="font-semibold text-lg text-corporate-900">Configurar Fase</h3>
              <button onClick={() => setPhaseModalOpen(false)} className="text-corporate-400 hover:text-corporate-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-corporate-500 mb-1">ID de la Fase</label>
                  <input
                    type="text" value={phaseForm.id} onChange={(e) => setPhaseForm({ ...phaseForm, id: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') })}
                    className="w-full px-3 py-1.5 border border-corporate-200 rounded-md text-sm focus:ring-2 focus:ring-accent outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-corporate-500 mb-1">Nombre</label>
                  <input
                    type="text" value={phaseForm.name} onChange={(e) => setPhaseForm({ ...phaseForm, name: e.target.value })}
                    className="w-full px-3 py-1.5 border border-corporate-200 rounded-md text-sm focus:ring-2 focus:ring-accent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-corporate-500 mb-1">Tipo de Fase</label>
                  <select
                    value={phaseForm.phaseType} onChange={(e) => setPhaseForm({ ...phaseForm, phaseType: e.target.value })}
                    className="w-full px-3 py-1.5 border border-corporate-200 rounded-md text-sm focus:ring-2 focus:ring-accent outline-none bg-white"
                  >
                    {PHASE_TYPES.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-corporate-500 mb-1">Orden</label>
                  <input
                    type="number" min={0}
                    value={phaseForm.order} onChange={(e) => setPhaseForm({ ...phaseForm, order: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 border border-corporate-200 rounded-md text-sm focus:ring-2 focus:ring-accent outline-none"
                  />
                </div>
              </div>

              {/* Instructions */}
              <div>
                <label className="block text-xs font-medium text-corporate-500 mb-1">Instrucciones para la IA</label>
                <textarea
                  rows={3} value={phaseForm.instructions} onChange={(e) => setPhaseForm({ ...phaseForm, instructions: e.target.value })}
                  className="w-full px-3 py-2 border border-corporate-200 rounded-md text-sm focus:ring-2 focus:ring-accent outline-none resize-y"
                  placeholder="¿Qué debe hacer la IA en esta fase?"
                />
              </div>

              {/* System Prompt Override */}
              <div>
                <label className="block text-xs font-medium text-corporate-500 mb-1">System Prompt Override (opcional)</label>
                <textarea
                  rows={3} value={phaseForm.systemPromptOverride} onChange={(e) => setPhaseForm({ ...phaseForm, systemPromptOverride: e.target.value })}
                  className="w-full px-3 py-2 border border-corporate-200 rounded-md text-sm focus:ring-2 focus:ring-accent outline-none resize-y font-mono"
                  placeholder="Si se define, reemplaza el prompt del sistema para esta fase..."
                />
              </div>

              {/* Limits */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-corporate-500 mb-1">Máx. Turnos</label>
                  <input
                    type="number" min={1}
                    value={phaseForm.maxTurns} onChange={(e) => setPhaseForm({ ...phaseForm, maxTurns: parseInt(e.target.value) || 10 })}
                    className="w-full px-3 py-1.5 border border-corporate-200 rounded-md text-sm focus:ring-2 focus:ring-accent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-corporate-500 mb-1">Timeout (min)</label>
                  <input
                    type="number" min={1}
                    value={phaseForm.timeoutMinutes} onChange={(e) => setPhaseForm({ ...phaseForm, timeoutMinutes: parseInt(e.target.value) || 60 })}
                    className="w-full px-3 py-1.5 border border-corporate-200 rounded-md text-sm focus:ring-2 focus:ring-accent outline-none"
                  />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox" checked={phaseForm.handoffOnTimeout}
                      onChange={(e) => setPhaseForm({ ...phaseForm, handoffOnTimeout: e.target.checked })}
                      className="w-4 h-4 text-accent border-corporate-300 rounded focus:ring-accent"
                    />
                    <span className="text-xs text-corporate-600">Handoff on Timeout</span>
                  </label>
                </div>
              </div>

              {/* Tools */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-corporate-500 mb-1">
                    <Wrench className="w-3 h-3 inline mr-1" />
                    Herramientas Requeridas
                  </label>
                  <TagsInput
                    value={phaseForm.requiredTools}
                    onChange={(v) => setPhaseForm({ ...phaseForm, requiredTools: v })}
                    placeholder="buscar_productos, generar_orden..."
                    suggestions={ALL_TOOLS}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-corporate-500 mb-1">
                    <Shield className="w-3 h-3 inline mr-1" />
                    Herramientas Bloqueadas
                  </label>
                  <TagsInput
                    value={phaseForm.blockedTools}
                    onChange={(v) => setPhaseForm({ ...phaseForm, blockedTools: v })}
                    placeholder="Herramientas prohibidas en esta fase..."
                    suggestions={ALL_TOOLS}
                  />
                </div>
              </div>

              {/* Goal */}
              <div className="border-t border-corporate-100 pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-4 h-4 text-corporate-500" />
                  <h4 className="font-bold text-sm text-corporate-900">Objetivo de la Fase</h4>
                  <label className="flex items-center gap-1.5 ml-auto cursor-pointer">
                    <input
                      type="checkbox"
                      checked={phaseForm.goal !== null}
                      onChange={(e) => setPhaseForm({ ...phaseForm, goal: e.target.checked ? { ...EMPTY_GOAL } : null })}
                      className="w-3.5 h-3.5 text-accent border-corporate-300 rounded focus:ring-accent"
                    />
                    <span className="text-xs text-corporate-500">Activar</span>
                  </label>
                </div>
                {phaseForm.goal && (
                  <div className="bg-corporate-50 rounded-lg p-3 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-medium text-corporate-500 mb-1">Tipo</label>
                        <select
                          value={phaseForm.goal.type}
                          onChange={(e) => setPhaseForm({ ...phaseForm, goal: { ...phaseForm.goal!, type: e.target.value } })}
                          className="w-full px-3 py-1.5 border border-corporate-200 rounded-md text-sm focus:ring-2 focus:ring-accent outline-none bg-white"
                        >
                          {GOAL_TYPES.map((g) => (
                            <option key={g.value} value={g.value}>{g.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-corporate-500 mb-1">Máx. Turnos</label>
                        <input
                          type="number" min={1}
                          value={phaseForm.goal.maxTurns}
                          onChange={(e) => setPhaseForm({ ...phaseForm, goal: { ...phaseForm.goal!, maxTurns: parseInt(e.target.value) || 5 } })}
                          className="w-full px-3 py-1.5 border border-corporate-200 rounded-md text-sm focus:ring-2 focus:ring-accent outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-corporate-500 mb-1">Descripción</label>
                      <input
                        type="text" value={phaseForm.goal.description}
                        onChange={(e) => setPhaseForm({ ...phaseForm, goal: { ...phaseForm.goal!, description: e.target.value } })}
                        className="w-full px-3 py-1.5 border border-corporate-200 rounded-md text-sm focus:ring-2 focus:ring-accent outline-none"
                        placeholder="Qué se busca lograr en esta fase"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-corporate-500 mb-1">Entidades Requeridas</label>
                      <TagsInput
                        value={phaseForm.goal.requiredEntities}
                        onChange={(v) => setPhaseForm({ ...phaseForm, goal: { ...phaseForm.goal!, requiredEntities: v } })}
                        placeholder="keywords, city, budget..."
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-corporate-500 mb-1">Acción de Fallback</label>
                      <input
                        type="text" value={phaseForm.goal.fallbackAction}
                        onChange={(e) => setPhaseForm({ ...phaseForm, goal: { ...phaseForm.goal!, fallbackAction: e.target.value } })}
                        className="w-full px-3 py-1.5 border border-corporate-200 rounded-md text-sm focus:ring-2 focus:ring-accent outline-none"
                        placeholder="Qué hacer si el objetivo no se cumple"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Transitions */}
              <div className="border-t border-corporate-100 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ArrowRight className="w-4 h-4 text-corporate-500" />
                    <h4 className="font-bold text-sm text-corporate-900">Transiciones</h4>
                  </div>
                  <button
                    type="button" onClick={addTransition}
                    className="text-accent text-xs font-medium flex items-center gap-1 hover:text-accent-hover"
                  >
                    <Plus className="w-3 h-3" /> Agregar
                  </button>
                </div>
                {phaseForm.transitions.length === 0 && (
                  <p className="text-xs text-corporate-400 italic">No hay transiciones definidas</p>
                )}
                <div className="space-y-2">
                  {phaseForm.transitions.map((tr, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-corporate-50 rounded-lg p-2">
                      <select
                        value={tr.trigger} onChange={(e) => updateTransition(idx, 'trigger', e.target.value)}
                        className="px-2 py-1 border border-corporate-200 rounded text-xs focus:ring-2 focus:ring-accent outline-none bg-white"
                      >
                        {TRIGGER_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                      <ArrowRight className="w-3 h-3 text-corporate-400" />
                      <select
                        value={tr.targetPhase} onChange={(e) => updateTransition(idx, 'targetPhase', e.target.value)}
                        className="px-2 py-1 border border-corporate-200 rounded text-xs focus:ring-2 focus:ring-accent outline-none bg-white"
                      >
                        <option value="">Seleccionar fase...</option>
                        {formPhases.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                        {PHASE_TYPES.map((p) => (
                          <option key={p.value} value={p.value}>{p.label}</option>
                        ))}
                      </select>
                      <input
                        type="text" value={tr.condition} onChange={(e) => updateTransition(idx, 'condition', e.target.value)}
                        className="flex-1 px-2 py-1 border border-corporate-200 rounded text-xs focus:ring-2 focus:ring-accent outline-none"
                        placeholder="Condición (opcional)"
                      />
                      <button
                        type="button" onClick={() => removeTransition(idx)}
                        className="p-1 text-corporate-400 hover:text-red-500 rounded"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Auto-Responses */}
              <div className="border-t border-corporate-100 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-corporate-500" />
                    <h4 className="font-bold text-sm text-corporate-900">Respuestas Automáticas</h4>
                  </div>
                  <button
                    type="button" onClick={addAutoResponse}
                    className="text-accent text-xs font-medium flex items-center gap-1 hover:text-accent-hover"
                  >
                    <Plus className="w-3 h-3" /> Agregar
                  </button>
                </div>
                {phaseForm.autoResponses.length === 0 && (
                  <p className="text-xs text-corporate-400 italic">No hay respuestas automáticas</p>
                )}
                <div className="space-y-2">
                  {phaseForm.autoResponses.map((ar, idx) => (
                    <div key={idx} className="bg-corporate-50 rounded-lg p-2 space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="text" value={ar.trigger} onChange={(e) => updateAutoResponse(idx, 'trigger', e.target.value)}
                          className="flex-1 px-2 py-1 border border-corporate-200 rounded text-xs focus:ring-2 focus:ring-accent outline-none"
                          placeholder="Trigger (ej. timeout, no_product_found)"
                        />
                        <button
                          type="button" onClick={() => removeAutoResponse(idx)}
                          className="p-1 text-corporate-400 hover:text-red-500 rounded"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      <textarea
                        rows={2} value={ar.message} onChange={(e) => updateAutoResponse(idx, 'message', e.target.value)}
                        className="w-full px-2 py-1 border border-corporate-200 rounded text-xs focus:ring-2 focus:ring-accent outline-none resize-none"
                        placeholder="Mensaje que enviará la IA automáticamente"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-5 border-t border-corporate-100 flex-shrink-0">
              <button
                type="button" onClick={() => setPhaseModalOpen(false)}
                className="px-4 py-2 text-corporate-600 hover:bg-corporate-50 rounded-lg font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button" onClick={savePhaseDetail}
                className="px-6 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg font-medium transition-colors"
              >
                Guardar Fase
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* TEMPLATE MODAL                                        */}
      {/* ═══════════════════════════════════════════════════════ */}
      {templateModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center p-5 border-b border-corporate-100 bg-corporate-50">
              <h3 className="font-semibold text-lg text-corporate-900">Crear desde Plantilla</h3>
              <button onClick={() => setTemplateModalOpen(false)} className="text-corporate-400 hover:text-corporate-900">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateFromTemplate} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-corporate-700 mb-1">Tipo de Plantilla</label>
                <div className="grid grid-cols-2 gap-2">
                  {VERTICAL_TYPES.filter((v) => v.value !== 'general').map((v) => (
                    <button
                      key={v.value} type="button"
                      onClick={() => setTemplateType(v.value)}
                      className={`p-3 rounded-lg border-2 text-left transition-all ${
                        templateType === v.value
                          ? 'border-accent bg-accent/5'
                          : 'border-corporate-200 hover:border-corporate-300'
                      }`}
                    >
                      <div className="font-medium text-sm text-corporate-900">{v.label}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-corporate-700 mb-1">Nombre (opcional)</label>
                <input
                  type="text" value={templateName} onChange={(e) => setTemplateName(e.target.value)}
                  className="w-full px-4 py-2 border border-corporate-200 rounded-lg focus:ring-2 focus:ring-accent outline-none"
                  placeholder="Se generará uno automático si lo dejas vacío"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button" onClick={() => setTemplateModalOpen(false)}
                  className="px-4 py-2 text-corporate-600 hover:bg-corporate-50 rounded-lg font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg font-medium transition-colors"
                >
                  Crear Playbook
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* DUPLICATE MODAL                                       */}
      {/* ═══════════════════════════════════════════════════════ */}
      {dupModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center p-5 border-b border-corporate-100 bg-corporate-50">
              <h3 className="font-semibold text-lg text-corporate-900">Duplicar Playbook</h3>
              <button onClick={() => setDupModalOpen(false)} className="text-corporate-400 hover:text-corporate-900">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleDuplicate} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-corporate-700 mb-1">Nombre del nuevo playbook</label>
                <input
                  type="text" required value={dupName} onChange={(e) => setDupName(e.target.value)}
                  className="w-full px-4 py-2 border border-corporate-200 rounded-lg focus:ring-2 focus:ring-accent outline-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button" onClick={() => setDupModalOpen(false)}
                  className="px-4 py-2 text-corporate-600 hover:bg-corporate-50 rounded-lg font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg font-medium transition-colors"
                >
                  Duplicar
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
