import { useState } from 'react';
import { AssemblyLine, StandardToolList, Tool } from '@/lib/data';
import { Plus, Trash2, Edit2, Check, Link as LinkIcon } from 'lucide-react';
import ConfirmModal from './ConfirmModal';

export default function StandardToolLists({ 
  lines, setLines, tools, standardLists, setStandardLists 
}: { 
  lines: AssemblyLine[], setLines: (l: AssemblyLine[]) => void, 
  tools: Tool[], 
  standardLists: StandardToolList[], setStandardLists: (s: StandardToolList[]) => void 
}) {
  const [newKitName, setNewKitName] = useState('');
  const [selectedKitId, setSelectedKitId] = useState<string>(standardLists[0]?.id || '');
  const [editingKitId, setEditingKitId] = useState<string | null>(null);
  const [editKitName, setEditKitName] = useState('');

  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [editLineName, setEditLineName] = useState('');

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
      message: 'Excluir este kit padrão? As linhas vinculadas a ele ficarão sem kit.',
      onConfirm: () => {
        setStandardLists(standardLists.filter(s => s.id !== id));
        // Remove link from lines
        setLines(lines.map(l => l.standardListId === id ? { ...l, standardListId: undefined } : l));
        if (selectedKitId === id) setSelectedKitId(standardLists[0]?.id || '');
      }
    });
  };

  const handleUpdateKit = () => {
    if (!editKitName.trim() || !editingKitId) return;
    setStandardLists(standardLists.map(s => s.id === editingKitId ? { ...s, name: editKitName } : s));
    setEditingKitId(null);
  };

  const handleUpdateLine = () => {
    if (!editLineName.trim() || !editingLineId) return;
    setLines(lines.map(l => l.id === editingLineId ? { ...l, name: editLineName } : l));
    setEditingLineId(null);
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

  const handleLinkKitToLine = (lineId: string, kitId: string) => {
    setLines(lines.map(l => l.id === lineId ? { ...l, standardListId: kitId || undefined } : l));
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
                        <span className={`font-medium text-sm ${selectedKitId === kit.id ? 'text-blue-700' : 'text-slate-700'}`}>
                          {kit.name}
                        </span>
                        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                          <button onClick={() => { setEditingKitId(kit.id); setEditKitName(kit.name); }} className="p-1 text-slate-400 hover:text-blue-600">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteKit(kit.id)} className="p-1 text-slate-400 hover:text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </button>
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
            <h2 className="text-lg font-semibold text-slate-800">
              {currentKit ? `Ferramentas do ${currentKit.name}` : 'Selecione um kit'}
            </h2>
            <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded-full">
              {currentToolIds.length} ferramentas
            </span>
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
                {tools.map(tool => {
                  const isSelected = currentToolIds.includes(tool.id);
                  return (
                    <div 
                      key={tool.id}
                      className={`p-3 border rounded-lg flex items-start gap-3 transition-all ${
                        isSelected ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                      }`}
                    >
                      <div 
                        className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 cursor-pointer ${
                          isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white'
                        }`} 
                        onClick={() => toggleToolInKit(tool.id)}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                      </div>
                      <div className="flex-1 cursor-pointer" onClick={() => toggleToolInKit(tool.id)}>
                        <p className={`font-medium text-sm ${isSelected ? 'text-blue-900' : 'text-slate-800'}`}>{tool.name}</p>
                        <p className="text-xs text-slate-500">{tool.brand} • {tool.category}</p>
                      </div>
                      {isSelected && (
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-slate-600">Qtd:</label>
                          <input 
                            type="number" 
                            min="1"
                            value={currentTools.find(t => t.toolId === tool.id)?.quantity || 1}
                            onChange={(e) => updateToolQuantity(tool.id, parseInt(e.target.value) || 1)}
                            className="w-16 p-1 border border-slate-300 rounded text-sm outline-none focus:ring-1 focus:ring-blue-500"
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

      {/* Assembly Lines Linkage */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LinkIcon className="w-5 h-5 text-slate-500" />
            <h2 className="text-lg font-semibold text-slate-800">Linhas de Montagem e Kits</h2>
          </div>
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const input = form.elements.namedItem('newLine') as HTMLInputElement;
              if (input.value.trim()) {
                setLines([...lines, { id: crypto.randomUUID(), name: input.value.trim() }]);
                input.value = '';
              }
            }}
            className="flex gap-2"
          >
            <input 
              name="newLine"
              type="text" 
              placeholder="Nova linha de montagem..."
              className="p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none w-64"
            />
            <button type="submit" className="p-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700">
              <Plus className="w-5 h-5" />
            </button>
          </form>
        </div>
        <div className="p-4">
          {lines.length === 0 ? (
            <p className="text-slate-500 text-sm">Nenhuma linha de montagem registrada.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {lines.map(line => (
                <div key={line.id} className="border border-slate-200 rounded-lg p-4 bg-slate-50 flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    {editingLineId === line.id ? (
                      <div className="flex items-center gap-2 w-full">
                        <input 
                          autoFocus
                          value={editLineName} 
                          onChange={e => setEditLineName(e.target.value)}
                          className="flex-1 p-1 border border-slate-300 rounded text-sm"
                        />
                        <button onClick={handleUpdateLine} className="text-green-600 p-1"><Check className="w-4 h-4" /></button>
                      </div>
                    ) : (
                      <>
                        <p className="font-medium text-slate-800">{line.name}</p>
                        <div className="flex gap-1">
                          <button 
                            onClick={() => { setEditingLineId(line.id); setEditLineName(line.name); }}
                            className="text-slate-400 hover:text-blue-600 p-1"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => {
                              setDeleteModal({
                                isOpen: true,
                                title: 'Excluir Linha de Montagem',
                                message: 'Excluir esta linha de montagem?',
                                onConfirm: () => setLines(lines.filter(l => l.id !== line.id))
                              });
                            }}
                            className="text-slate-400 hover:text-red-600 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                  <select
                    value={line.standardListId || ''}
                    onChange={e => handleLinkKitToLine(line.id, e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    <option value="">-- Sem kit padrão --</option>
                    {standardLists.map(kit => (
                      <option key={kit.id} value={kit.id}>{kit.name}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
