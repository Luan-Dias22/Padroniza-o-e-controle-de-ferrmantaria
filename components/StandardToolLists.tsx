import { useState } from 'react';
import { Department, StandardToolList, Tool } from '@/lib/data';
import { Plus, Trash2, Edit2, Check, Link as LinkIcon, Lock, Unlock, Search, ListChecks } from 'lucide-react';
import { motion } from 'motion/react';
import ConfirmModal from './ConfirmModal';
import { sortByName } from '@/lib/utils';

export default function StandardToolLists({ 
  departments, setDepartments, tools, standardLists, setStandardLists, isGuest = false 
}: { 
  departments: Department[], setDepartments: (d: Department[]) => void, 
  tools: Tool[], 
  standardLists: StandardToolList[], setStandardLists: (s: StandardToolList[]) => void,
  isGuest?: boolean
}) {
  const [newKitName, setNewKitName] = useState('');
  const [selectedKitId, setSelectedKitId] = useState<string>(standardLists[0]?.id || '');
  const [editingKitId, setEditingKitId] = useState<string | null>(null);
  const [editKitName, setEditKitName] = useState('');
  const [sortAlphabetically, setSortAlphabetically] = useState(false);
  const [toolSearchQuery, setToolSearchQuery] = useState('');
  const [confirmUnlockModal, setConfirmUnlockModal] = useState<{
    isOpen: boolean;
    kitId: string | null;
  }>({
    isOpen: false,
    kitId: null
  });

  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const handleAddKit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKitName.trim()) return;
    const newId = crypto.randomUUID();
    setStandardLists([...standardLists, { id: newId, name: newKitName, tools: [] }]);
    setNewKitName('');
    if (!selectedKitId) setSelectedKitId(newId);
  };

  const handleDeleteKit = (id: string) => {
    setDeleteModal({
      isOpen: true,
      title: 'Excluir Kit Padrão',
      message: 'Excluir este kit padrão? Os departamentos vinculados a ele ficarão sem kit.',
      onConfirm: () => {
        setStandardLists(standardLists.filter(s => s.id !== id));
        // Remove link from departments
        setDepartments(departments.map(d => d.standardListId === id ? { ...d, standardListId: undefined } : d));
        if (selectedKitId === id) setSelectedKitId(standardLists[0]?.id || '');
      }
    });
  };

  const handleUpdateKit = () => {
    if (!editKitName.trim() || !editingKitId) return;
    setStandardLists(standardLists.map(s => s.id === editingKitId ? { ...s, name: editKitName } : s));
    setEditingKitId(null);
  };

  const handleToggleLock = (kitId: string) => {
    const kit = standardLists.find(s => s.id === kitId);
    if (!kit) return;

    if (kit.isLocked) {
      // Show confirm modal to unlock
      setConfirmUnlockModal({
        isOpen: true,
        kitId: kitId
      });
    } else {
      // Lock directly
      setStandardLists(standardLists.map(s => s.id === kitId ? { ...s, isLocked: true } : s));
    }
  };

  const confirmUnlock = () => {
    if (confirmUnlockModal.kitId) {
      setStandardLists(standardLists.map(s => s.id === confirmUnlockModal.kitId ? { ...s, isLocked: false } : s));
    }
    setConfirmUnlockModal({ isOpen: false, kitId: null });
  };

  const currentKit = standardLists.find(s => s.id === selectedKitId);
  const currentTools = currentKit?.tools || [];
  const currentToolIds = currentTools.map(t => t.toolId);

  const toggleToolInKit = (toolId: string) => {
    if (!selectedKitId) return;
    
    let newList;
    if (currentToolIds.includes(toolId)) {
      newList = currentTools.filter(t => t.toolId !== toolId);
    } else {
      newList = [...currentTools, { toolId, quantity: 1 }];
    }

    setStandardLists(standardLists.map(s => s.id === selectedKitId ? { ...s, tools: newList } : s));
  };

  const updateToolQuantity = (toolId: string, quantity: number) => {
    if (!selectedKitId) return;
    if (quantity < 1) quantity = 1;

    setStandardLists(standardLists.map(s => s.id === selectedKitId ? {
      ...s,
      tools: (s.tools || []).map(t => t.toolId === toolId ? { ...t, quantity } : t)
    } : s));
  };

  const handleLinkKitToDepartment = (deptId: string, kitId: string) => {
    setDepartments(departments.map(d => d.id === deptId ? { ...d, standardListId: kitId || undefined } : d));
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div 
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <ConfirmModal 
        isOpen={deleteModal.isOpen}
        title={deleteModal.title}
        message={deleteModal.message}
        onConfirm={deleteModal.onConfirm}
        onCancel={() => setDeleteModal(prev => ({ ...prev, isOpen: false }))}
      />
      <ConfirmModal 
        isOpen={confirmUnlockModal.isOpen}
        title="Desbloquear Kit"
        message="Tem certeza que deseja desbloquear este kit para edição?"
        onConfirm={confirmUnlock}
        onCancel={() => setConfirmUnlockModal({ isOpen: false, kitId: null })}
        confirmText="Liberar"
        confirmColor="bg-cyan-600 hover:bg-cyan-700"
      />
      
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-purple-500/10 border border-purple-500/30 rounded-xl flex items-center justify-center shadow-sm">
          <ListChecks className="w-5 h-5 text-purple-400" />
        </div>
        <h1 className="text-2xl font-bold font-sans tracking-tight text-white tracking-tight">Kits de Ferramentas Padrão</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kits Management */}
        <motion.div variants={itemVariants} className="bg-[#0a0a0a] rounded-xl shadow-xl border border-white/105 overflow-hidden flex flex-col h-[500px] relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500/50 to-indigo-500/50" />
          <div className="p-5 border-b border-white/5 bg-zinc-900/80">
            <h2 className="text-lg font-semibold font-sans tracking-tight text-white">Kits Padrão</h2>
          </div>
          {!isGuest && (
            <div className="p-4 border-b border-white/5 bg-transparent/30">
              <form onSubmit={handleAddKit} className="flex gap-2">
                <input 
                  type="text" 
                  value={newKitName} 
                  onChange={e => setNewKitName(e.target.value)}
                  placeholder="Nome do novo kit..."
                  className="flex-1 p-2.5 bg-zinc-900/30 border border-white/105 rounded-xl text-sm text-zinc-200 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all"
                />
                <button type="submit" className="p-2.5 bg-purple-600/20 text-purple-400 border border-purple-500/30 rounded-xl hover:bg-purple-500/30 hover:border-purple-400 transition-all shadow-[0_0_10px_rgba(168,85,247,0.2)]">
                  <Plus className="w-5 h-5" />
                </button>
              </form>
            </div>
          )}
          <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
            {standardLists.length === 0 ? (
              <p className="text-center text-zinc-500 p-4 text-sm font-mono">Nenhum kit criado.</p>
            ) : (
              <ul className="space-y-2">
                {[...standardLists].sort((a, b) => sortByName(a.name, b.name)).map(kit => (
                  <motion.li 
                    key={kit.id} 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
                      selectedKitId === kit.id 
                        ? 'bg-purple-500/10 border border-purple-500/30 shadow-sm' 
                        : 'hover:bg-zinc-900/50 border border-transparent'
                    }`}
                    onClick={() => setSelectedKitId(kit.id)}
                  >
                    {editingKitId === kit.id ? (
                      <div className="flex items-center gap-2 w-full" onClick={e => e.stopPropagation()}>
                        <input 
                          autoFocus
                          value={editKitName} 
                          onChange={e => setEditKitName(e.target.value)}
                          className="flex-1 p-1.5 bg-transparent border border-white/105 rounded text-sm text-zinc-200 outline-none focus:border-purple-500"
                        />
                        <button onClick={handleUpdateKit} className="text-emerald-400 p-1 hover:bg-emerald-500/10 rounded"><Check className="w-4 h-4" /></button>
                      </div>
                    ) : (
                      <>
                        <span className={`font-medium text-sm ${selectedKitId === kit.id ? 'text-purple-400' : 'text-zinc-300'} flex items-center gap-2`}>
                          {kit.name}
                          {kit.isLocked && <Lock className="w-3 h-3 text-zinc-500" />}
                        </span>
                        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                          {!isGuest && (
                            <button 
                              onClick={() => handleToggleLock(kit.id)} 
                              className={`p-1.5 rounded-lg transition-colors ${kit.isLocked ? 'text-amber-400 hover:bg-amber-500/10' : 'text-zinc-500 hover:text-purple-400 hover:bg-purple-500/10'}`}
                              title={kit.isLocked ? "Desbloquear Kit" : "Travar Kit"}
                            >
                              {kit.isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                            </button>
                          )}
                          {!kit.isLocked && !isGuest && (
                            <>
                              <button onClick={() => { setEditingKitId(kit.id); setEditKitName(kit.name); }} className="p-1.5 text-zinc-500 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors">
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDeleteKit(kit.id)} className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </motion.li>
                ))}
              </ul>
            )}
          </div>
        </motion.div>

        {/* Standard Tools Selection */}
        <motion.div variants={itemVariants} className="lg:col-span-2 bg-[#0a0a0a] rounded-xl shadow-xl border border-white/105 flex flex-col h-[500px] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-1/2 h-1 bg-gradient-to-l from-purple-500/50 to-transparent" />
          <div className="p-5 border-b border-white/5 bg-zinc-900/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold font-sans tracking-tight text-white">
                {currentKit ? `Ferramentas do ${currentKit.name}` : 'Selecione um kit'}
              </h2>
              {currentKit?.isLocked && (
                <span className="flex items-center gap-1 bg-amber-500/10 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-500/20 uppercase tracking-wider">
                  <Lock className="w-3 h-3" /> Travado
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              {selectedKitId && tools.length > 0 && (
                <>
                  <div className="relative flex-1 sm:flex-none">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                      type="text"
                      placeholder="Buscar ferramenta..."
                      value={toolSearchQuery}
                      onChange={(e) => setToolSearchQuery(e.target.value)}
                      className="w-full sm:w-48 pl-9 pr-3 py-2 bg-zinc-900/30 border border-white/105 rounded-xl text-sm text-zinc-200 outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
                    />
                  </div>
                  <button
                    onClick={() => setSortAlphabetically(!sortAlphabetically)}
                    className={`text-xs font-mono p-2 border rounded-xl outline-none transition-all uppercase tracking-wider ${
                      sortAlphabetically 
                        ? 'border-purple-500/50 bg-purple-500/10 text-purple-400' 
                        : 'border-white/5 bg-zinc-900/30 text-zinc-400 hover:bg-zinc-900/50'
                    }`}
                    title="Ordenar Alfabeticamente"
                  >
                    A-Z {sortAlphabetically ? 'ON' : 'OFF'}
                  </button>
                </>
              )}
              <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 text-xs font-mono px-2 py-1 rounded-lg whitespace-nowrap">
                {currentToolIds.length} ferramentas
              </span>
            </div>
          </div>
          <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
            {!selectedKitId ? (
              <div className="h-full flex items-center justify-center text-zinc-500 font-mono text-sm">
                Selecione um kit à esquerda para gerenciar suas ferramentas.
              </div>
            ) : tools.length === 0 ? (
              <div className="h-full flex items-center justify-center text-zinc-500 font-mono text-sm">
                Nenhuma ferramenta registrada ainda. Vá para Registro de Ferramentas.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[...tools]
                  .filter(tool => {
                    if (!toolSearchQuery) return true;
                    const searchLower = toolSearchQuery.toLowerCase();
                    return tool.name.toLowerCase().includes(searchLower) || 
                           tool.brand.toLowerCase().includes(searchLower) ||
                           tool.category.toLowerCase().includes(searchLower);
                  })
                  .sort((a, b) => {
                    if (sortAlphabetically) {
                      return a.name.localeCompare(b.name);
                    }
                    return 0; // Default order
                  })
                  .map(tool => {
                  const isSelected = currentToolIds.includes(tool.id);
                  return (
                    <div 
                      key={tool.id}
                      className={`p-3 border rounded-xl flex items-start gap-3 transition-all ${
                        isSelected ? 'border-purple-500/50 bg-purple-500/5' : 'border-white/5 hover:border-slate-600 hover:bg-zinc-900/30'
                      }`}
                    >
                      <div 
                        className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                          (currentKit?.isLocked || isGuest) ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                        } ${
                          isSelected ? 'bg-purple-500 border-purple-500' : 'border-slate-600 bg-zinc-900'
                        }`} 
                        onClick={() => !currentKit?.isLocked && !isGuest && toggleToolInKit(tool.id)}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                      </div>
                      <div 
                        className={`flex-1 ${(currentKit?.isLocked || isGuest) ? 'cursor-not-allowed' : 'cursor-pointer'}`} 
                        onClick={() => !currentKit?.isLocked && !isGuest && toggleToolInKit(tool.id)}
                      >
                        <p className={`font-medium text-sm ${isSelected ? 'text-purple-300' : 'text-zinc-300'}`}>{tool.name}</p>
                        <p className="text-xs text-zinc-500 mt-0.5">{tool.brand} • {tool.category}</p>
                      </div>
                      {isSelected && (
                        <div className="flex items-center gap-2">
                          <label className="text-[10px] font-mono text-zinc-500 uppercase">Qtd:</label>
                          <input 
                            type="number" 
                            min="1"
                            disabled={currentKit?.isLocked || isGuest}
                            value={currentTools.find(t => t.toolId === tool.id)?.quantity || 1}
                            onChange={(e) => updateToolQuantity(tool.id, parseInt(e.target.value) || 1)}
                            className="w-16 p-1.5 bg-transparent border border-white/105 rounded-lg text-sm text-zinc-200 outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-50"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Departments Linkage */}
      <motion.div variants={itemVariants} className="bg-[#0a0a0a] rounded-xl shadow-xl border border-white/105 overflow-hidden relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-1 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
        <div className="p-5 border-b border-white/5 bg-zinc-900/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-cyan-500/10 border border-cyan-500/30 rounded-lg flex items-center justify-center">
              <LinkIcon className="w-4 h-4 text-cyan-400" />
            </div>
            <h2 className="text-lg font-semibold font-sans tracking-tight text-white">Departamentos e Kits</h2>
          </div>
        </div>
        <div className="p-5">
          {departments.length === 0 ? (
            <p className="text-zinc-500 text-sm font-mono">Nenhum departamento registrado. Crie departamentos na aba Colaboradores.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[...departments].sort((a, b) => sortByName(a.name, b.name)).map((dept, idx) => (
                <motion.div 
                  key={dept.id} 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="border border-white/105 rounded-xl p-5 bg-transparent/30 flex flex-col gap-4 hover:border-white/5 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <p className="font-bold text-zinc-200">{dept.name}</p>
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest font-mono text-zinc-500">Kit Individual</label>
                      <select
                        value={dept.standardListId || ''}
                        disabled={isGuest}
                        onChange={e => handleLinkKitToDepartment(dept.id, e.target.value)}
                        className="w-full p-2.5 bg-zinc-900 border border-white/105 rounded-xl text-sm text-zinc-300 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none transition-all appearance-none disabled:opacity-50"
                      >
                        <option value="">-- Sem kit individual --</option>
                        {standardLists.map(kit => (
                          <option key={kit.id} value={kit.id}>{kit.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
