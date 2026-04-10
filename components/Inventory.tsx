import React, { useState, useRef, useEffect } from 'react';
import { Tool, Department, CollectiveLine, StockEntry, CollectiveStation } from '@/lib/data';
import { PackagePlus, Search, Plus, Trash2, Package, ChevronDown, AlertTriangle, X, Users, User, CheckSquare, Square, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { sortByName } from '@/lib/utils';

interface InventoryProps {
  tools: Tool[];
  departments: Department[];
  collectiveLines: CollectiveLine[];
  collectiveStations: CollectiveStation[];
  stockEntries: StockEntry[];
  setStockEntries: (entries: StockEntry[]) => void;
}

export default function Inventory({ tools, departments, collectiveLines, collectiveStations, stockEntries, setStockEntries }: InventoryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedToolId, setSelectedToolId] = useState('');
  const [selectedLineId, setSelectedLineId] = useState('');
  const [quantity, setQuantity] = useState('');
  
  const [toolSearchQuery, setToolSearchQuery] = useState('');
  const [isToolDropdownOpen, setIsToolDropdownOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);
  const [stockType, setStockType] = useState<'individual' | 'collective'>('individual');
  const [selectedStation, setSelectedStation] = useState('');
  const [isMultiSelectModalOpen, setIsMultiSelectModalOpen] = useState(false);
  const [tempSelectedToolIds, setTempSelectedToolIds] = useState<string[]>([]);
  const [multiSelectSearch, setMultiSelectSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsToolDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const allLines = [
    ...departments.map(d => ({ id: d.id, name: d.name })),
    ...collectiveLines.map(l => ({ id: `line_${l.id}`, name: l.name }))
  ].filter((line, index, self) => 
    index === self.findIndex((t) => t.name === line.name)
  ).sort((a, b) => sortByName(a.name, b.name));

  const filteredLines = stockType === 'collective' 
    ? allLines.filter(line => collectiveStations.some(s => s.line === line.name))
    : allLines;

  const handleAddStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedToolId || !selectedLineId || !quantity) return;

    const newEntry: StockEntry = {
      id: `se_${new Date().getTime()}`,
      toolId: selectedToolId,
      lineId: selectedLineId,
      quantity: parseInt(quantity),
      date: new Date().toISOString(),
      type: stockType,
      ...(stockType === 'collective' && selectedStation ? { station: selectedStation } : {})
    };

    setStockEntries([...stockEntries, newEntry]);
    setSelectedToolId('');
    setToolSearchQuery('');
    setSelectedLineId('');
    setQuantity('');
    setSelectedStation('');
  };

  const handleAddMultipleStock = () => {
    if (tempSelectedToolIds.length === 0 || !selectedLineId || !quantity) return;

    const newEntries: StockEntry[] = tempSelectedToolIds.map((toolId, index) => ({
      id: `se_${new Date().getTime()}_${index}`,
      toolId,
      lineId: selectedLineId,
      quantity: parseInt(quantity),
      date: new Date().toISOString(),
      type: stockType,
      ...(stockType === 'collective' && selectedStation ? { station: selectedStation } : {})
    }));

    setStockEntries([...stockEntries, ...newEntries]);
    setTempSelectedToolIds([]);
    setSelectedLineId('');
    setQuantity('');
    setSelectedStation('');
    setIsMultiSelectModalOpen(false);
  };

  const toggleToolSelection = (toolId: string) => {
    setTempSelectedToolIds(prev => 
      prev.includes(toolId) 
        ? prev.filter(id => id !== toolId) 
        : [...prev, toolId]
    );
  };

  const handleDeleteEntry = (id: string) => {
    setEntryToDelete(id);
  };

  const confirmDelete = () => {
    if (entryToDelete) {
      setStockEntries(stockEntries.filter(e => e.id !== entryToDelete));
      setEntryToDelete(null);
    }
  };

  const filteredEntries = stockEntries.filter(entry => {
    const tool = tools.find(t => t.id === entry.toolId);
    const line = allLines.find(l => l.id === entry.lineId);
    if (!searchQuery) return true;
    
    const searchLower = searchQuery.toLowerCase();
    return (
      tool?.name.toLowerCase().includes(searchLower) ||
      tool?.brand.toLowerCase().includes(searchLower) ||
      line?.name.toLowerCase().includes(searchLower)
    );
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const filteredTools = tools.filter(t => 
    t.name.toLowerCase().includes(toolSearchQuery.toLowerCase()) || 
    t.brand.toLowerCase().includes(toolSearchQuery.toLowerCase())
  );

  const multiSelectFilteredTools = tools.filter(t => 
    t.name.toLowerCase().includes(multiSelectSearch.toLowerCase()) || 
    t.brand.toLowerCase().includes(multiSelectSearch.toLowerCase())
  );

  const selectedTool = tools.find(t => t.id === selectedToolId);
  const selectedLineName = allLines.find(l => l.id === selectedLineId)?.name || '';
  const availableStations = collectiveStations
    .filter(s => s.line === selectedLineName)
    .sort((a, b) => {
      const numA = parseInt(a.name.match(/\d+/)?.[0] || '0', 10);
      const numB = parseInt(b.name.match(/\d+/)?.[0] || '0', 10);
      if (numA !== numB) return numA - numB;
      return a.name.localeCompare(b.name);
    });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-indigo-500/10 border border-indigo-500/30 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.2)]">
          <Package className="w-5 h-5 text-indigo-400" />
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Estoque</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-1 bg-slate-900/50 backdrop-blur-md rounded-2xl shadow-xl border border-slate-800 p-6 h-fit"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center">
              <PackagePlus className="w-4 h-4 text-indigo-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Nova Entrada</h2>
          </div>

          <form onSubmit={handleAddStock} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Tipo de Estoque</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setStockType('individual');
                  }}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${
                    stockType === 'individual'
                      ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                      : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:bg-slate-900'
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span className="text-sm font-medium">Individual</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStockType('collective');
                    // Check if current selected line is still valid for collective
                    const isStillAvailable = allLines.filter(line => collectiveStations.some(s => s.line === line.name)).some(l => l.id === selectedLineId);
                    if (!isStillAvailable) {
                      setSelectedLineId('');
                      setSelectedStation('');
                    }
                  }}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${
                    stockType === 'collective'
                      ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                      : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:bg-slate-900'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span className="text-sm font-medium">Coletiva</span>
                </button>
              </div>
            </div>

            <div className="relative" ref={dropdownRef}>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-slate-400">Ferramenta</label>
                <button
                  type="button"
                  onClick={() => setIsMultiSelectModalOpen(true)}
                  className="text-xs font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
                >
                  <Layers className="w-3 h-3" />
                  Seleção Múltipla
                </button>
              </div>
              <div 
                className="w-full p-2.5 bg-slate-950/50 border border-slate-800 rounded-xl text-sm text-slate-200 focus-within:ring-2 focus-within:ring-indigo-500/50 focus-within:border-indigo-500 transition-all flex items-center justify-between cursor-pointer"
                onClick={() => setIsToolDropdownOpen(!isToolDropdownOpen)}
              >
                <span className={selectedTool ? "text-slate-200" : "text-slate-500"}>
                  {selectedTool ? `${selectedTool.name} (${selectedTool.brand})` : 'Selecione uma ferramenta...'}
                </span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isToolDropdownOpen ? 'rotate-180' : ''}`} />
              </div>

              {isToolDropdownOpen && (
                <div className="absolute z-50 w-full mt-2 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden">
                  <div className="p-2 border-b border-slate-800">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type="text"
                        placeholder="Buscar ferramenta..."
                        value={toolSearchQuery}
                        onChange={(e) => setToolSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-950 rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 border border-slate-800"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                  <div className="max-h-60 overflow-y-auto custom-scrollbar">
                    {filteredTools.length === 0 ? (
                      <div className="p-3 text-sm text-slate-500 text-center">Nenhuma ferramenta encontrada.</div>
                    ) : (
                      filteredTools.map(t => (
                        <div
                          key={t.id}
                          className={`p-3 text-sm cursor-pointer hover:bg-indigo-500/10 hover:text-indigo-300 transition-colors ${selectedToolId === t.id ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-300'}`}
                          onClick={() => {
                            setSelectedToolId(t.id);
                            setIsToolDropdownOpen(false);
                            setToolSearchQuery('');
                          }}
                        >
                          <div className="font-medium">{t.name}</div>
                          <div className="text-xs text-slate-500">{t.brand}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Linha / Departamento Destino</label>
              <select
                required
                value={selectedLineId}
                onChange={(e) => {
                  setSelectedLineId(e.target.value);
                  setSelectedStation('');
                }}
                className="w-full p-2.5 bg-slate-950/50 border border-slate-800 rounded-xl text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
              >
                <option value="">Selecione o destino...</option>
                {filteredLines.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>

            {stockType === 'collective' && selectedLineId && availableStations.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
              >
                <label className="block text-sm font-medium text-slate-400 mb-1">Posto de Montagem (Opcional)</label>
                <select
                  value={selectedStation}
                  onChange={(e) => setSelectedStation(e.target.value)}
                  className="w-full p-2.5 bg-slate-950/50 border border-slate-800 rounded-xl text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
                >
                  <option value="">Geral (Para toda a linha)</option>
                  {availableStations.map(s => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </motion.div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Quantidade</label>
              <input
                type="number"
                required
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full p-2.5 bg-slate-950/50 border border-slate-800 rounded-xl text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
                placeholder="Ex: 10"
              />
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-4 py-2.5 rounded-xl hover:from-indigo-500 hover:to-violet-500 transition-all shadow-[0_0_15px_rgba(99,102,241,0.3)] font-medium mt-2"
            >
              <Plus className="w-4 h-4" />
              Adicionar ao Estoque
            </button>
          </form>
        </motion.div>

        {/* List */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2 bg-slate-900/50 backdrop-blur-md rounded-2xl shadow-xl border border-slate-800 overflow-hidden flex flex-col h-[600px]"
        >
          <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-900/80">
            <h2 className="text-lg font-semibold text-white">Histórico de Entradas</h2>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar entradas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-700 bg-slate-950/50 text-slate-200 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all text-sm"
              />
            </div>
          </div>

          <div className="flex-1 overflow-auto p-5">
            <div className="space-y-3">
              {filteredEntries.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400">Nenhuma entrada de estoque encontrada.</p>
                </div>
              ) : (
                filteredEntries.map(entry => {
                  const tool = tools.find(t => t.id === entry.toolId);
                  const line = allLines.find(l => l.id === entry.lineId);
                  
                  return (
                    <div key={entry.id} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-800 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-indigo-500/10 rounded-lg flex items-center justify-center border border-indigo-500/20 shrink-0">
                          <Package className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div>
                          <h3 className="text-white font-medium">{tool?.name || 'Ferramenta Removida'}</h3>
                          <div className="flex items-center gap-2 text-sm text-slate-400 mt-1">
                            <span className="bg-slate-900 px-2 py-0.5 rounded-md border border-slate-700">{tool?.brand || '-'}</span>
                            <span className={`px-2 py-0.5 rounded-md border ${entry.type === 'collective' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
                              {entry.type === 'collective' ? 'Coletiva' : 'Individual'}
                            </span>
                            <span>Destino: <span className="text-indigo-300">{line?.name || 'Desconhecido'}</span></span>
                            {entry.station && (
                              <span>Posto: <span className="text-indigo-300">{entry.station}</span></span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end">
                        <div className="text-right">
                          <div className="text-2xl font-bold text-emerald-400">+{entry.quantity}</div>
                          <div className="text-xs text-slate-500">{new Date(entry.date).toLocaleDateString('pt-BR')}</div>
                        </div>
                        <button
                          onClick={() => handleDeleteEntry(entry.id)}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors border border-transparent hover:border-red-400/20"
                          title="Remover Entrada"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="hidden sm:inline">Excluir</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {entryToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
              onClick={() => setEntryToDelete(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-md overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-red-500" />
              <div className="flex items-start gap-4 mb-6">
                <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0 border border-red-500/20">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">Excluir Entrada</h3>
                  <p className="text-slate-400 text-sm">
                    Tem certeza que deseja remover esta entrada de estoque? Esta ação não pode ser desfeita.
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setEntryToDelete(null)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-red-500 hover:bg-red-600 transition-colors shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                >
                  Sim, Excluir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Multi-Select Modal */}
      <AnimatePresence>
        {isMultiSelectModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
              onClick={() => setIsMultiSelectModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/80 backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center">
                    <Layers className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Seleção Múltipla</h3>
                    <p className="text-xs text-slate-500">{tempSelectedToolIds.length} ferramentas selecionadas</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsMultiSelectModalOpen(false)}
                  className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 border-b border-slate-800 bg-slate-950/30 flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Buscar ferramentas por nome ou marca..."
                    value={multiSelectSearch}
                    onChange={(e) => setMultiSelectSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setTempSelectedToolIds(multiSelectFilteredTools.map(t => t.id))}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
                  >
                    Selecionar Filtrados
                  </button>
                  <button
                    onClick={() => setTempSelectedToolIds([])}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
                  >
                    Limpar
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {multiSelectFilteredTools.length === 0 ? (
                    <div className="col-span-full py-12 text-center text-slate-500">
                      Nenhuma ferramenta encontrada para &quot;{multiSelectSearch}&quot;
                    </div>
                  ) : (
                    multiSelectFilteredTools.map(t => (
                      <div
                        key={t.id}
                        onClick={() => toggleToolSelection(t.id)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${
                          tempSelectedToolIds.includes(t.id)
                            ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-300'
                            : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:bg-slate-800'
                        }`}
                      >
                        <div className="shrink-0">
                          {tempSelectedToolIds.includes(t.id) ? (
                            <CheckSquare className="w-5 h-5 text-indigo-400" />
                          ) : (
                            <Square className="w-5 h-5 text-slate-600" />
                          )}
                        </div>
                        <div className="overflow-hidden">
                          <div className={`font-medium truncate ${tempSelectedToolIds.includes(t.id) ? 'text-white' : ''}`}>
                            {t.name}
                          </div>
                          <div className="text-xs text-slate-500 truncate">{t.brand}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="p-6 border-t border-slate-800 bg-slate-900/80 flex flex-col sm:flex-row items-center gap-4">
                <div className="flex-1 text-sm text-slate-400">
                  As ferramentas selecionadas serão adicionadas com a quantidade e destino definidos no formulário principal.
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    onClick={() => setIsMultiSelectModalOpen(false)}
                    className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleAddMultipleStock}
                    disabled={tempSelectedToolIds.length === 0 || !selectedLineId || !quantity}
                    className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_15px_rgba(99,102,241,0.3)]"
                  >
                    Adicionar {tempSelectedToolIds.length} Itens
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
