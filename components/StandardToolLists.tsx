import { useState } from 'react';
import { Department, StandardToolList, Tool } from '@/lib/data';
import { Plus, Trash2, Edit2, Check, Link as LinkIcon, Lock, Unlock } from 'lucide-react';
import ConfirmModal from './ConfirmModal';

export default function StandardToolLists({ 
  departments, setDepartments, tools, standardLists, setStandardLists 
}: { 
  departments: Department[], setDepartments: (d: Department[]) => void, 
  tools: Tool[], 
  standardLists: StandardToolList[], setStandardLists: (s: StandardToolList[]) => void 
}) {
  const [newKitName, setNewKitName] = useState('');
  const [selectedKitId, setSelectedKitId] = useState<string>(standardLists[0]?.id || '');
  const [editingKitId, setEditingKitId] = useState<string | null>(null);
  const [editKitName, setEditKitName] = useState('');
  const [sortAlphabetically, setSortAlphabetically] = useState(false);
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

  return (
    <div className="space-y-6">
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
        confirmColor="bg-blue-600 hover:bg-blue-700"
      />
      <h1 className="text-2xl font-bold text-slate-800">Kits de Ferramentas Padrão</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kits Management */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-[500px]">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h2 className="text-lg font-semibold text-slate-800">Kits Padrão</h2>
          </div>
          <div className="p-4 border-b border-slate-100">
            <form onSubmit={handleAddKit} className="flex gap-2">
              <input 
                type="text" 
                value={newKitName} 
                onChange={e => setNewKitName(e.target.value)}
                placeholder="Nome do novo kit..."
                className="flex-1 p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <button type="submit" className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                <Plus className="w-5 h-5" />
              </button>
            </form>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {standardLists.length === 0 ? (
              <p className="text-center text-slate-500 p-4 text-sm">Nenhum kit criado.</p>
            ) : (
              <ul className="space-y-1">
                {standardLists.map(kit => (
                  <li 
                    key={kit.id} 
                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedKitId === kit.id ? 'bg-blue-50 border border-blue-200' : 'hover:bg-slate-50 border border-transparent'
                    }`}
                    onClick={() => setSelectedKitId(kit.id)}
                  >
                    {editingKitId === kit.id ? (
                      <div className="flex items-center gap-2 w-full" onClick={e => e.stopPropagation()}>
                        <input 
                          autoFocus
                          value={editKitName} 
                          onChange={e => setEditKitName(e.target.value)}
                          className="flex-1 p-1 border border-slate-300 rounded text-sm"
                        />
                        <button onClick={handleUpdateKit} className="text-green-600 p-1"><Check className="w-4 h-4" /></button>
                      </div>
                    ) : (
                      <>
                        <span className={`font-medium text-sm ${selectedKitId === kit.id ? 'text-blue-700' : 'text-slate-700'} flex items-center gap-2`}>
                          {kit.name}
                          {kit.isLocked && <Lock className="w-3 h-3 text-slate-400" />}
                        </span>
                        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                          <button 
                            onClick={() => handleToggleLock(kit.id)} 
                            className={`p-1 transition-colors ${kit.isLocked ? 'text-amber-500 hover:text-amber-600' : 'text-slate-400 hover:text-blue-600'}`}
                            title={kit.isLocked ? "Desbloquear Kit" : "Travar Kit"}
                          >
                            {kit.isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                          </button>
                          {!kit.isLocked && (
                            <>
                              <button onClick={() => { setEditingKitId(kit.id); setEditKitName(kit.name); }} className="p-1 text-slate-400 hover:text-blue-600">
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDeleteKit(kit.id)} className="p-1 text-slate-400 hover:text-red-600">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Standard Tools Selection */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col h-[500px]">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-slate-800">
                {currentKit ? `Ferramentas do ${currentKit.name}` : 'Selecione um kit'}
              </h2>
              {currentKit?.isLocked && (
                <span className="flex items-center gap-1 bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200 uppercase tracking-wider">
                  <Lock className="w-3 h-3" /> Travado
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {selectedKitId && tools.length > 0 && (
                <button
                  onClick={() => setSortAlphabetically(!sortAlphabetically)}
                  className={`text-sm p-1.5 border rounded-lg outline-none transition-colors ${
                    sortAlphabetically 
                      ? 'border-blue-500 bg-blue-50 text-blue-700' 
                      : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                  title="Ordenar Alfabeticamente"
                >
                  Ordem Alfabética {sortAlphabetically ? '(Ativo)' : ''}
                </button>
              )}
              <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded-full">
                {currentToolIds.length} ferramentas
              </span>
            </div>
          </div>
          <div className="p-4 flex-1 overflow-y-auto">
            {!selectedKitId ? (
              <div className="h-full flex items-center justify-center text-slate-500">
                Selecione um kit à esquerda para gerenciar suas ferramentas.
              </div>
            ) : tools.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500">
                Nenhuma ferramenta registrada ainda. Vá para Registro de Ferramentas para adicionar ferramentas.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[...tools]
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
                      className={`p-3 border rounded-lg flex items-start gap-3 transition-all ${
                        isSelected ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                      }`}
                    >
                      <div 
                        className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 ${
                          currentKit?.isLocked ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                        } ${
                          isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white'
                        }`} 
                        onClick={() => !currentKit?.isLocked && toggleToolInKit(tool.id)}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                      </div>
                      <div 
                        className={`flex-1 ${currentKit?.isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`} 
                        onClick={() => !currentKit?.isLocked && toggleToolInKit(tool.id)}
                      >
                        <p className={`font-medium text-sm ${isSelected ? 'text-blue-900' : 'text-slate-800'}`}>{tool.name}</p>
                        <p className="text-xs text-slate-500">{tool.brand} • {tool.category}</p>
                      </div>
                      {isSelected && (
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-slate-600">Qtd:</label>
                          <input 
                            type="number" 
                            min="1"
                            disabled={currentKit?.isLocked}
                            value={currentTools.find(t => t.toolId === tool.id)?.quantity || 1}
                            onChange={(e) => updateToolQuantity(tool.id, parseInt(e.target.value) || 1)}
                            className="w-16 p-1 border border-slate-300 rounded text-sm outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Departments Linkage */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LinkIcon className="w-5 h-5 text-slate-500" />
            <h2 className="text-lg font-semibold text-slate-800">Departamentos e Kits</h2>
          </div>
        </div>
        <div className="p-4">
          {departments.length === 0 ? (
            <p className="text-slate-500 text-sm">Nenhum departamento registrado. Crie departamentos na aba Colaboradores.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {departments.map(dept => (
                <div key={dept.id} className="border border-slate-200 rounded-lg p-4 bg-slate-50 flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <p className="font-medium text-slate-800">{dept.name}</p>
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Kit Individual</label>
                      <select
                        value={dept.standardListId || ''}
                        onChange={e => handleLinkKitToDepartment(dept.id, e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                      >
                        <option value="">-- Sem kit individual --</option>
                        {standardLists.map(kit => (
                          <option key={kit.id} value={kit.id}>{kit.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
