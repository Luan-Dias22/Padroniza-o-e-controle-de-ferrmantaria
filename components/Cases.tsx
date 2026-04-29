import { useState, useMemo } from 'react';
import { User } from 'firebase/auth';
import { Case, CaseInspection, CaseLog, Tool, Employee, StandardToolList } from '@/lib/data';
import { 
  Plus, Edit2, Trash2, Search, Briefcase, History, ClipboardCheck, 
  UserPlus, PackagePlus, PackageMinus, Info, CheckCircle2, AlertTriangle, 
  XCircle, ArrowRightLeft, Clock, Filter, Users, Wrench 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ConfirmModal from './ConfirmModal';

interface CasesProps {
  cases: Case[];
  setCases: (cases: Case[]) => void;
  inspections: CaseInspection[];
  setInspections: (inspections: CaseInspection[]) => void;
  logs: CaseLog[];
  setLogs: (logs: CaseLog[]) => void;
  tools: Tool[];
  employees: Employee[];
  standardLists: StandardToolList[];
  currentUser: User | null;
  isGuest?: boolean;
}

export default function Cases({
  cases, setCases,
  inspections, setInspections,
  logs, setLogs,
  tools, employees, standardLists,
  currentUser,
  isGuest = false
}: CasesProps) {
  const [activeView, setActiveView] = useState<'list' | 'details' | 'form' | 'inspection'>('list');
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todas');
  
  // Form States
  const [editingCase, setEditingCase] = useState<Case | null>(null);
  const [caseForm, setCaseForm] = useState({
    tag: '',
    name: '',
    sector: '',
    status: 'Ativa' as const,
    responsibleId: '',
    notes: ''
  });
  
  // Inspection State
  const [inspectionData, setInspectionData] = useState<{
    items: { itemTag: string, toolId: string, status: 'OK' | 'Faltando' | 'Danificada' }[],
    notes: string
  }>({ items: [], notes: '' });

  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    caseId: string;
  }>({ isOpen: false, caseId: '' });

  const getNextTag = (caseTag: string, currentTools: { itemTag: string }[]) => {
    const parts = caseTag.split('-');
    const tagBase = parts.length > 1 ? parts[parts.length - 1] : caseTag;
    
    const getSuffix = (n: number): string => {
      let suffix = '';
      let num = n;
      while (num >= 0) {
        suffix = String.fromCharCode((num % 26) + 65) + suffix;
        num = Math.floor(num / 26) - 1;
      }
      return suffix;
    };

    const existingTags = new Set(currentTools.map(t => t.itemTag));
    let index = 0;
    let newTag = `${tagBase}-${getSuffix(index)}`;
    
    while (existingTags.has(newTag)) {
      index++;
      newTag = `${tagBase}-${getSuffix(index)}`;
    }
    return newTag;
  };

  const selectedCase = useMemo(() => cases.find(c => c.id === selectedCaseId) || null, [cases, selectedCaseId]);

  const filteredCases = useMemo(() => {
    return cases.filter(c => {
      const matchesSearch = 
        c.tag.toLowerCase().includes(search.toLowerCase()) ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.sector.toLowerCase().includes(search.toLowerCase()) ||
        employees.find(e => e.id === c.responsibleId)?.name.toLowerCase().includes(search.toLowerCase());
      
      const matchesStatus = statusFilter === 'Todas' || c.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [cases, search, statusFilter, employees]);

  const addLog = (caseId: string, type: string, description: string, details?: any) => {
    const newLog: CaseLog = {
      id: crypto.randomUUID(),
      caseId,
      type,
      description,
      details,
      date: new Date().toISOString()
    };
    setLogs([...logs, newLog]);
  };

  const handleCreateOrUpdateCase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseForm.tag || !caseForm.name || !caseForm.responsibleId) return;

    if (editingCase) {
      const updatedCase = { ...editingCase, ...caseForm };
      setCases(cases.map(c => c.id === editingCase.id ? updatedCase : c));
      
      if (editingCase.responsibleId !== caseForm.responsibleId) {
        const oldEmp = employees.find(e => e.id === editingCase.responsibleId)?.name;
        const newEmp = employees.find(e => e.id === caseForm.responsibleId)?.name;
        addLog(editingCase.id, 'transfer', `Troca de responsável: ${oldEmp} -> ${newEmp}`, { oldResponsibleId: editingCase.responsibleId, newResponsibleId: caseForm.responsibleId });
      }
      
      addLog(editingCase.id, 'edit', 'Informações da maleta atualizadas');
    } else {
      const newId = crypto.randomUUID();
      const newCase: Case = {
        id: newId,
        ...caseForm,
        tools: []
      };
      setCases([...cases, newCase]);
      addLog(newId, 'creation', `Maleta ${newCase.tag} criada e atribuída a ${employees.find(e => e.id === newCase.responsibleId)?.name}`);
    }
    
    setActiveView('list');
    setEditingCase(null);
    setCaseForm({ tag: '', name: '', sector: '', status: 'Ativa', responsibleId: '', notes: '' });
  };

  const handleDeleteCase = (id: string) => {
    setCases(cases.filter(c => c.id !== id));
    setLogs(logs.filter(l => l.caseId !== id));
    setInspections(inspections.filter(i => i.caseId !== id));
    setDeleteModal({ isOpen: false, caseId: '' });
    setActiveView('list');
  };

  const startInspection = (c: Case) => {
    setInspectionData({
      items: c.tools.map(t => ({ itemTag: t.itemTag, toolId: t.toolId, status: 'OK' })),
      notes: ''
    });
    setSelectedCaseId(c.id);
    setActiveView('inspection');
  };

  const submitInspection = () => {
    if (!selectedCase || !currentUser) return;
    
    const newInspection: CaseInspection = {
      id: crypto.randomUUID(),
      caseId: selectedCase.id,
      date: new Date().toISOString(),
      inspectorId: currentUser.uid,
      inspectorName: currentUser.displayName || currentUser.email || 'Operador',
      items: inspectionData.items,
      notes: inspectionData.notes,
    };
    
    setInspections([...inspections, newInspection]);
    addLog(selectedCase.id, 'inspection', 'Conferência de maleta realizada', { inspectionId: newInspection.id });
    
    setActiveView('details');
  };

  const addToolToCase = (toolId: string) => {
    if (!selectedCase) return;
    
    const itemTag = getNextTag(selectedCase.tag, selectedCase.tools);
    const newTools = [...selectedCase.tools, { toolId, itemTag }];
    
    const toolName = tools.find(t => t.id === toolId)?.name;
    setCases(cases.map(c => c.id === selectedCase.id ? { ...c, tools: newTools } : c));
    addLog(selectedCase.id, 'tool_add', `Ferramenta adicionada: ${toolName} (${itemTag})`);
  };

  const removeToolFromCase = (itemTag: string) => {
    if (!selectedCase) return;
    const item = selectedCase.tools.find(t => t.itemTag === itemTag);
    if (!item) return;

    const newTools = selectedCase.tools.filter(t => t.itemTag !== itemTag);
    const toolName = tools.find(t => t.id === item.toolId)?.name;
    setCases(cases.map(c => c.id === selectedCase.id ? { ...c, tools: newTools } : c));
    addLog(selectedCase.id, 'tool_remove', `Ferramenta removida: ${toolName} (${itemTag})`);
  };

  const addKitToCase = (kitId: string) => {
    if (!selectedCase) return;
    const kit = standardLists.find(k => k.id === kitId);
    if (!kit) return;
    
    let currentNewTools = [...selectedCase.tools];
    kit.tools.forEach(kt => {
      // Create separate entries for each quantity in the kit
      for (let i = 0; i < kt.quantity; i++) {
        const itemTag = getNextTag(selectedCase.tag, currentNewTools);
        currentNewTools.push({ toolId: kt.toolId, itemTag });
      }
    });

    setCases(cases.map(c => c.id === selectedCase.id ? { ...c, tools: currentNewTools } : c));
    addLog(selectedCase.id, 'kit_add', `Kit standard adicionado: ${kit.name}`);
  };

  return (
    <div className="space-y-6">
      <ConfirmModal 
        isOpen={deleteModal.isOpen}
        title="Excluir Maleta"
        message="Tem certeza que deseja excluir esta maleta? Todo o histórico e conferências serão perdidos."
        onConfirm={() => handleDeleteCase(deleteModal.caseId)}
        onCancel={() => setDeleteModal({ isOpen: false, caseId: '' })}
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-cyan-500/10 border border-cyan-500/30 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.2)]">
            <Briefcase className="w-5 h-5 text-cyan-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Gestão de Maletas</h1>
        </div>
        
        {activeView === 'list' && !isGuest && (
          <button 
            onClick={() => {
              setCaseForm({ tag: '', name: '', sector: '', status: 'Ativa', responsibleId: '', notes: '' });
              setEditingCase(null);
              setActiveView('form');
            }}
            className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-slate-900 dark:text-white rounded-xl hover:from-cyan-500 hover:to-blue-500 flex items-center gap-2 shadow-[0_0_10px_rgba(6,182,212,0.2)] transition-all"
          >
            <Plus className="w-4 h-4" />
            Nova Maleta
          </button>
        )}
        
        {activeView !== 'list' && (
          <button 
            onClick={() => setActiveView('list')}
            className="text-sm text-slate-400 hover:text-slate-900 dark:text-slate-300 flex items-center gap-1 transition-colors"
          >
            <Clock className="w-4 h-4" /> Voltar para Lista
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {activeView === 'list' && (
          <motion.div 
            key="list"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-md p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Buscar por TAG, nome, setor ou colaborador..." 
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
                />
              </div>
              <div className="flex gap-2">
                <Filter className="w-4 h-4 mt-2.5 text-slate-400" />
                <select 
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
                >
                  <option value="Todas">Todas os Status</option>
                  <option value="Ativa">Ativa</option>
                  <option value="Inativa">Inativa</option>
                  <option value="Manutenção">Manutenção</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCases.map(c => (
                <motion.div 
                  key={c.id}
                  whileHover={{ y: -4 }}
                  className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-800 p-5 group cursor-pointer"
                  onClick={() => { setSelectedCaseId(c.id); setActiveView('details'); }}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="text-[10px] font-mono text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded-full uppercase tracking-widest">{c.tag}</span>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">{c.name}</h3>
                      <p className="text-xs text-slate-400">{c.sector}</p>
                    </div>
                    <div className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${
                      c.status === 'Ativa' ? 'bg-emerald-500/10 text-emerald-400' :
                      c.status === 'Inativa' ? 'bg-red-500/10 text-red-400' :
                      'bg-amber-500/10 text-amber-400'
                    }`}>
                      {c.status}
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <Users className="w-4 h-4" />
                      <span>{employees.find(e => e.id === c.responsibleId)?.name || 'Sem responsável'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <Wrench className="w-4 h-4" />
                      <span>{c.tools.length} Ferramentas</span>
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => { e.stopPropagation(); startInspection(c); }}
                      className="text-xs text-cyan-400 hover:underline flex items-center gap-1 font-medium"
                    >
                      <ClipboardCheck className="w-3.5 h-3.5" /> Conferir
                    </button>
                    <button className="text-xs text-slate-500 hover:text-white flex items-center gap-1">
                      Ver Detalhes <Info className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>

            {filteredCases.length === 0 && (
              <div className="text-center py-20 bg-white/30 dark:bg-slate-900/30 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800">
                <Briefcase className="w-12 h-12 text-slate-600 mx-auto mb-4 opacity-20" />
                <p className="text-slate-500">Nenhuma maleta encontrada com os filtros atuais.</p>
              </div>
            )}
          </motion.div>
        )}

        {activeView === 'form' && (
          <motion.div 
            key="form"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-800 p-8 max-w-2xl mx-auto"
          >
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">
              {editingCase ? 'Editar Maleta' : 'Cadastrar Nova Maleta'}
            </h2>
            <form onSubmit={handleCreateOrUpdateCase} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-2 uppercase tracking-widest">Código TAG *</label>
                <input 
                  type="text" 
                  value={caseForm.tag}
                  onChange={e => setCaseForm({...caseForm, tag: e.target.value.toUpperCase()})}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-cyan-500/50"
                  placeholder="MAL-001"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-2 uppercase tracking-widest">Nome / Kit *</label>
                <input 
                  type="text" 
                  value={caseForm.name}
                  onChange={e => setCaseForm({...caseForm, name: e.target.value})}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-cyan-500/50"
                  placeholder="Ex: Kit Manutenção III"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-2 uppercase tracking-widest">Setor *</label>
                <input 
                  type="text" 
                  value={caseForm.sector}
                  onChange={e => setCaseForm({...caseForm, sector: e.target.value})}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-cyan-500/50"
                  placeholder="Laboratório 2"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-2 uppercase tracking-widest">Status *</label>
                <select 
                  value={caseForm.status}
                  onChange={e => setCaseForm({...caseForm, status: e.target.value as any})}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-cyan-500/50"
                >
                  <option value="Ativa">Ativa</option>
                  <option value="Inativa">Inativa</option>
                  <option value="Manutenção">Manutenção</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-mono text-slate-400 mb-2 uppercase tracking-widest">Responsável Atual *</label>
                <select 
                  value={caseForm.responsibleId}
                  onChange={e => {
                    const empId = e.target.value;
                    const emp = employees.find(emp => emp.id === empId);
                    const dept = departments.find(d => d.id === emp?.departmentId);
                    setCaseForm({
                      ...caseForm, 
                      responsibleId: empId,
                      sector: dept ? dept.name : caseForm.sector
                    });
                  }}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-cyan-500/50"
                  required
                >
                  <option value="">Selecione um colaborador</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.employeeId})</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-mono text-slate-400 mb-2 uppercase tracking-widest">Observações</label>
                <textarea 
                  value={caseForm.notes}
                  onChange={e => setCaseForm({...caseForm, notes: e.target.value})}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-cyan-500/50 min-h-[100px]"
                />
              </div>
              
              <div className="md:col-span-2 flex justify-end gap-3 mt-4">
                <button 
                  type="button" 
                  onClick={() => setActiveView('list')}
                  className="px-6 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-all font-medium"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2 bg-cyan-600 text-slate-900 dark:text-white rounded-xl text-sm hover:bg-cyan-50 shadow-lg shadow-cyan-900/20 transition-all font-medium"
                >
                  {editingCase ? 'Salvar Alterações' : 'Criar Maleta'}
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {activeView === 'details' && selectedCase && (
          <motion.div 
            key="details"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.1)]">
                      <Briefcase className="w-8 h-8 text-cyan-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded-full uppercase tracking-widest">{selectedCase.tag}</span>
                        <div className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                          selectedCase.status === 'Ativa' ? 'bg-emerald-500/10 text-emerald-400' :
                          selectedCase.status === 'Inativa' ? 'bg-red-500/10 text-red-400' :
                          'bg-amber-500/10 text-amber-400'
                        }`}>
                          {selectedCase.status}
                        </div>
                      </div>
                      <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{selectedCase.name}</h2>
                      <p className="text-slate-400 text-sm mt-1">Setor: {selectedCase.sector}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        setCaseForm({
                          tag: selectedCase.tag,
                          name: selectedCase.name,
                          sector: selectedCase.sector,
                          status: selectedCase.status,
                          responsibleId: selectedCase.responsibleId,
                          notes: selectedCase.notes || ''
                        });
                        setEditingCase(selectedCase);
                        setActiveView('form');
                      }}
                      className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-all"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {!isGuest && (
                      <button 
                        onClick={() => setDeleteModal({ isOpen: true, caseId: selectedCase.id })}
                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 p-4 bg-slate-50/50 dark:bg-slate-950/50 rounded-2xl border border-slate-200/50 dark:border-slate-800/50">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">Responsável</span>
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-200">
                      {employees.find(e => e.id === selectedCase.responsibleId)?.name || 'N/A'}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">Última Conferência</span>
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-200">
                      {inspections.filter(i => i.caseId === selectedCase.id).sort((a,b) => b.date.localeCompare(a.date))[0]
                        ? new Date(inspections.filter(i => i.caseId === selectedCase.id).sort((a,b) => b.date.localeCompare(a.date))[0].date).toLocaleDateString('pt-BR')
                        : 'Nunca conferida'}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button 
                      onClick={() => startInspection(selectedCase)}
                      className="mt-2 w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-900 dark:text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-cyan-900/20"
                    >
                      Conferir Maleta
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                  <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-cyan-400" /> Ferramentas Vinculadas
                  </h3>
                  {!isGuest && (
                    <div className="flex gap-2">
                      <div className="relative group">
                        <button className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-[10px] font-bold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-200 transition-all flex items-center gap-1 uppercase tracking-widest">
                          <Plus className="w-3 h-3" /> Add Ferramenta
                        </button>
                        <div className="absolute right-0 top-full mt-2 w-64 max-h-60 overflow-y-auto bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 p-2 hidden group-hover:block transition-all custom-scrollbar">
                           {tools.filter(t => !selectedCase.tools.find(st => st.toolId === t.id)).length === 0 ? (
                             <p className="p-3 text-[10px] text-slate-500 text-center">Todas ferramentas já no kit.</p>
                           ) : (
                             tools.filter(t => !selectedCase.tools.find(st => st.toolId === t.id)).map(t => (
                               <button 
                                key={t.id}
                                onClick={() => addToolToCase(t.id)}
                                className="w-full text-left p-2 hover:bg-cyan-500/10 text-xs rounded-lg flex items-center justify-between text-slate-300"
                               >
                                 {t.name}
                                 <Plus className="w-3 h-3 text-cyan-400" />
                               </button>
                             ))
                           )}
                        </div>
                      </div>

                      <div className="relative group">
                        <button className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-[10px] font-bold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-200 transition-all flex items-center gap-1 uppercase tracking-widest">
                          <PackagePlus className="w-3 h-3" /> Add Kit Padrão
                        </button>
                        <div className="absolute right-0 top-full mt-2 w-64 max-h-60 overflow-y-auto bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 p-2 hidden group-hover:block transition-all custom-scrollbar">
                           {standardLists.map(k => (
                             <button 
                              key={k.id}
                              onClick={() => addKitToCase(k.id)}
                              className="w-full text-left p-2 hover:bg-cyan-500/10 text-xs rounded-lg flex items-center justify-between text-slate-300"
                             >
                               {k.name}
                               <Plus className="w-3 h-3 text-cyan-400" />
                             </button>
                           ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-0">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50/50 dark:bg-slate-950/50 text-[10px] font-mono text-slate-400 uppercase tracking-widest border-b border-slate-200 dark:border-slate-800">
                        <th className="p-4 font-medium">Tag Item</th>
                        <th className="p-4 font-medium">Ferramenta</th>
                        <th className="p-4 font-medium">Marca</th>
                        {!isGuest && <th className="p-4 font-medium text-right">Ação</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {selectedCase.tools.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-slate-400 text-xs font-mono">Nenhuma ferramenta vinculada ainda.</td>
                        </tr>
                      ) : (
                        selectedCase.tools.map(item => {
                          const tool = tools.find(t => t.id === item.toolId);
                          return (
                            <tr key={item.itemTag} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                              <td className="p-4 text-xs font-mono text-cyan-400 font-bold">{item.itemTag}</td>
                              <td className="p-4 text-sm font-medium text-slate-900 dark:text-white capitalize">{tool?.name || 'Ferramenta excluída'}</td>
                              <td className="p-4 text-xs text-slate-500">{tool?.brand || '-'}</td>
                              {!isGuest && (
                                <td className="p-4 text-right">
                                  <button 
                                    onClick={() => removeToolFromCase(item.itemTag)}
                                    className="p-1.5 text-slate-400 hover:text-red-400 transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              )}
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-800 p-5 h-full overflow-hidden flex flex-col">
                <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <History className="w-4 h-4 text-cyan-400" /> Histórico de Maleta
                </h3>
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-1">
                  {logs.filter(l => l.caseId === selectedCase.id).sort((a,b) => b.date.localeCompare(a.date)).length === 0 ? (
                    <p className="text-center text-[10px] text-slate-500 font-mono py-10 uppercase tracking-widest">Nenhum registro encontrado.</p>
                  ) : (
                    logs.filter(l => l.caseId === selectedCase.id).sort((a,b) => b.date.localeCompare(a.date)).map(log => (
                      <div key={log.id} className="relative pl-5 border-l border-slate-200 dark:border-slate-800 pb-2">
                        <div className="absolute left-[-4.5px] top-1 w-2 h-2 rounded-full bg-cyan-400" />
                        <div className="flex justify-between items-start mb-0.5">
                          <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                            {log.type === 'creation' && 'Criação'}
                            {log.type === 'edit' && 'Edição'}
                            {log.type === 'transfer' && 'Transferência'}
                            {log.type === 'tool_add' && 'Adição'}
                            {log.type === 'tool_remove' && 'Remoção'}
                            {log.type === 'inspection' && 'Conferência'}
                            {log.type === 'kit_add' && 'Kit Standard'}
                          </span>
                          <span className="text-[9px] text-slate-500 font-mono">{new Date(log.date).toLocaleDateString('pt-BR')} {new Date(log.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-xs text-slate-400 dark:text-slate-500 italic leading-relaxed">{log.description}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeView === 'inspection' && selectedCase && (
          <motion.div 
            key="inspection"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xl max-w-4xl mx-auto"
          >
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-cyan-500/5 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-tight">
                  <ClipboardCheck className="w-6 h-6 text-cyan-400" /> Conferir Maleta: {selectedCase.tag}
                </h2>
                <p className="text-slate-400 text-xs mt-1">Checklist de verificação de integridade das ferramentas</p>
              </div>
              <button 
                onClick={() => setActiveView('details')}
                className="p-2 text-slate-400 hover:text-white rounded-lg transition-all"
              >
                <Plus className="w-5 h-5 rotate-45" />
              </button>
            </div>

            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {inspectionData.items.map((item, idx) => {
                const tool = tools.find(t => t.id === item.toolId);
                return (
                  <div key={item.itemTag} className="bg-slate-50 dark:bg-slate-950/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-wrap justify-between items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-mono text-cyan-400 font-bold bg-cyan-400/10 px-2 rounded-full uppercase tracking-widest">{item.itemTag}</span>
                        <span className="text-[10px] text-slate-400 uppercase font-mono tracking-widest">{tool?.brand}</span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white capitalize">{tool?.name}</h4>
                    </div>
                    
                    <div className="flex gap-1">
                      {[
                        { label: 'OK', color: 'emerald', icon: CheckCircle2 },
                        { label: 'Faltando', color: 'red', icon: XCircle },
                        { label: 'Danificada', color: 'amber', icon: AlertTriangle }
                      ].map(status => (
                        <button
                          key={status.label}
                          onClick={() => {
                            const newItems = [...inspectionData.items];
                            newItems[idx].status = status.label as any;
                            setInspectionData({...inspectionData, items: newItems});
                          }}
                          className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all ${
                            item.status === status.label 
                              ? `bg-${status.color}-500/20 border-${status.color}-500/40 text-${status.color}-400 shadow-[0_0_10px_rgba(16,185,129,0.1)]` 
                              : 'bg-slate-100 dark:bg-slate-800 border-transparent text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                          }`}
                        >
                          <status.icon className={`w-4 h-4 ${item.status === status.label ? `text-${status.color}-400` : ''}`} />
                          <span className="text-[8px] font-bold uppercase tracking-widest">{status.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
              
              {selectedCase.tools.length === 0 && (
                <div className="md:col-span-2 text-center py-10 text-slate-500 text-sm italic">
                  Esta maleta não possui ferramentas para conferir.
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/20">
              <label className="block text-xs font-mono text-slate-400 mb-2 uppercase tracking-widest">Observações da Conferência</label>
              <textarea 
                value={inspectionData.notes}
                onChange={e => setInspectionData({...inspectionData, notes: e.target.value})}
                className="w-full p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-cyan-500/50 min-h-[80px]"
                placeholder="Detalhes adicionais sobre a conferência..."
              />
              
              <div className="flex justify-end gap-3 mt-6">
                <button 
                  onClick={() => setActiveView('details')}
                  className="px-8 py-3 border border-slate-300 dark:border-slate-700 rounded-2xl text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all uppercase tracking-widest"
                >
                  Cancelar
                </button>
                <button 
                  onClick={submitInspection}
                  className="px-8 py-3 bg-cyan-600 hover:bg-cyan-500 text-slate-900 dark:text-white rounded-2xl text-sm font-bold transition-all shadow-xl shadow-cyan-900/20 uppercase tracking-widest"
                >
                  Salvar Conferência
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
