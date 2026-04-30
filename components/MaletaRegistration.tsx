import React, { useState } from 'react';
import { Maleta, Employee, Tool, MaletaTool, MaletaCheck, MaletaCheckItem, MaletaEvent, Assignment, Department, StandardToolList } from '@/lib/data';
import { Plus, Edit2, Trash2, Search, Package, Tag, User, Wrench as ToolIcon, Save, X, Clock, ArrowRight, ClipboardCheck, CheckCircle2, AlertCircle, HelpCircle, History, PlusCircle, MinusCircle, FileEdit, Filter, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ConfirmModal from './ConfirmModal';
import { sortByName } from '@/lib/utils';
import { User as FirebaseUser } from 'firebase/auth';

export default function MaletaRegistration({
  maletas, setMaletas,
  employees,
  tools,
  maletaTools,
  setMaletaTools,
  maletaChecks,
  setMaletaChecks,
  maletaEvents,
  setMaletaEvents,
  assignments = [],
  departments = [],
  standardLists = [],
  isGuest = false,
  currentUser
}: {
  maletas: Maleta[], setMaletas: (maletas: Maleta[]) => void,
  employees: Employee[],
  tools: Tool[],
  maletaTools: MaletaTool[],
  setMaletaTools: (maletaTools: MaletaTool[]) => void,
  maletaChecks: MaletaCheck[],
  setMaletaChecks: (checks: MaletaCheck[]) => void,
  maletaEvents: MaletaEvent[],
  setMaletaEvents: (events: MaletaEvent[]) => void,
  assignments?: Assignment[],
  departments?: Department[],
  standardLists?: StandardToolList[],
  isGuest?: boolean,
  currentUser: FirebaseUser | null
}) {
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [importToolsFromAssignment, setImportToolsFromAssignment] = useState(true);
  const [formData, setFormData] = useState({
    codigo_tag: '',
    nome: '',
    setor: '',
    status: 'Ativa' as Maleta['status'],
    responsavel_id: '',
    observacoes: ''
  });
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState({
    codigo: '',
    nome: '',
    setor: '',
    responsavel_id: ''
  });
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean, id: string | null }>({ isOpen: false, id: null });
  const [error, setError] = useState<string | null>(null);

  const [selectedMaletaId, setSelectedMaletaId] = useState<string | null>(null);
  const [isCheckingId, setIsCheckingId] = useState<string | null>(null);

  const addEvent = (maletaId: string, type: MaletaEvent['type'], description: string) => {
    const newEvent: MaletaEvent = {
      id: crypto.randomUUID(),
      maleta_id: maletaId,
      type,
      date: new Date().toISOString(),
      user_name: currentUser?.displayName || 'Sistema',
      user_id: currentUser?.uid || 'system',
      description,
      uid: currentUser?.uid || 'guest'
    };
    setMaletaEvents([...maletaEvents, newEvent]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate unique codigo_tag
    const isDuplicate = maletas.some(m => 
      m.codigo_tag.toLowerCase() === formData.codigo_tag.toLowerCase() && 
      m.id !== isEditing
    );

    if (isDuplicate) {
      setError(`O código/TAG "${formData.codigo_tag}" já está cadastrado.`);
      return;
    }

    const now = new Date().toISOString();

    if (isEditing) {
      setMaletas(maletas.map(m => m.id === isEditing ? { ...m, ...formData, updated_at: now } : m));
      addEvent(isEditing, 'edition', `Informações da maleta atualizadas por ${currentUser?.displayName || 'usuário'}`);
    } else {
      const newId = crypto.randomUUID();
      const newMaleta: Maleta = { 
        id: newId, 
        ...formData,
        created_at: now,
        updated_at: now,
        uid: currentUser?.uid || 'guest'
      };
      
      setMaletas([...maletas, newMaleta]);
      addEvent(newId, 'creation', `Maleta "${formData.nome}" criada no sistema`);

      // Auto-import tools from assignments if requested
      if (importToolsFromAssignment && formData.responsavel_id) {
        const employeeAssignment = assignments.find(a => a.employeeId === formData.responsavel_id);
        const emp = employees.find(e => e.id === formData.responsavel_id);
        const dept = departments.find(d => d.id === emp?.departmentId);
        const stdList = standardLists.find(s => s.id === dept?.standardListId);

        if (employeeAssignment || stdList) {
          const maletaPrefix = formData.codigo_tag.match(/\d+/)?.[0] || '000';
          const newTools: MaletaTool[] = [];
          
          // 1. Add assigned tools
          if (employeeAssignment) {
            employeeAssignment.assignedTools.forEach((at, index) => {
              newTools.push({
                id: crypto.randomUUID(),
                maleta_id: newId,
                ferramenta_id: at.toolId,
                quantidade: at.quantity,
                estado: 'Boa',
                tag: `${maletaPrefix}-${String.fromCharCode(65 + newTools.length)}`,
                uid: currentUser?.uid || 'guest'
              });
            });
          }

          // 2. Add missing tools from standard list
          if (stdList) {
            stdList.tools.forEach(stdTool => {
              const assigned = employeeAssignment?.assignedTools.find(at => at.toolId === stdTool.toolId);
              const assignedQty = assigned ? assigned.quantity : 0;
              
              if (assignedQty < stdTool.quantity) {
                newTools.push({
                  id: crypto.randomUUID(),
                  maleta_id: newId,
                  ferramenta_id: stdTool.toolId,
                  quantidade: stdTool.quantity - assignedQty,
                  estado: 'Faltando',
                  tag: `${maletaPrefix}-${String.fromCharCode(65 + newTools.length)}`,
                  uid: currentUser?.uid || 'guest'
                });
              }
            });
          }

          if (newTools.length > 0) {
            setMaletaTools([...maletaTools, ...newTools]);
            addEvent(newId, 'tool_addition', `Importadas ${newTools.length} ferramentas (incluindo pendentes) das atribuições e padrão do setor`);
          }
        }
      }
    }

    setIsEditing(null);
    setFormData({ codigo_tag: '', nome: '', setor: '', status: 'Ativa', responsavel_id: '', observacoes: '' });
  };

  const handleEdit = (maleta: Maleta) => {
    setIsEditing(maleta.id);
    setFormData({ 
      codigo_tag: maleta.codigo_tag, 
      nome: maleta.nome, 
      setor: maleta.setor,
      status: maleta.status,
      responsavel_id: maleta.responsavel_id || '',
      observacoes: maleta.observacoes || ''
    });
    setError(null);
  };

  const handleDelete = (id: string) => {
    if (isGuest) return;
    setDeleteModal({ isOpen: true, id });
  };

  const confirmDelete = () => {
    if (deleteModal.id) {
      setMaletas(maletas.filter(m => m.id !== deleteModal.id));
      if (selectedMaletaId === deleteModal.id) {
        setSelectedMaletaId(null);
      }
    }
    setDeleteModal({ isOpen: false, id: null });
  };

  const filteredMaletas = maletas.filter(m => {
    const employee = employees.find(e => e.id === m.responsavel_id);
    const searchLower = search.toLowerCase();
    
    // Global smart search
    const matchesGlobal = !search || (
      String(m.codigo_tag || '').toLowerCase().includes(searchLower) || 
      String(m.nome || '').toLowerCase().includes(searchLower) ||
      String(m.setor || '').toLowerCase().includes(searchLower) ||
      String(employee?.name || '').toLowerCase().includes(searchLower)
    );

    // Advanced filters
    const matchesCode = !advancedFilters.codigo || String(m.codigo_tag || '').toLowerCase().includes(advancedFilters.codigo.toLowerCase());
    const matchesName = !advancedFilters.nome || String(m.nome || '').toLowerCase().includes(advancedFilters.nome.toLowerCase());
    const matchesSector = !advancedFilters.setor || String(m.setor || '').toLowerCase().includes(advancedFilters.setor.toLowerCase());
    const matchesResponsible = !advancedFilters.responsavel_id || m.responsavel_id === advancedFilters.responsavel_id;

    return matchesGlobal && matchesCode && matchesName && matchesSector && matchesResponsible;
  }).sort((a, b) => a.nome.localeCompare(b.nome));

  if (isCheckingId) {
    const maleta = maletas.find(m => m.id === isCheckingId);
    if (!maleta) {
      setTimeout(() => setIsCheckingId(null), 0);
    } else {
      return (
        <MaletaCheckSession
          maleta={maleta}
          maletaTools={maletaTools}
          tools={tools}
          currentUser={currentUser}
          onSave={(check) => {
            setMaletaChecks([...maletaChecks, check]);
            addEvent(maleta.id, 'check', `Conferência realizada por ${check.user_name}. Observações: ${check.observacoes || 'Nenhuma'}`);
            setIsCheckingId(null);
          }}
          onBack={() => setIsCheckingId(null)}
        />
      );
    }
  }

  if (selectedMaletaId) {
    const maleta = maletas.find(m => m.id === selectedMaletaId);
    if (!maleta) {
      setTimeout(() => setSelectedMaletaId(null), 0);
    } else {
      return (
        <MaletaDetails
          maleta={maleta}
          tools={tools}
          maletaTools={maletaTools}
          setMaletaTools={setMaletaTools}
          maletaChecks={maletaChecks}
          maletaEvents={maletaEvents}
          addEvent={addEvent}
          employees={employees}
          onUpdateMaleta={(updated) => setMaletas(maletas.map(m => m.id === updated.id ? updated : m))}
          onDelete={() => handleDelete(maleta.id)}
          onBack={() => setSelectedMaletaId(null)}
          onStartCheck={() => setIsCheckingId(selectedMaletaId)}
          isGuest={isGuest}
          currentUser={currentUser}
        />
      );
    }
  }

  return (
    <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Package className="w-6 h-6 text-cyan-500" />
              Maletas e TAGs
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Gerencie maletas de ferramentas e TAGs de identificação.</p>
          </div>
          
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-72">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Busca rápida..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-cyan-500 outline-none transition-all placeholder:text-slate-400 dark:text-white"
              />
            </div>
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2.5 rounded-xl border transition-all flex items-center gap-2 text-sm font-medium ${
                showFilters 
                  ? 'bg-cyan-500 text-white border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.3)]' 
                  : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-cyan-500/50'
              }`}
              title="Filtros Avançados"
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">{showFilters ? 'Ocultar Filtros' : 'Filtros'}</span>
              {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div 
              initial={{ height: 0, opacity: 0, y: -10 }}
              animate={{ height: 'auto', opacity: 1, y: 0 }}
              exit={{ height: 0, opacity: 0, y: -10 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-5 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-inner">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Código/TAG</label>
                  <input
                    type="text"
                    placeholder="Filtrar por código..."
                    value={advancedFilters.codigo}
                    onChange={(e) => setAdvancedFilters({...advancedFilters, codigo: e.target.value})}
                    className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-cyan-500/50 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Nome</label>
                  <input
                    type="text"
                    placeholder="Filtrar por nome..."
                    value={advancedFilters.nome}
                    onChange={(e) => setAdvancedFilters({...advancedFilters, nome: e.target.value})}
                    className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-cyan-500/50 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Setor</label>
                  <input
                    type="text"
                    placeholder="Filtrar por setor..."
                    value={advancedFilters.setor}
                    onChange={(e) => setAdvancedFilters({...advancedFilters, setor: e.target.value})}
                    className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-cyan-500/50 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Responsável</label>
                  <select
                    value={advancedFilters.responsavel_id}
                    onChange={(e) => setAdvancedFilters({...advancedFilters, responsavel_id: e.target.value})}
                    className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-cyan-500/50 dark:text-white"
                  >
                    <option value="">Todos os responsáveis</option>
                    {[...employees].sort((a,b) => a.name.localeCompare(b.name)).map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
                  <button 
                    onClick={() => {
                      setAdvancedFilters({ codigo: '', nome: '', setor: '', responsavel_id: '' });
                      setSearch('');
                    }}
                    className="text-xs text-slate-500 hover:text-cyan-500 font-medium flex items-center gap-1 transition-colors"
                  >
                    <X className="w-3 h-3" /> Limpar todos os filtros
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-1">
          <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-[50px] pointer-events-none" />
            
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Tag className="w-5 h-5 text-cyan-400" />
              {isEditing ? 'Editar Maleta' : 'Nova Maleta'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Código/TAG</label>
                <input
                  type="text"
                  required
                  value={formData.codigo_tag}
                  onChange={e => {
                    setFormData({...formData, codigo_tag: e.target.value.toUpperCase()});
                    setError(null);
                  }}
                  className={`w-full p-2.5 bg-slate-50 dark:bg-slate-950 border ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-300 dark:border-slate-700 focus:ring-cyan-500'} rounded-xl text-sm outline-none transition-all dark:text-white font-mono uppercase`}
                  placeholder="EX: MAL-001"
                />
                {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Nome/Descrição</label>
                <input
                  type="text"
                  required
                  value={formData.nome}
                  onChange={e => setFormData({...formData, nome: e.target.value})}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-cyan-500 outline-none transition-all dark:text-white"
                  placeholder="Nome da maleta ou kit"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Setor/Área</label>
                <input
                  type="text"
                  required
                  value={formData.setor}
                  onChange={e => setFormData({...formData, setor: e.target.value})}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-cyan-500 outline-none transition-all dark:text-white"
                  placeholder="Qual setor a maleta pertence?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Responsável (Técnico Logístico)</label>
                <select
                  value={formData.responsavel_id}
                  onChange={e => {
                    const empId = e.target.value;
                    const emp = employees.find(emp => emp.id === empId);
                    const dept = departments.find(d => d.id === emp?.departmentId);
                    setFormData({
                      ...formData, 
                      responsavel_id: empId,
                      setor: dept ? dept.name : formData.setor
                    });
                  }}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-cyan-500 outline-none transition-all dark:text-white"
                >
                  <option value="">Nenhum</option>
                  {[...employees].sort((a, b) => sortByName(a.name, b.name)).map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>

              {!isEditing && formData.responsavel_id && (
                <div className="flex items-center gap-2 p-3 bg-cyan-500/5 border border-cyan-500/10 rounded-xl">
                  <input 
                    type="checkbox"
                    id="importTools"
                    checked={importToolsFromAssignment}
                    onChange={e => setImportToolsFromAssignment(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                  />
                  <label htmlFor="importTools" className="text-xs text-slate-600 dark:text-slate-400 font-medium cursor-pointer">
                    Importar ferramentas das atribuições do colaborador
                  </label>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Status</label>
                <select
                  value={formData.status}
                  onChange={e => setFormData({...formData, status: e.target.value as Maleta['status']})}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-cyan-500 outline-none transition-all dark:text-white"
                >
                  <option value="Ativa">Ativa</option>
                  <option value="Inativa">Inativa</option>
                  <option value="Manutenção">Manutenção</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Observações (Opcional)</label>
                <textarea
                  value={formData.observacoes}
                  onChange={e => setFormData({...formData, observacoes: e.target.value})}
                  rows={2}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-cyan-500 outline-none transition-all dark:text-white resize-none"
                  placeholder="Detalhes adicionais..."
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  disabled={isGuest}
                  className="flex-1 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-medium transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isEditing ? <CheckIcon className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                  {isEditing ? 'Salvar' : 'Adicionar'}
                </button>
                {isEditing && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(null);
                      setFormData({ codigo_tag: '', nome: '', setor: '', status: 'Ativa', responsavel_id: '', observacoes: '' });
                      setError(null);
                    }}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium transition-all"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-950/50 text-slate-400 dark:text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <th className="p-4 font-medium">Código/TAG</th>
                    <th className="p-4 font-medium">Nome / Setor</th>
                    <th className="p-4 font-medium">Responsável</th>
                    <th className="p-4 font-medium">Status</th>
                    <th className="p-4 font-medium text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  <AnimatePresence>
                    {filteredMaletas.map((maleta) => (
                      <motion.tr 
                        key={maleta.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors"
                      >
                        <td className="p-4 font-mono font-semibold text-cyan-500 text-sm">
                          {maleta.codigo_tag}
                        </td>
                        <td className="p-4">
                          <p className="text-slate-900 dark:text-slate-100 font-medium text-sm">{maleta.nome}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{maleta.setor}</p>
                        </td>
                        <td className="p-4">
                          {maleta.responsavel_id ? (
                            <div className="flex items-center gap-2">
                              <User className="w-3 h-3 text-slate-400" />
                              <span className="text-sm text-slate-600 dark:text-slate-300">
                                {employees.find(e => e.id === maleta.responsavel_id)?.name || 'Desconhecido'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 dark:text-slate-500">-</span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                            maleta.status === 'Ativa' 
                              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                              : maleta.status === 'Inativa'
                              ? 'bg-slate-500/10 text-slate-500 border-slate-500/20'
                              : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                          }`}>
                            {maleta.status}
                          </span>
                        </td>
                        <td className="p-4 text-right flex justify-end gap-1">
                          <button 
                            onClick={() => setSelectedMaletaId(maleta.id)} 
                            className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors md:opacity-0 group-hover:opacity-100 focus:opacity-100"
                            title="Ver Ferramentas"
                          >
                            <ToolIcon className="w-4 h-4" />
                          </button>
                          <button 
                            disabled={isGuest}
                            onClick={() => handleEdit(maleta)} 
                            className="p-2 text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors md:opacity-0 group-hover:opacity-100 focus:opacity-100 disabled:opacity-0"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            disabled={isGuest}
                            onClick={() => handleDelete(maleta.id)} 
                            className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors md:opacity-0 group-hover:opacity-100 focus:opacity-100 disabled:opacity-0"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </motion.tr>
                    ))}
                    {filteredMaletas.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-400 dark:text-slate-500">
                          Nenhuma maleta encontrada com os filtros atuais.
                        </td>
                      </tr>
                    )}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onCancel={() => setDeleteModal({ isOpen: false, id: null })}
        onConfirm={confirmDelete}
        title="Excluir Maleta"
        message="Tem certeza que deseja excluir esta maleta? Esta ação não pode ser desfeita."
      />
    </div>
  );
}

function CheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function MaletaDetails({
  maleta,
  tools,
  maletaTools,
  setMaletaTools,
  maletaChecks,
  maletaEvents,
  addEvent,
  employees,
  onUpdateMaleta,
  onDelete,
  onBack,
  onStartCheck,
  isGuest,
  currentUser
}: {
  maleta: Maleta;
  tools: Tool[];
  maletaTools: MaletaTool[];
  setMaletaTools: (mt: MaletaTool[]) => void;
  maletaChecks: MaletaCheck[];
  maletaEvents: MaletaEvent[];
  addEvent: (maletaId: string, type: MaletaEvent['type'], description: string) => void;
  employees: Employee[];
  onUpdateMaleta: (maleta: Maleta) => void;
  onDelete: () => void;
  onBack: () => void;
  onStartCheck: () => void;
  isGuest?: boolean;
  currentUser: FirebaseUser | null;
}) {
  const [selectedToolId, setSelectedToolId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [state, setState] = useState<'Boa' | 'Danificada' | 'Faltando'>('Boa');

  const [isTransferring, setIsTransferring] = useState(false);
  const [newResponsibleId, setNewResponsibleId] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'tools' | 'history' | 'checks' | 'full_history'>('tools');

  const linkedTools = maletaTools
    .filter(mt => mt.maleta_id === maleta.id)
    .sort((a, b) => {
      const toolA = tools.find(t => t.id === a.ferramenta_id);
      const toolB = tools.find(t => t.id === b.ferramenta_id);
      return (toolA?.name || '').localeCompare(toolB?.name || '');
    });
  const relevantChecks = maletaChecks.filter(c => c.maleta_id === maleta.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const getNextTagChar = (existingTools: MaletaTool[]) => {
    const usedChars = existingTools
      .map(t => t.tag?.split('-')[1])
      .filter(Boolean) as string[];
    
    for (let i = 0; i < 26; i++) {
      const char = String.fromCharCode(65 + i);
      if (!usedChars.includes(char)) return char;
    }
    return String.fromCharCode(65 + existingTools.length); // Fallback to expanding alphabet if > 26
  };

  const handleAddTool = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedToolId) return;

    // Check if tool already linked
    const existing = linkedTools.find(mt => mt.ferramenta_id === selectedToolId && mt.estado === state);
    
    if (existing) {
      setMaletaTools(maletaTools.map(mt => 
        mt.id === existing.id 
          ? { ...mt, quantidade: mt.quantidade + quantity }
          : mt
      ));
    } else {
      const maletaPrefix = maleta.codigo_tag.match(/\d+/)?.[0] || '000';
      const nextChar = getNextTagChar(linkedTools);

      setMaletaTools([
        ...maletaTools,
        {
          id: crypto.randomUUID(),
          maleta_id: maleta.id,
          ferramenta_id: selectedToolId,
          quantidade: quantity,
          estado: state,
          tag: `${maletaPrefix}-${nextChar}`,
          uid: currentUser?.uid || 'guest'
        }
      ]);
    }

    const tool = tools.find(t => t.id === selectedToolId);
    addEvent(maleta.id, 'tool_addition', `Adicionada ferramenta: ${tool?.name || 'Desconhecida'} (${quantity} un) - Estado: ${state}`);

    setSelectedToolId('');
    setQuantity(1);
    setState('Boa');
  };

  const handleRemoveTool = (id: string) => {
    const mt = maletaTools.find(toolLink => toolLink.id === id);
    const tool = tools.find(t => t.id === mt?.ferramenta_id);
    setMaletaTools(maletaTools.filter(mt => mt.id !== id));
    addEvent(maleta.id, 'tool_removal', `Removida ferramenta: ${tool?.name || 'Desconhecida'} (${mt?.quantidade || '?'} un)`);
  };

  const handleTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newResponsibleId) return;

    const historyEntry = {
      from_employee_id: maleta.responsavel_id || null,
      to_employee_id: newResponsibleId,
      date: new Date().toISOString()
    };

    onUpdateMaleta({
      ...maleta,
      responsavel_id: newResponsibleId,
      updated_at: new Date().toISOString(),
      transfer_history: [...(maleta.transfer_history || []), historyEntry]
    });

    const toEmployee = employees.find(e => e.id === newResponsibleId);
    addEvent(maleta.id, 'transfer', `Responsável trocado para: ${toEmployee?.name || 'Desconhecido'}`);

    setIsTransferring(false);
    setNewResponsibleId('');
  };

  const handleSyncFromAssignment = () => {
    if (isGuest || !maleta.responsavel_id) return;
    
    const employeeAssignment = assignments.find(a => a.employeeId === maleta.responsavel_id);
    const emp = employees.find(e => e.id === maleta.responsavel_id);
    const dept = departments.find(d => d.id === emp?.departmentId);
    const stdList = standardLists.find(s => s.id === dept?.standardListId);

    if (!employeeAssignment && !stdList) return;

    const maletaPrefix = maleta.codigo_tag.match(/\d+/)?.[0] || '000';
    let currentLinkedTools = [...linkedTools];
    let allMaletaTools = [...maletaTools];
    let addedCount = 0;

    // 1. Sync already assigned tools
    if (employeeAssignment) {
      employeeAssignment.assignedTools.forEach(at => {
        const alreadyLinked = currentLinkedTools.some(mt => mt.ferramenta_id === at.toolId);
        if (!alreadyLinked) {
          const nextChar = getNextTagChar(currentLinkedTools);
            const newMT: MaletaTool = {
              id: crypto.randomUUID(),
              maleta_id: maleta.id,
              ferramenta_id: at.toolId,
              quantidade: at.quantity,
              estado: 'Boa',
              tag: `${maletaPrefix}-${nextChar}`,
              uid: currentUser?.uid || 'guest'
            };
          allMaletaTools.push(newMT);
          currentLinkedTools.push(newMT);
          addedCount++;
        }
      });
    }

    // 2. Sync missing tools from standard list
    if (stdList) {
      stdList.tools.forEach(stdTool => {
        const assigned = employeeAssignment?.assignedTools.find(at => at.toolId === stdTool.toolId);
        const assignedQty = assigned ? assigned.quantity : 0;
        
        if (assignedQty < stdTool.quantity) {
          const alreadyLinkedAsMissing = currentLinkedTools.some(mt => mt.ferramenta_id === stdTool.toolId && mt.estado === 'Faltando');
          if (!alreadyLinkedAsMissing) {
            const nextChar = getNextTagChar(currentLinkedTools);
            const newMT: MaletaTool = {
              id: crypto.randomUUID(),
              maleta_id: maleta.id,
              ferramenta_id: stdTool.toolId,
              quantidade: stdTool.quantity - assignedQty,
              estado: 'Faltando',
              tag: `${maletaPrefix}-${nextChar}`,
              uid: currentUser?.uid || 'guest'
            };
            allMaletaTools.push(newMT);
            currentLinkedTools.push(newMT);
            addedCount++;
          }
        }
      });
    }

    if (addedCount > 0) {
      setMaletaTools(allMaletaTools);
      addEvent(maleta.id, 'tool_addition', `Sincronizadas ${addedCount} ferramentas (atribuídas e pendentes) das listas do colaborador.`);
    }
  };

  const responsibleEmployee = employees.find(e => e.id === maleta.responsavel_id);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Package className="w-6 h-6 text-cyan-500" />
              Detalhes da Maleta
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1 flex flex-col md:flex-row md:items-center gap-2">
              <span><span className="font-mono text-cyan-500 font-semibold">{maleta.codigo_tag}</span> - {maleta.nome}</span>
              <span className="hidden md:inline text-slate-300 dark:text-slate-600">•</span>
              <span className="flex items-center gap-1">
                <User className="w-4 h-4" /> 
                {responsibleEmployee ? responsibleEmployee.name : 'Sem responsável'}
              </span>
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button
            onClick={onStartCheck}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] flex items-center gap-2"
          >
            <ClipboardCheck className="w-5 h-5" /> Conferir Maleta
          </button>
          {!isGuest && (
            <button
              onClick={onDelete}
              className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-medium rounded-xl transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" /> Excluir
            </button>
          )}
          {!isGuest && (
            <button
              onClick={() => setIsTransferring(true)}
              className="px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-medium rounded-xl transition-colors flex items-center gap-2"
            >
              <User className="w-4 h-4" /> Transferir
            </button>
          )}
        </div>
      </div>

      {isTransferring && (
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-200 dark:border-blue-800/50 flex flex-col md:flex-row gap-4 items-end animate-in fade-in slide-in-from-top-2">
          <div className="flex-1 w-full">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Novo Responsável
            </label>
            <select
              value={newResponsibleId}
              onChange={e => setNewResponsibleId(e.target.value)}
              className="w-full p-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm outline-none transition-all dark:text-white"
            >
              <option value="">Selecione o colaborador...</option>
              {[...employees].sort((a,b) => a.name.localeCompare(b.name)).map(emp => (
                <option key={emp.id} value={emp.id} disabled={emp.id === maleta.responsavel_id}>{emp.name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <button
              onClick={handleTransfer}
              disabled={!newResponsibleId}
              className="flex-1 md:flex-none px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-all focus:ring-2 focus:ring-blue-500 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
            >
              <Save className="w-4 h-4" /> Confirmar
            </button>
            <button
              onClick={() => setIsTransferring(false)}
              className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium transition-all focus:ring-2 focus:ring-slate-400 flex items-center justify-center"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveSubTab('tools')}
          className={`px-4 py-2 text-sm font-medium transition-all relative ${activeSubTab === 'tools' ? 'text-cyan-500' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
        >
          Ferramentas
          {activeSubTab === 'tools' && <motion.div layoutId="subtab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-500" />}
        </button>
        <button
          onClick={() => setActiveSubTab('checks')}
          className={`px-4 py-2 text-sm font-medium transition-all relative ${activeSubTab === 'checks' ? 'text-cyan-500' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
        >
          Histórico de Conferências
          {activeSubTab === 'checks' && <motion.div layoutId="subtab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-500" />}
        </button>
        <button
          onClick={() => setActiveSubTab('history')}
          className={`px-4 py-2 text-sm font-medium transition-all relative ${activeSubTab === 'history' ? 'text-cyan-500' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
        >
          Histórico de Transferências
          {activeSubTab === 'history' && <motion.div layoutId="subtab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-500" />}
        </button>
        <button
          onClick={() => setActiveSubTab('full_history')}
          className={`px-4 py-2 text-sm font-medium transition-all relative ${activeSubTab === 'full_history' ? 'text-cyan-500' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
        >
          Linha do Tempo
          {activeSubTab === 'full_history' && <motion.div layoutId="subtab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-500" />}
        </button>
      </div>

      {activeSubTab === 'tools' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
               <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl" />
               <div className="flex items-center justify-between mb-4">
                 <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                   <PlusCircle className="w-5 h-5 text-cyan-400" />
                   Adicionar Ferramenta
                 </h3>
                 {maleta.responsavel_id && !isGuest && (
                   <button 
                    onClick={handleSyncFromAssignment}
                    className="p-2 text-cyan-500 hover:bg-cyan-500/10 rounded-lg transition-all"
                    title="Sincronizar das Atribuições"
                   >
                     <RefreshCw className="w-4 h-4" />
                   </button>
                 )}
               </div>
              
              <form onSubmit={handleAddTool} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Ferramenta</label>
                  <select
                    required
                    value={selectedToolId}
                    onChange={e => setSelectedToolId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm outline-none transition-all dark:text-white"
                  >
                    <option value="">Selecione...</option>
                    {[...tools].sort((a,b) => a.name.localeCompare(b.name)).map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.brand})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Quantidade</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={quantity}
                    onChange={e => setQuantity(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm outline-none transition-all dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Estado</label>
                  <select
                    required
                    value={state}
                    onChange={e => setState(e.target.value as 'Boa' | 'Danificada' | 'Faltando')}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm outline-none transition-all dark:text-white"
                  >
                    <option value="Boa">Boa</option>
                    <option value="Danificada">Danificada</option>
                    <option value="Faltando">Faltando</option>
                  </select>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isGuest}
                    className="w-full px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-medium transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Plus className="w-5 h-5" /> Adicionar
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-950/50 text-slate-400 dark:text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <th className="p-4 font-medium">Equipamento/TAG</th>
                    <th className="p-4 font-medium">Quantidade</th>
                    <th className="p-4 font-medium">Estado</th>
                    <th className="p-4 font-medium text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  <AnimatePresence>
                    {linkedTools.map(mt => {
                      const tool = tools.find(t => t.id === mt.ferramenta_id);
                      return (
                        <motion.tr 
                          key={mt.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors"
                        >
                          <td className="p-4">
                            <div className="flex items-center gap-2 mb-1">
                              {mt.tag && (
                                <span className="text-[10px] font-bold bg-cyan-500/10 text-cyan-500 px-1.5 py-0.5 rounded border border-cyan-500/20 tracking-wider font-mono">
                                  {mt.tag}
                                </span>
                              )}
                              <p className="font-medium text-sm text-slate-900 dark:text-white">
                                {tool ? tool.name : 'Desconhecida'}
                              </p>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {tool ? tool.brand : '-'}
                            </p>
                          </td>
                          <td className="p-4">
                            <span className="font-mono bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg text-sm text-slate-700 dark:text-slate-300 font-medium border border-slate-200 dark:border-slate-700">
                              {mt.quantidade} {mt.quantidade === 1 ? 'un' : 'uns'}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                              mt.estado === 'Boa' 
                                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                                : mt.estado === 'Danificada'
                                ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                : 'bg-red-500/10 text-red-500 border-red-500/20'
                            }`}>
                              {mt.estado}
                            </span>
                          </td>
                          <td className="p-4 text-right flex justify-end">
                            <button 
                              disabled={isGuest}
                              onClick={() => handleRemoveTool(mt.id)} 
                              className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 disabled:opacity-0"
                              title="Remover Ferramenta"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </motion.tr>
                      );
                    })}
                    {linkedTools.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-slate-400 dark:text-slate-500">
                          Nenhuma ferramenta vinculada a esta maleta.
                        </td>
                      </tr>
                    )}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'checks' && (
        <div className="animate-in fade-in duration-300">
          <MaletaCheckHistory 
            checks={relevantChecks}
            tools={tools}
          />
        </div>
      )}

      {activeSubTab === 'history' && (
        <div className="animate-in fade-in duration-300">
          <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <ul className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {maleta.transfer_history && maleta.transfer_history.length > 0 ? (
                [...maleta.transfer_history].reverse().map((th, index) => {
                  const fromEmployee = employees.find(e => e.id === th.from_employee_id);
                  const toEmployee = employees.find(e => e.id === th.to_employee_id);
                  return (
                    <li key={index} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                          <User className="w-4 h-4 text-slate-500" />
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                            {fromEmployee ? fromEmployee.name : 'Sem responsável'}
                          </span>
                          <ArrowRight className="w-4 h-4 text-slate-400 mx-1" />
                          <span className="text-sm font-medium text-slate-900 dark:text-white">
                            {toEmployee ? toEmployee.name : 'Desconhecido'}
                          </span>
                        </div>
                      </div>
                      <div className="text-xs text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md font-mono">
                        {new Date(th.date).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                      </div>
                    </li>
                  );
                })
              ) : (
                <li className="p-8 text-center text-slate-400 dark:text-slate-500">
                  Nenhum histórico de transferência registrado.
                </li>
              )}
            </ul>
          </div>
        </div>
      )}

      {activeSubTab === 'full_history' && (
        <div className="animate-in fade-in duration-300">
          <MaletaEventHistory 
            maletaId={maleta.id}
            events={maletaEvents}
          />
        </div>
      )}
    </div>
  );
}

function MaletaCheckSession({
  maleta,
  maletaTools,
  tools,
  currentUser,
  onSave,
  onBack
}: {
  maleta: Maleta;
  maletaTools: MaletaTool[];
  tools: Tool[];
  currentUser: FirebaseUser | null;
  onSave: (check: MaletaCheck) => void;
  onBack: () => void;
}) {
  const linkedTools = maletaTools
    .filter(mt => mt.maleta_id === maleta.id)
    .sort((a, b) => {
      const toolA = tools.find(t => t.id === a.ferramenta_id);
      const toolB = tools.find(t => t.id === b.ferramenta_id);
      return (toolA?.name || '').localeCompare(toolB?.name || '');
    });
  
  const [items, setItems] = useState<MaletaCheckItem[]>(
    linkedTools.map(mt => ({
      toolId: mt.ferramenta_id,
      expectedQuantity: mt.quantidade,
      observedQuantity: mt.quantidade,
      status: 'OK' as const,
      notes: ''
    }))
  );
  
  const [observacoes, setObservacoes] = useState('');

  const handleStatusChange = (index: number, status: 'OK' | 'Faltando' | 'Danificada') => {
    const newItems = [...items];
    newItems[index].status = status;
    setItems(newItems);
  };

  const handleQuantityChange = (index: number, qty: number) => {
    const newItems = [...items];
    newItems[index].observedQuantity = qty;
    setItems(newItems);
  };

  const handleSave = () => {
    const check: MaletaCheck = {
      id: crypto.randomUUID(),
      maleta_id: maleta.id,
      checked_by_id: currentUser?.uid || 'anonymous',
      user_name: currentUser?.displayName || 'Desconhecido',
      date: new Date().toISOString(),
      items: items,
      observacoes: observacoes,
      uid: currentUser?.uid || 'guest'
    };
    onSave(check);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ClipboardCheck className="w-6 h-6 text-emerald-500" />
              Conferência de Maleta
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              Conferindo: <span className="font-mono text-cyan-500 font-semibold">{maleta.codigo_tag}</span> - {maleta.nome}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-950/50 text-slate-400 dark:text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <th className="p-4 font-medium">Item/Ferramenta</th>
                <th className="p-4 font-medium text-center">Quant.</th>
                <th className="p-4 font-medium text-center">Status</th>
                <th className="p-4 font-medium text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {items.map((item, index) => {
                const tool = tools.find(t => t.id === item.toolId);
                return (
                  <tr key={index} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                    <td className="p-4">
                      <p className="font-medium text-sm text-slate-900 dark:text-white">{tool?.name || 'Desconhecida'}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{tool?.brand || '-'}</p>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-sm font-mono text-slate-400">{item.expectedQuantity} / </span>
                        <input 
                          type="number"
                          min="0"
                          value={item.observedQuantity}
                          onChange={(e) => handleQuantityChange(index, Number(e.target.value))}
                          className="w-16 p-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-center text-sm dark:text-white"
                        />
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        item.status === 'OK' ? 'bg-emerald-500/10 text-emerald-500' :
                        item.status === 'Faltando' ? 'bg-red-500/10 text-red-500' :
                        'bg-amber-500/10 text-amber-500'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => handleStatusChange(index, 'OK')}
                          className={`p-2 rounded-lg transition-all ${item.status === 'OK' ? 'bg-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.4)]' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-emerald-500'}`}
                          title="OK"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleStatusChange(index, 'Faltando')}
                          className={`p-2 rounded-lg transition-all ${item.status === 'Faltando' ? 'bg-red-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.4)]' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-red-500'}`}
                          title="Faltando"
                        >
                          <AlertCircle className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleStatusChange(index, 'Danificada')}
                          className={`p-2 rounded-lg transition-all ${item.status === 'Danificada' ? 'bg-amber-500 text-white shadow-[0_0_10px_rgba(245,158,11,0.4)]' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-amber-500'}`}
                          title="Danificada"
                        >
                          <HelpCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {items.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-10 text-center text-slate-500">
                    Não há ferramentas cadastradas para conferir.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Observações da Conferência</label>
        <textarea
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
          rows={3}
          className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all dark:text-white"
          placeholder="Ex: Todas as ferramentas conferidas, porém o paquímetro apresenta desgaste..."
        />
      </div>

      <div className="flex justify-end gap-3">
        <button
          onClick={onBack}
          className="px-6 py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium transition-all"
        >
          Cancelar
        </button>
        <button
          onClick={handleSave}
          disabled={items.length === 0}
          className="px-8 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:opacity-50"
        >
          Salvar Conferência
        </button>
      </div>
    </div>
  );
}

function MaletaCheckHistory({
  checks,
  tools
}: {
  checks: MaletaCheck[];
  tools: Tool[];
}) {
  const [expandedCheckId, setExpandedCheckId] = useState<string | null>(null);

  if (checks.length === 0) {
    return (
      <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl p-10 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
        <ClipboardCheck className="w-12 h-12 text-slate-300 dark:text-slate-800 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-900 dark:text-white">Nenhuma conferência realizada</h3>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">O histórico de inspeções aparecerá aqui.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {checks.map((check) => {
        const isExpanded = expandedCheckId === check.id;
        const faltantesCount = check.items.filter(i => i.status === 'Faltando').length;
        const danificadasCount = check.items.filter(i => i.status === 'Danificada').length;

        return (
          <div 
            key={check.id}
            className={`bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border ${isExpanded ? 'border-cyan-500' : 'border-slate-200 dark:border-slate-800'} rounded-2xl overflow-hidden transition-all duration-300 shadow-sm`}
          >
            <div 
              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
              onClick={() => setExpandedCheckId(isExpanded ? null : check.id)}
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${faltantesCount > 0 ? 'bg-red-500/10 text-red-500' : danificadasCount > 0 ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                  <ClipboardCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white">Conferência</span>
                    <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">
                      {new Date(check.date).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                    <User className="w-3 h-3" />
                    <span>Realizado por: {check.user_name}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  {faltantesCount > 0 && <span className="px-2 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full uppercase">{faltantesCount} Faltando</span>}
                  {danificadasCount > 0 && <span className="px-2 py-0.5 bg-amber-500 text-white text-[10px] font-bold rounded-full uppercase">{danificadasCount} Danificada</span>}
                  {faltantesCount === 0 && danificadasCount === 0 && <span className="px-2 py-0.5 bg-emerald-500 text-white text-[10px] font-bold rounded-full uppercase italic">Tudo OK</span>}
                </div>
                <ArrowRight className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : 'rotate-0'}`} />
              </div>
            </div>

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-slate-100 dark:border-slate-800 px-4 py-6"
                >
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Detalhamento dos Itens</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {check.items.map((item, idx) => {
                          const tool = tools.find(t => t.id === item.toolId);
                          return (
                            <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{tool?.name || 'Desconhecida'}</p>
                                <p className="text-[10px] text-slate-500 font-mono tracking-tighter uppercase">{item.observedQuantity} de {item.expectedQuantity} UNIDADES</p>
                              </div>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 ${
                                item.status === 'OK' ? 'bg-emerald-500/10 text-emerald-500' :
                                item.status === 'Faltando' ? 'bg-red-500/10 text-red-500' :
                                'bg-amber-500/10 text-amber-500'
                              }`}>
                                {item.status}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {check.observacoes && (
                      <div className="bg-slate-100 dark:bg-slate-800/50 p-4 rounded-xl border-l-4 border-cyan-500">
                        <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Notas da Conferência</h4>
                        <p className="text-sm text-slate-700 dark:text-slate-300 italic">&quot;{check.observacoes}&quot;</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

function MaletaEventHistory({
  maletaId,
  events
}: {
  maletaId: string;
  events: MaletaEvent[];
}) {
  const filteredEvents = events
    .filter(e => e.maleta_id === maletaId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (filteredEvents.length === 0) {
    return (
      <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl p-10 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
        <History className="w-12 h-12 text-slate-300 dark:text-slate-800 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-900 dark:text-white">Nenhum evento registrado</h3>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">A linha do tempo da maleta aparecerá aqui.</p>
      </div>
    );
  }

  const getEventIcon = (type: MaletaEvent['type']) => {
    switch (type) {
      case 'creation': return <PlusCircle className="w-4 h-4 text-emerald-500" />;
      case 'edition': return <FileEdit className="w-4 h-4 text-cyan-500" />;
      case 'transfer': return <User className="w-4 h-4 text-blue-500" />;
      case 'tool_addition': return <PlusCircle className="w-4 h-4 text-cyan-400" />;
      case 'tool_removal': return <MinusCircle className="w-4 h-4 text-red-400" />;
      case 'check': return <ClipboardCheck className="w-4 h-4 text-emerald-400" />;
      default: return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  const getEventLabel = (type: MaletaEvent['type']) => {
    switch (type) {
      case 'creation': return 'Criação';
      case 'edition': return 'Edição';
      case 'transfer': return 'Transferência';
      case 'tool_addition': return 'Adição de Ferramenta';
      case 'tool_removal': return 'Remoção de Ferramenta';
      case 'check': return 'Conferência';
      default: return 'Evento';
    }
  };

  return (
    <div className="relative">
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-800 -z-10" />
      <div className="space-y-6">
        {filteredEvents.map((event) => (
          <div key={event.id} className="flex gap-6 relative">
            <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 flex items-center justify-center flex-shrink-0 relative z-10 shadow-sm">
              {getEventIcon(event.type)}
            </div>
            
            <div className="flex-1 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase rounded tracking-wider">
                    {getEventLabel(event.type)}
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">
                    {new Date(event.date).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <User className="w-3 h-3" />
                  <span>{event.user_name}</span>
                </div>
              </div>
              
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed italic">
                {event.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
