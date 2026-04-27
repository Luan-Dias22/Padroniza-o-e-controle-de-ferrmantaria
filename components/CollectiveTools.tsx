'use client';

import { useState, useMemo } from 'react';
import { CollectiveStation, CollectiveLine, Tool, StockEntry } from '@/lib/data';
import { Plus, Edit2, Trash2, Search, LayoutGrid, Wrench, Settings2, ChevronRight, Building2, AlertCircle, X, Eye, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ConfirmModal from './ConfirmModal';
import { sortByName } from '@/lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function CollectiveTools({
  lines, setLines,
  stations, setStations,
  tools,
  stockEntries = [],
  isGuest = false
}: {
  lines: CollectiveLine[], setLines: (lines: CollectiveLine[]) => void,
  stations: CollectiveStation[], setStations: (stations: CollectiveStation[]) => void,
  tools: Tool[],
  stockEntries?: StockEntry[],
  isGuest?: boolean
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

  const generateResponsibilityTerm = () => {
    if (selectedLineId === 'all') {
      alert('Por favor, selecione uma linha específica para gerar o termo de responsabilidade.');
      return;
    }

    const line = lines.find(l => l.id === selectedLineId);
    if (!line) return;

    const lineStations = stations.filter(s => s.line === line.name);
    const hasTools = lineStations.some(s => s.tools.length > 0);

    if (!hasTools) {
      alert('Esta linha não possui ferramentas registradas nos postos.');
      return;
    }
    
    const doc = new jsPDF();
    const date = new Date().toLocaleDateString('pt-BR');

    // Title
    doc.setFontSize(14);
    doc.text('TERMO DE RESPONSABILIDADE - FERRAMENTAS COLETIVAS', 105, 15, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text(`Linha: ${line.name}`, 14, 25);
    doc.text(`Data de Emissão: ${date}`, 14, 30);

    doc.setFontSize(9);
    const text = 'Pelo presente termo, a linha e seus respectivos responsáveis declaram estar cientes da guarda e conservação das ferramentas abaixo relacionadas, destinadas ao uso coletivo nos postos de trabalho desta linha. O extravio ou dano por mau uso poderá ser passível de medidas administrativas.';
    doc.text(text, 14, 38, { maxWidth: 180 });

    let currentY = 50;

    lineStations.sort((a, b) => a.name.localeCompare(b.name)).forEach(station => {
      if (station.tools.length === 0) return;

      autoTable(doc, {
        startY: currentY,
        head: [
          [{ content: `Posto: ${station.name}`, colSpan: 4, styles: { fillColor: [51, 65, 85], halign: 'left', fontStyle: 'bold', fontSize: 9 } }],
          ['Ferramenta', 'Categoria', 'Nec.', 'Atu.']
        ],
        body: station.tools.map(t => [
          t.name,
          t.category,
          t.requiredQuantity ?? '-',
          t.quantity
        ]),
        theme: 'striped',
        styles: { fontSize: 7, cellPadding: 1.5 },
        headStyles: { fillColor: [71, 85, 105], fontSize: 7.5 },
        columnStyles: {
          2: { halign: 'center', cellWidth: 15 },
          3: { halign: 'center', cellWidth: 15 }
        },
        margin: { left: 14, right: 14 }
      });

      currentY = (doc as any).lastAutoTable.finalY + 6;
      
      // Check if we need room for signature on same page
      if (currentY > 260) {
        doc.addPage();
        currentY = 15;
      }
    });

    // Signature Area
    if (currentY > 250) {
      doc.addPage();
      currentY = 30;
    } else {
      currentY += 15;
    }

    doc.setFontSize(9);
    doc.line(14, currentY, 90, currentY);
    doc.text('Responsável pela Linha (Assinatura)', 14, currentY + 4);

    doc.line(120, currentY, 196, currentY);
    doc.text('Gerência / Supervisão (Assinatura)', 120, currentY + 4);

    doc.save(`termo_responsabilidade_${line.name.replace(/\s+/g, '_')}.pdf`);
  };

  const availableTools = tools.filter(t => 
    t.name.toLowerCase().includes(toolSearch.toLowerCase()) || 
    t.brand.toLowerCase().includes(toolSearch.toLowerCase())
  );

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

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-500/10 border border-indigo-500/30 rounded-xl flex items-center justify-center shadow-sm">
            <LayoutGrid className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-sans tracking-tight text-white tracking-tight">Ferramentas Coletivas</h1>
            <p className="text-zinc-400 text-sm mt-0.5 font-mono">Gerencie conjuntos de ferramentas compartilhadas em postos de trabalho.</p>
          </div>
        </div>
        {!isGuest && (
          <div className="flex gap-3">
            <button 
              onClick={() => { setEditingLine(null); setLineFormData({ name: '' }); setIsLineModalOpen(true); }}
              className="px-5 py-2.5 bg-zinc-900/50 border border-white/105 text-zinc-300 rounded-xl hover:bg-zinc-900 transition-all flex items-center gap-2 text-sm font-medium"
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
              className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl hover:from-indigo-500 hover:to-blue-500 transition-all flex items-center gap-2 text-sm font-medium shadow-sm"
            >
              <Plus className="w-4 h-4" /> Novo Posto
            </button>
          </div>
        )}
      </div>

      {/* Line Selector & Summary */}
      <motion.div variants={itemVariants} className="bg-[#0a0a0a] rounded-xl shadow-xl border border-white/105 p-5 flex flex-wrap items-center gap-4">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="flex flex-wrap gap-2 flex-1">
            <button 
              onClick={() => setSelectedLineId('all')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                selectedLineId === 'all' 
                  ? 'bg-indigo-600 text-white shadow-[0_0_10px_rgba(99,102,241,0.3)]' 
                  : 'bg-zinc-900/30 border border-white/105 text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-200'
              }`}
            >
              Todas as Linhas
            </button>
            {[...lines].sort((a, b) => sortByName(a.name, b.name)).map(line => (
              <button 
                key={line.id}
                onClick={() => setSelectedLineId(line.id)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  selectedLineId === line.id 
                    ? 'bg-indigo-600 text-white shadow-[0_0_10px_rgba(99,102,241,0.3)]' 
                    : 'bg-zinc-900/30 border border-white/105 text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-200'
                }`}
              >
                {line.name}
              </button>
            ))}
            {!isGuest && (
              <button 
                onClick={() => { setEditingLine(null); setLineFormData({ name: '' }); setIsLineModalOpen(true); }}
                className="px-4 py-2 border border-dashed border-white/5 bg-transparent/30 text-zinc-500 rounded-xl text-sm hover:border-indigo-500/50 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all flex items-center gap-2"
              >
                <Plus className="w-3.5 h-3.5" /> Nova Linha
              </button>
            )}
          </div>
          
          {selectedLineId !== 'all' && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={generateResponsibilityTerm}
              className="px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500 text-indigo-400 hover:text-white border border-indigo-500/20 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-sm"
            >
              <FileText className="w-4 h-4" />
              Imprimir Termo de Responsabilidade
            </motion.button>
          )}
        </div>
      </motion.div>

      {/* Stations Grid/Table */}
      <motion.div variants={itemVariants} className="bg-[#0a0a0a] rounded-xl shadow-xl border border-white/105 overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-900/30 text-zinc-400 text-xs font-mono uppercase tracking-wider border-b border-white/5">
                <th className="p-4 font-semibold">Posto de Trabalho</th>
                <th className="p-4 font-semibold">Linha</th>
                <th className="p-4 font-semibold">Ferramentas Coletivas</th>
                <th className="p-4 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filteredStations.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-12 text-center">
                    <div className="flex flex-col items-center justify-center text-zinc-500 space-y-4">
                      <div className="w-16 h-16 bg-zinc-900/50 rounded-2xl flex items-center justify-center border border-white/105">
                        <Building2 className="w-8 h-8 text-slate-600" />
                      </div>
                      <p className="text-sm font-mono">Nenhum posto encontrado para esta seleção.</p>
                      <button 
                        onClick={() => { setEditingStation(null); setStationFormData({ name: '', lineId: lines[0]?.id || '' }); setIsStationModalOpen(true); }}
                        className="text-indigo-400 text-sm font-bold hover:text-indigo-300 hover:underline transition-colors"
                      >
                        Criar primeiro posto
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredStations.map((station, idx) => (
                  <motion.tr 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    key={station.id} 
                    className="hover:bg-zinc-900/30 transition-colors group"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl flex items-center justify-center shadow-inner">
                          <Settings2 className="w-5 h-5" />
                        </div>
                        <span className="font-bold text-zinc-200">{station.name}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="px-3 py-1.5 bg-zinc-900/50 border border-white/105 text-zinc-300 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider">
                        {station.line}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-zinc-900/50 rounded-lg flex items-center justify-center border border-white/105">
                          <Wrench className="w-4 h-4 text-zinc-400" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-zinc-300">
                            {station.tools.reduce((acc, t) => {
                              const stockQty = stockEntries
                                .filter(se => se.type === 'collective' && se.station === station.name && se.toolId === t.toolId)
                                .reduce((sum, se) => sum + se.quantity, 0);
                              return acc + t.quantity + stockQty;
                            }, 0)} / {station.tools.reduce((acc, t) => acc + (t.requiredQuantity ?? t.quantity), 0)} itens
                          </span>
                          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">{station.tools.length} tipos</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => setViewingStation(station)}
                          className="p-2 text-zinc-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors"
                          title="Visualizar Ferramentas"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {!isGuest && (
                          <>
                            <button 
                              onClick={() => { setManagingStation(station); setIsManageToolsModalOpen(true); }}
                              className="px-4 py-2 bg-zinc-900/50 border border-white/105 text-zinc-300 rounded-lg hover:bg-indigo-600 hover:border-indigo-500 hover:text-white transition-all text-xs font-bold flex items-center gap-2"
                            >
                              <Wrench className="w-3.5 h-3.5" /> Gerenciar
                            </button>
                            <button 
                              onClick={() => { 
                                const line = lines.find(l => l.name === station.line);
                                setEditingStation(station); 
                                setStationFormData({ name: station.name, lineId: line?.id || '' }); 
                                setIsStationModalOpen(true); 
                              }}
                              className="p-2 text-zinc-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteStation(station)}
                              className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Line Management Modal */}
      <AnimatePresence>
        {isLineModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-zinc-900 border border-white/105 rounded-xl shadow-2xl w-full max-w-md overflow-hidden relative"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-blue-500" />
              <div className="p-6 border-b border-white/5 flex justify-between items-center bg-zinc-900/80">
                <h2 className="text-xl font-bold font-sans tracking-tight text-white">Gerenciar Linhas</h2>
                <button onClick={() => setIsLineModalOpen(false)} className="text-zinc-400 hover:text-white hover:bg-zinc-900 p-1.5 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <form onSubmit={handleSaveLine} className="flex gap-3">
                  <input 
                    type="text" 
                    placeholder="Nome da nova linha..."
                    value={lineFormData.name}
                    onChange={e => setLineFormData({ name: e.target.value })}
                    className="flex-1 p-3 bg-zinc-900/30 border border-white/105 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none text-sm text-zinc-200 transition-all"
                    autoFocus
                  />
                  <button type="submit" className="px-5 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 text-sm font-bold shadow-[0_0_10px_rgba(99,102,241,0.2)] transition-all">
                    {editingLine ? 'Salvar' : 'Adicionar'}
                  </button>
                </form>

                <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                  {lines.map(line => (
                    <div key={line.id} className="flex items-center justify-between p-4 bg-transparent/30 rounded-xl border border-white/105 hover:border-white/5 transition-colors group">
                      <span className="font-medium text-zinc-300">{line.name}</span>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setEditingLine(line); setLineFormData({ name: line.name }); }} className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteLine(line)} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {lines.length === 0 && <p className="text-center text-zinc-500 text-sm font-mono py-6">Nenhuma linha cadastrada.</p>}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Station Modal */}
      <AnimatePresence>
        {isStationModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-zinc-900 border border-white/105 rounded-xl shadow-2xl w-full max-w-md overflow-hidden relative"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
              <div className="p-6 border-b border-white/5 flex justify-between items-center bg-zinc-900/80">
                <h2 className="text-xl font-bold font-sans tracking-tight text-white">{editingStation ? 'Editar Posto' : 'Novo Posto de Trabalho'}</h2>
                <button onClick={() => setIsStationModalOpen(false)} className="text-zinc-400 hover:text-white hover:bg-zinc-900 p-1.5 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSaveStation} className="p-6 space-y-5">
                <div>
                  <label className="block text-xs font-mono text-zinc-400 uppercase tracking-wider mb-2">Nome do Posto *</label>
                  <input 
                    type="text" 
                    placeholder="ex: Posto 1 - Crimpagem"
                    value={stationFormData.name}
                    onChange={e => setStationFormData({ ...stationFormData, name: e.target.value })}
                    className="w-full p-3 bg-zinc-900/30 border border-white/105 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none text-zinc-200 transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-zinc-400 uppercase tracking-wider mb-2">Linha de Montagem *</label>
                  <select 
                    value={stationFormData.lineId}
                    onChange={e => setStationFormData({ ...stationFormData, lineId: e.target.value })}
                    className="w-full p-3 bg-zinc-900/30 border border-white/105 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none text-zinc-200 transition-all appearance-none"
                    required
                  >
                    <option value="" disabled>Selecione uma linha</option>
                    {[...lines].sort((a, b) => sortByName(a.name, b.name)).map(line => (
                      <option key={line.id} value={line.id}>{line.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-white/5">
                  <button 
                    type="button" 
                    onClick={() => setIsStationModalOpen(false)}
                    className="px-5 py-2.5 text-zinc-300 font-medium border border-white/105 hover:bg-zinc-900 rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl hover:from-blue-500 hover:to-indigo-500 transition-all shadow-sm"
                  >
                    {editingStation ? 'Salvar Alterações' : 'Criar Posto'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Manage Tools Modal */}
      <AnimatePresence>
        {isManageToolsModalOpen && managingStation && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-zinc-900 border border-white/105 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col relative"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500" />
              <div className="p-6 border-b border-white/5 flex justify-between items-center bg-zinc-900/80">
                <div>
                  <h2 className="text-xl font-bold font-sans tracking-tight text-white">Gerenciar Ferramentas</h2>
                  <p className="text-sm text-zinc-400 font-mono mt-1">{managingStation.name} • {managingStation.line}</p>
                </div>
                <button onClick={() => setIsManageToolsModalOpen(false)} className="text-zinc-400 hover:text-white hover:bg-zinc-900 p-1.5 rounded-lg transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                {/* Left Side: Current Tools */}
                <div className="flex-1 p-6 overflow-y-auto border-r border-white/5 custom-scrollbar">
                  <h3 className="text-xs font-mono font-bold text-zinc-500 uppercase tracking-widest mb-5">Ferramentas no Posto</h3>
                  <div className="space-y-3">
                    {managingStation.tools.length === 0 ? (
                      <div className="text-center py-16 border-2 border-dashed border-white/5 rounded-2xl bg-transparent/30">
                        <Wrench className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                        <p className="text-zinc-500 text-sm font-mono">Nenhuma ferramenta adicionada.</p>
                      </div>
                    ) : (
                      managingStation.tools.map((t, idx) => (
                        <motion.div 
                          layout
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          key={idx} 
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-zinc-900/30 rounded-2xl border border-white/105 hover:border-white/5 transition-colors group gap-4"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-zinc-200 text-sm sm:text-base leading-tight line-clamp-2" title={t.name}>{t.name}</p>
                            <p className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest mt-1">{t.category}</p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0 bg-zinc-900/50 p-2 rounded-xl border border-white/105/50">
                            <div className="flex flex-col items-center">
                              <span className="text-[9px] font-mono font-bold text-blue-400 uppercase mb-1">Atual</span>
                              <div className="flex items-center bg-transparent border border-white/105 rounded-lg overflow-hidden">
                                <button onClick={() => handleUpdateToolQuantity(idx, 'quantity', -1)} className="px-2 py-1 hover:bg-zinc-900 text-zinc-400 border-r border-white/5 transition-colors">-</button>
                                <span className="px-2 py-1 font-bold text-zinc-200 min-w-[32px] text-center font-mono text-xs">{t.quantity}</span>
                                <button onClick={() => handleUpdateToolQuantity(idx, 'quantity', 1)} className="px-2 py-1 hover:bg-zinc-900 text-zinc-400 border-l border-white/5 transition-colors">+</button>
                              </div>
                            </div>
                            <span className="text-slate-700 font-light text-xl self-end mb-1">/</span>
                            <div className="flex flex-col items-center">
                              <span className="text-[9px] font-mono font-bold text-indigo-400 uppercase mb-1">Nec.</span>
                              <div className="flex items-center bg-transparent border border-white/105 rounded-lg overflow-hidden">
                                <button onClick={() => handleUpdateToolQuantity(idx, 'requiredQuantity', -1)} className="px-2 py-1 hover:bg-zinc-900 text-zinc-400 border-r border-white/5 transition-colors">-</button>
                                <span className="px-2 py-1 font-bold text-zinc-200 min-w-[32px] text-center font-mono text-xs">{t.requiredQuantity ?? t.quantity}</span>
                                <button onClick={() => handleUpdateToolQuantity(idx, 'requiredQuantity', 1)} className="px-2 py-1 hover:bg-zinc-900 text-zinc-400 border-l border-white/5 transition-colors">+</button>
                              </div>
                            </div>
                            <button onClick={() => handleRemoveToolFromStation(idx)} className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors self-end mb-0.5">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                </div>

                {/* Right Side: Add Tools */}
                <div className="w-full md:w-96 bg-zinc-900/30 p-6 overflow-y-auto custom-scrollbar">
                  <h3 className="text-xs font-mono font-bold text-zinc-500 uppercase tracking-widest mb-5">Adicionar Ferramenta</h3>

                  {/* Search from Catalog */}
                  <div className="space-y-4">
                    <p className="text-[10px] font-mono font-bold text-slate-600 uppercase tracking-wider">Do Catálogo</p>
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-3 text-zinc-500" />
                      <input 
                        type="text" 
                        placeholder="Buscar no catálogo..."
                        value={toolSearch}
                        onChange={e => setToolSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-white/105 rounded-xl text-sm text-zinc-200 outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                      />
                    </div>
                    <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar pr-2">
                      {availableTools.map(tool => (
                        <button 
                          key={tool.id}
                          onClick={() => handleAddToolToStation(tool)}
                          className="w-full flex items-center justify-between p-3.5 bg-zinc-900 border border-white/105 rounded-xl hover:border-indigo-500/50 hover:bg-indigo-500/10 transition-all text-left group"
                        >
                          <div className="min-w-0 pr-3 flex-1">
                            <p className="text-sm font-medium text-zinc-300 line-clamp-2 group-hover:text-indigo-300 transition-colors" title={tool.name}>{tool.name}</p>
                            <p className="text-[10px] font-mono text-zinc-500 mt-1 uppercase tracking-wider truncate">{tool.brand}</p>
                          </div>
                          <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                            <Plus className="w-4 h-4 text-zinc-400 group-hover:text-white" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-5 border-t border-white/5 bg-zinc-900/80 flex justify-end">
                <button 
                  onClick={() => setIsManageToolsModalOpen(false)}
                  className="px-8 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold rounded-xl hover:from-indigo-500 hover:to-blue-500 transition-all shadow-sm"
                >
                  Concluir
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* View Station Tools Modal */}
      <AnimatePresence>
        {viewingStation && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-zinc-900 border border-white/105 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col relative"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-cyan-500" />
              <div className="p-6 border-b border-white/5 flex justify-between items-center bg-zinc-900/80">
                <div>
                  <h2 className="text-xl font-bold font-sans tracking-tight text-white">Detalhes do Posto</h2>
                  <p className="text-sm text-zinc-400 font-mono mt-1">{viewingStation.name} • {viewingStation.line}</p>
                </div>
                <button onClick={() => setViewingStation(null)} className="text-zinc-400 hover:text-white hover:bg-zinc-900 p-1.5 rounded-lg transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                <h3 className="font-bold text-white mb-5 flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center border border-blue-500/20">
                    <Wrench className="w-4 h-4 text-blue-400" />
                  </div>
                  Ferramentas no Posto
                </h3>
                {viewingStation.tools.length === 0 ? (
                  <div className="text-center py-12 text-zinc-500 bg-zinc-900/30 rounded-2xl border border-white/105 font-mono text-sm">
                    Nenhuma ferramenta atribuída a este posto.
                  </div>
                ) : (
                  <div className="border border-white/105 rounded-xl overflow-hidden bg-transparent/30">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-zinc-900/50 text-zinc-400 text-[10px] font-mono uppercase tracking-wider border-b border-white/5">
                          <th className="p-4 font-semibold">Ferramenta</th>
                          <th className="p-4 font-semibold">Categoria</th>
                          <th className="p-4 font-semibold text-center">Atual</th>
                          <th className="p-4 font-semibold text-center">Necessária</th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewingStation.tools.map((t, idx) => {
                          const stockQty = stockEntries
                            .filter(se => se.type === 'collective' && se.station === viewingStation.name && se.toolId === t.toolId)
                            .reduce((sum, se) => sum + se.quantity, 0);
                          const currentQty = t.quantity + stockQty;
                          const requiredQty = t.requiredQuantity ?? t.quantity;
                          
                          return (
                            <tr key={idx} className="border-b border-white/5/50 last:border-0 hover:bg-zinc-900/30 transition-colors">
                              <td className="p-4 font-medium text-zinc-200 max-w-[200px]">
                                <div className="line-clamp-2" title={t.name}>{t.name}</div>
                              </td>
                              <td className="p-4 text-zinc-400 text-xs font-mono uppercase tracking-wider truncate max-w-[120px]">{t.category}</td>
                              <td className="p-4 text-center">
                                <span className={`inline-flex items-center justify-center font-bold px-3 py-1 rounded-lg text-sm font-mono border ${currentQty < requiredQty ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                                  {currentQty}
                                </span>
                              </td>
                              <td className="p-4 text-center text-zinc-400 font-mono font-bold">
                                {requiredQty}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="p-5 border-t border-white/5 bg-zinc-900/80 flex justify-end">
                <button
                  onClick={() => setViewingStation(null)}
                  className="px-6 py-2.5 border border-white/105 text-zinc-300 font-medium rounded-xl hover:bg-zinc-900 transition-colors"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
