'use client';

import { useState, useMemo } from 'react';
import { CollectiveStation, CollectiveLine, Tool } from '@/lib/data';
import { Plus, Edit2, Trash2, Search, LayoutGrid, Wrench, Settings2, ChevronRight, Building2, AlertCircle, X, Eye } from 'lucide-react';
import ConfirmModal from './ConfirmModal';

export default function CollectiveTools({
  lines, setLines,
  stations, setStations,
  tools
}: {
  lines: CollectiveLine[], setLines: (lines: CollectiveLine[]) => void,
  stations: CollectiveStation[], setStations: (stations: CollectiveStation[]) => void,
  tools: Tool[]
}) {
  const [selectedLineId, setSelectedLineId] = useState<string>('all');
  const [isStationModalOpen, setIsStationModalOpen] = useState(false);
  const [isLineModalOpen, setIsLineModalOpen] = useState(false);
  const [isManageToolsModalOpen, setIsManageToolsModalOpen] = useState(false);
  
  const [editingStation, setEditingStation] = useState<CollectiveStation | null>(null);
  const [editingLine, setEditingLine] = useState<CollectiveLine | null>(null);
  const [managingStation, setManagingStation] = useState<CollectiveStation | null>(null);
  const [viewingStation, setViewingStation] = useState<CollectiveStation | null>(null);

  const [stationFormData, setStationFormData] = useState({ name: '', lineId: '' });
  const [lineFormData, setLineFormData] = useState({ name: '' });
  
  const [toolSearch, setToolSearch] = useState('');

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

  const filteredStations = useMemo(() => {
    let result = stations;
    if (selectedLineId !== 'all') {
      const line = lines.find(l => l.id === selectedLineId);
      result = stations.filter(s => s.line === line?.name);
    }
    return [...result].sort((a, b) => a.name.localeCompare(b.name));
  }, [stations, selectedLineId, lines]);

  const handleSaveLine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lineFormData.name) return;

    if (editingLine) {
      const oldName = editingLine.name;
      setLines(lines.map(l => l.id === editingLine.id ? { ...l, name: lineFormData.name } : l));
      // Update stations that use this line
      setStations(stations.map(s => s.line === oldName ? { ...s, line: lineFormData.name } : s));
    } else {
      setLines([...lines, { id: crypto.randomUUID(), name: lineFormData.name }]);
    }
    setIsLineModalOpen(false);
    setEditingLine(null);
    setLineFormData({ name: '' });
  };

  const handleSaveStation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stationFormData.name || !stationFormData.lineId) return;

    const line = lines.find(l => l.id === stationFormData.lineId);
    if (!line) return;

    // Check for duplicate name in same line
    const isDuplicate = stations.some(s => 
      s.name.toLowerCase() === stationFormData.name.toLowerCase() && 
      s.line === line.name && 
      (!editingStation || s.id !== editingStation.id)
    );

    if (isDuplicate) {
      alert('Já existe um posto com este nome nesta linha.');
      return;
    }

    if (editingStation) {
      setStations(stations.map(s => s.id === editingStation.id ? { 
        ...s, 
        name: stationFormData.name, 
        line: line.name 
      } : s));
    } else {
      setStations([...stations, { 
        id: crypto.randomUUID(), 
        name: stationFormData.name, 
        line: line.name, 
        tools: [] 
      }]);
    }
    setIsStationModalOpen(false);
    setEditingStation(null);
    setStationFormData({ name: '', lineId: '' });
  };

  const handleDeleteLine = (line: CollectiveLine) => {
    setDeleteModal({
      isOpen: true,
      title: 'Excluir Linha',
      message: `Tem certeza que deseja excluir a linha "${line.name}"? Todos os postos associados a ela também serão removidos.`,
      onConfirm: () => {
        setLines(lines.filter(l => l.id !== line.id));
        setStations(stations.filter(s => s.line !== line.name));
        if (selectedLineId === line.id) setSelectedLineId('all');
      }
    });
  };

  const handleDeleteStation = (station: CollectiveStation) => {
    setDeleteModal({
      isOpen: true,
      title: 'Excluir Posto',
      message: `Tem certeza que deseja excluir o posto "${station.name}"?`,
      onConfirm: () => {
        setStations(stations.filter(s => s.id !== station.id));
      }
    });
  };

  const handleAddToolToStation = (tool: Tool | { name: string, category: string }) => {
    if (!managingStation) return;
    
    const quantity = 1;
    const requiredQuantity = 1;
    const existingToolIdx = managingStation.tools.findIndex(t => 
      ('id' in tool && t.toolId === tool.id) || (!('id' in tool) && t.name === tool.name)
    );

    let updatedTools = [...managingStation.tools];
    if (existingToolIdx >= 0) {
      updatedTools[existingToolIdx].quantity += quantity;
      updatedTools[existingToolIdx].requiredQuantity = (updatedTools[existingToolIdx].requiredQuantity ?? updatedTools[existingToolIdx].quantity) + requiredQuantity;
    } else {
      updatedTools.push({
        toolId: 'id' in tool ? tool.id : undefined,
        name: tool.name,
        category: tool.category,
        quantity: quantity,
        requiredQuantity: requiredQuantity
      });
    }

    const updatedStation = { ...managingStation, tools: updatedTools };
    setStations(stations.map(s => s.id === managingStation.id ? updatedStation : s));
    setManagingStation(updatedStation);
  };

  const handleRemoveToolFromStation = (idx: number) => {
    if (!managingStation) return;
    const updatedTools = managingStation.tools.filter((_, i) => i !== idx);
    const updatedStation = { ...managingStation, tools: updatedTools };
    setStations(stations.map(s => s.id === managingStation.id ? updatedStation : s));
    setManagingStation(updatedStation);
  };

  const handleUpdateToolQuantity = (idx: number, field: 'quantity' | 'requiredQuantity', delta: number) => {
    if (!managingStation) return;
    const updatedTools = [...managingStation.tools];
    const currentVal = updatedTools[idx][field] ?? updatedTools[idx].quantity;
    updatedTools[idx][field] = Math.max(0, currentVal + delta);
    const updatedStation = { ...managingStation, tools: updatedTools };
    setStations(stations.map(s => s.id === managingStation.id ? updatedStation : s));
    setManagingStation(updatedStation);
  };

  const availableTools = tools.filter(t => 
    t.name.toLowerCase().includes(toolSearch.toLowerCase()) || 
    t.brand.toLowerCase().includes(toolSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <ConfirmModal 
        isOpen={deleteModal.isOpen}
        title={deleteModal.title}
        message={deleteModal.message}
        onConfirm={deleteModal.onConfirm}
        onCancel={() => setDeleteModal(prev => ({ ...prev, isOpen: false }))}
      />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Ferramentas Coletivas por Posto</h1>
          <p className="text-slate-500 text-sm mt-1">Gerencie conjuntos de ferramentas compartilhadas em postos de trabalho.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => { setEditingLine(null); setLineFormData({ name: '' }); setIsLineModalOpen(true); }}
            className="px-4 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2 text-sm font-medium"
          >
            <Settings2 className="w-4 h-4" /> Gerenciar Linhas
          </button>
          <button 
            onClick={() => { 
              if (lines.length === 0) {
                alert('Crie uma linha primeiro.');
                return;
              }
              setEditingStation(null); 
              setStationFormData({ name: '', lineId: selectedLineId === 'all' ? lines[0].id : selectedLineId }); 
              setIsStationModalOpen(true); 
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm font-medium shadow-sm"
          >
            <Plus className="w-4 h-4" /> Novo Posto
          </button>
        </div>
      </div>

      {/* Line Selector & Summary */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 font-medium mr-2">
          <LayoutGrid className="w-5 h-5 text-blue-500" />
          <span>Linha de Montagem:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => setSelectedLineId('all')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              selectedLineId === 'all' 
                ? 'bg-blue-600 text-white shadow-md' 
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
          >
            Todas as Linhas
          </button>
          {lines.map(line => (
            <button 
              key={line.id}
              onClick={() => setSelectedLineId(line.id)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                selectedLineId === line.id 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              {line.name}
            </button>
          ))}
          <button 
            onClick={() => { setEditingLine(null); setLineFormData({ name: '' }); setIsLineModalOpen(true); }}
            className="px-3 py-1.5 border border-dashed border-slate-300 text-slate-500 rounded-full text-sm hover:border-blue-400 hover:text-blue-500 transition-all flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Nova Linha
          </button>
        </div>
      </div>

      {/* Stations Grid/Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                <th className="p-4 font-bold">Posto de Trabalho</th>
                <th className="p-4 font-bold">Linha</th>
                <th className="p-4 font-bold">Ferramentas Coletivas</th>
                <th className="p-4 font-bold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStations.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-12 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400 space-y-3">
                      <Building2 className="w-12 h-12 opacity-20" />
                      <p className="text-sm">Nenhum posto encontrado para esta seleção.</p>
                      <button 
                        onClick={() => { setEditingStation(null); setStationFormData({ name: '', lineId: lines[0]?.id || '' }); setIsStationModalOpen(true); }}
                        className="text-blue-600 text-sm font-bold hover:underline"
                      >
                        Criar primeiro posto
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredStations.map(station => (
                  <tr key={station.id} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                          <Settings2 className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{station.name}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded text-[10px] font-bold uppercase tracking-tight">
                        {station.line}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Wrench className="w-4 h-4 text-slate-400" />
                        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                          {station.tools.reduce((acc, t) => acc + t.quantity, 0)} / {station.tools.reduce((acc, t) => acc + (t.requiredQuantity ?? t.quantity), 0)} itens
                        </span>
                        <span className="text-xs text-slate-400">({station.tools.length} tipos)</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => setViewingStation(station)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                          title="Visualizar Ferramentas"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => { setManagingStation(station); setIsManageToolsModalOpen(true); }}
                          className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 dark:hover:text-white transition-all text-xs font-bold flex items-center gap-1.5"
                        >
                          <Wrench className="w-3.5 h-3.5" /> Gerenciar Ferramentas
                        </button>
                        <button 
                          onClick={() => { 
                            const line = lines.find(l => l.name === station.line);
                            setEditingStation(station); 
                            setStationFormData({ name: station.name, lineId: line?.id || '' }); 
                            setIsStationModalOpen(true); 
                          }}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteStation(station)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Line Management Modal */}
      {isLineModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Gerenciar Linhas</h2>
              <button onClick={() => setIsLineModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <form onSubmit={handleSaveLine} className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Nome da nova linha..."
                  value={lineFormData.name}
                  onChange={e => setLineFormData({ name: e.target.value })}
                  className="flex-1 p-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-transparent text-slate-800 dark:text-slate-200"
                  autoFocus
                />
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-bold">
                  {editingLine ? 'Salvar' : 'Adicionar'}
                </button>
              </form>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {lines.map(line => (
                  <div key={line.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700 group">
                    <span className="font-medium text-slate-700 dark:text-slate-300">{line.name}</span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setEditingLine(line); setLineFormData({ name: line.name }); }} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDeleteLine(line)} className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                {lines.length === 0 && <p className="text-center text-slate-400 text-sm py-4">Nenhuma linha cadastrada.</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Station Modal */}
      {isStationModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">{editingStation ? 'Editar Posto' : 'Novo Posto de Trabalho'}</h2>
              <button onClick={() => setIsStationModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleSaveStation} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Nome do Posto *</label>
                <input 
                  type="text" 
                  placeholder="ex: Posto 1 - Crimpagem"
                  value={stationFormData.name}
                  onChange={e => setStationFormData({ ...stationFormData, name: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-transparent text-slate-800 dark:text-slate-200"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Linha de Montagem *</label>
                <select 
                  value={stationFormData.lineId}
                  onChange={e => setStationFormData({ ...stationFormData, lineId: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                  required
                >
                  <option value="" disabled>Selecione uma linha</option>
                  {lines.map(line => (
                    <option key={line.id} value={line.id}>{line.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button 
                  type="button" 
                  onClick={() => setIsStationModalOpen(false)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-md shadow-blue-900/20"
                >
                  {editingStation ? 'Salvar Alterações' : 'Criar Posto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Tools Modal */}
      {isManageToolsModalOpen && managingStation && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Gerenciar Ferramentas</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">{managingStation.name} • {managingStation.line}</p>
              </div>
              <button onClick={() => setIsManageToolsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
              {/* Left Side: Current Tools */}
              <div className="flex-1 p-6 overflow-y-auto border-r border-slate-100">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Ferramentas no Posto</h3>
                <div className="space-y-3">
                  {managingStation.tools.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-2xl">
                      <Wrench className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                      <p className="text-slate-400 text-sm">Nenhuma ferramenta adicionada.</p>
                    </div>
                  ) : (
                    managingStation.tools.map((t, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 group">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{t.name}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{t.category}</p>
                        </div>
                        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
                          <div className="flex items-center gap-2">
                            <div className="flex flex-col items-center">
                              <span className="text-[9px] font-bold text-slate-400 uppercase mb-1">Atual</span>
                              <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                                <button onClick={() => handleUpdateToolQuantity(idx, 'quantity', -1)} className="px-2 py-1 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700">-</button>
                                <span className="px-3 py-1 font-bold text-slate-700 dark:text-slate-300 min-w-[40px] text-center">{t.quantity}</span>
                                <button onClick={() => handleUpdateToolQuantity(idx, 'quantity', 1)} className="px-2 py-1 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 border-l border-slate-200 dark:border-slate-700">+</button>
                              </div>
                            </div>
                            <span className="text-slate-300 dark:text-slate-600 font-light text-2xl mt-4">/</span>
                            <div className="flex flex-col items-center">
                              <span className="text-[9px] font-bold text-slate-400 uppercase mb-1">Nec.</span>
                              <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                                <button onClick={() => handleUpdateToolQuantity(idx, 'requiredQuantity', -1)} className="px-2 py-1 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700">-</button>
                                <span className="px-3 py-1 font-bold text-slate-700 dark:text-slate-300 min-w-[40px] text-center">{t.requiredQuantity ?? t.quantity}</span>
                                <button onClick={() => handleUpdateToolQuantity(idx, 'requiredQuantity', 1)} className="px-2 py-1 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 border-l border-slate-200 dark:border-slate-700">+</button>
                              </div>
                            </div>
                          </div>
                          <button onClick={() => handleRemoveToolFromStation(idx)} className="p-2 text-slate-300 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors mt-4 sm:mt-0">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Right Side: Add Tools */}
              <div className="w-full md:w-80 bg-slate-50/50 dark:bg-slate-800/20 p-6 overflow-y-auto">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Adicionar Ferramenta</h3>

                {/* Search from Catalog */}
                <div className="space-y-3">
                  <p className="text-xs font-bold text-slate-500">Do Catálogo</p>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Buscar no catálogo..."
                      value={toolSearch}
                      onChange={e => setToolSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {availableTools.map(tool => (
                      <button 
                        key={tool.id}
                        onClick={() => handleAddToolToStation(tool)}
                        className="w-full flex items-center justify-between p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all text-left group"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{tool.name}</p>
                          <p className="text-[9px] text-slate-400 truncate">{tool.brand}</p>
                        </div>
                        <Plus className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-500" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end">
              <button 
                onClick={() => setIsManageToolsModalOpen(false)}
                className="px-8 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-md shadow-blue-900/20"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}
      {/* View Station Tools Modal */}
      {viewingStation && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Detalhes do Posto</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">{viewingStation.name} • {viewingStation.line}</p>
              </div>
              <button onClick={() => setViewingStation(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                <Wrench className="w-5 h-5 text-blue-600" />
                Ferramentas no Posto
              </h3>
              {viewingStation.tools.length === 0 ? (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                  Nenhuma ferramenta atribuída a este posto.
                </div>
              ) : (
                <div className="border border-slate-100 rounded-xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider border-b border-slate-100 dark:border-slate-700">
                        <th className="p-3 font-semibold">Ferramenta</th>
                        <th className="p-3 font-semibold">Categoria</th>
                        <th className="p-3 font-semibold text-center">Atual</th>
                        <th className="p-3 font-semibold text-center">Necessária</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewingStation.tools.map((t, idx) => (
                        <tr key={idx} className="border-b border-slate-50 dark:border-slate-700/50 last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                          <td className="p-3 font-medium text-slate-800 dark:text-slate-200">{t.name}</td>
                          <td className="p-3 text-slate-600 dark:text-slate-400 text-sm">{t.category}</td>
                          <td className="p-3 text-center">
                            <span className={`inline-flex items-center justify-center font-bold px-2 py-0.5 rounded text-sm ${t.quantity < (t.requiredQuantity ?? t.quantity) ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>
                              {t.quantity}
                            </span>
                          </td>
                          <td className="p-3 text-center text-slate-600 dark:text-slate-400 font-medium">
                            {t.requiredQuantity ?? t.quantity}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end">
              <button
                onClick={() => setViewingStation(null)}
                className="px-6 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
