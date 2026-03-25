import { useState } from 'react';
import { Employee, Assignment, Department, Tool, StandardToolList } from '@/lib/data';
import { Plus, Trash2, Edit2, Check, X, AlertTriangle, Eye, FileText, Download, Filter } from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function EmployeeAssignments({
  employees, setEmployees, departments, tools, standardLists, assignments, setAssignments
}: {
  employees: Employee[], setEmployees: (e: Employee[]) => void,
  departments: Department[], tools: Tool[], standardLists: StandardToolList[],
  assignments: Assignment[], setAssignments: (a: Assignment[]) => void
}) {
  const [isAssigning, setIsAssigning] = useState(false);
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);
  const [viewingAssignment, setViewingAssignment] = useState<Assignment | null>(null);
  
  // Form state
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [customTools, setCustomTools] = useState<{ toolId: string, quantity: number }[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'pending' | 'completed'>('all');
  const [assignmentSearch, setAssignmentSearch] = useState('');
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'selected' | 'unselected'>('all');

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

  const handleEmployeeSelect = (empId: string) => {
    setSelectedEmployeeId(empId);
    if (!empId) {
      setCustomTools([]);
      return;
    }
    const emp = employees.find(e => e.id === empId);
    const dept = departments.find(d => d.id === emp?.departmentId);
    const standardList = standardLists.find(s => s.id === dept?.standardListId);
    setCustomTools(standardList ? [...standardList.tools] : []);
  };

  const toggleCustomTool = (toolId: string) => {
    if (customTools.some(t => t.toolId === toolId)) {
      setCustomTools(customTools.filter(t => t.toolId !== toolId));
    } else {
      setCustomTools([...customTools, { toolId, quantity: 1 }]);
    }
  };

  const updateCustomToolQuantity = (toolId: string, quantity: number) => {
    if (quantity < 1) quantity = 1;
    setCustomTools(customTools.map(t => t.toolId === toolId ? { ...t, quantity } : t));
  };

  const handleSaveAssignment = () => {
    if (!selectedEmployeeId) return;
    
    const emp = employees.find(e => e.id === selectedEmployeeId);
    if (!emp) return;

    if (editingAssignmentId) {
      setAssignments(assignments.map(a => a.id === editingAssignmentId ? {
        ...a, employeeId: selectedEmployeeId, departmentId: emp.departmentId, assignedTools: customTools
      } : a));
    } else {
      setAssignments([...assignments, {
        id: crypto.randomUUID(),
        employeeId: selectedEmployeeId,
        departmentId: emp.departmentId,
        assignedTools: customTools,
        dateAssigned: new Date().toISOString()
      }]);
    }
    
    setIsAssigning(false);
    setEditingAssignmentId(null);
    setSelectedEmployeeId('');
    setCustomTools([]);
    setAssignmentSearch('');
    setAssignmentFilter('all');
  };

  const getMissingTools = (assignment: Assignment) => {
    const dept = departments.find(d => d.id === assignment.departmentId);
    const missingTools: { toolName: string, missingQty: number }[] = [];
    
    if (dept && dept.standardListId) {
      const standardList = standardLists.find(s => s.id === dept.standardListId);
      if (standardList) {
        standardList.tools.forEach(stdTool => {
          const assignedTool = assignment.assignedTools?.find(t => t.toolId === stdTool.toolId);
          const assignedQty = assignedTool ? assignedTool.quantity : 0;
          if (assignedQty < stdTool.quantity) {
            const tool = tools.find(t => t.id === stdTool.toolId);
            missingTools.push({
              toolName: tool ? tool.name : 'Desconhecida',
              missingQty: stdTool.quantity - assignedQty
            });
          }
        });
      }
    }
    return missingTools;
  };

  const handleEditAssignment = (assignment: Assignment) => {
    setIsAssigning(true);
    setEditingAssignmentId(assignment.id);
    setSelectedEmployeeId(assignment.employeeId);
    setCustomTools([...(assignment.assignedTools || [])]);
    setAssignmentSearch('');
    setAssignmentFilter('all');
  };

  const handleViewAssignment = (assignment: Assignment) => {
    setViewingAssignment(assignment);
  };

  const exportToPDF = (assignment: Assignment) => {
    const emp = employees.find(e => e.id === assignment.employeeId);
    const dept = departments.find(d => d.id === assignment.departmentId);
    const date = new Date(assignment.dateAssigned).toLocaleDateString();

    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(18);
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text('TERMO DE RESPONSABILIDADE E ENTREGA', 105, 20, { align: 'center' });
    doc.setFontSize(14);
    doc.text('VOLGA - CONTROLE DE FERRAMENTAS', 105, 30, { align: 'center' });
    
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.line(14, 35, 196, 35);
    
    // Employee Info
    doc.setFontSize(11);
    doc.setTextColor(71, 85, 105); // slate-600
    doc.text(`Colaborador: ${emp?.name || 'Desconhecido'}`, 14, 45);
    doc.text(`Matrícula: ${emp?.employeeId || 'N/A'}`, 14, 52);
    doc.text(`Departamento: ${dept?.name || 'Desconhecido'}`, 105, 45);
    doc.text(`Data de Entrega: ${date}`, 105, 52);
    
    // Agreement Text
    const agreementText = `Eu, ${emp?.name || '____________________'}, colaborador da empresa Volga, estou de acordo que recebi as ferramentas individuais abaixo relacionadas. A contar desta data, comprometo-me a devolvê-la em perfeito estado. Em caso de extravio e danos por mau uso que acarretem a perda total ou parcial do bem, fica obrigatório o ressarcimento ao proprietário dos prejuízos experimentados, no entanto o valor a ser pago é fixado de acordo com o estado em que a ferramenta se encontrava no ato da entrega.`;
    
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    const splitText = doc.splitTextToSize(agreementText, 182);
    doc.text(splitText, 14, 65);
    
    // Table
    const tableData = (assignment.assignedTools || []).map(at => {
      const tool = tools.find(t => t.id === at.toolId);
      return [
        tool?.brand || 'N/A',
        tool?.name || 'N/A',
        tool?.category || 'N/A',
        at.quantity.toString()
      ];
    });

    autoTable(doc, {
      startY: 65 + (splitText.length * 5) + 5,
      head: [['Marca', 'Ferramenta', 'Categoria', 'Quantidade']],
      body: tableData,
      theme: 'grid',
      headStyles: { 
        fillColor: [30, 41, 59], 
        textColor: [255, 255, 255],
        fontSize: 10,
        fontStyle: 'bold',
        halign: 'center'
      },
      bodyStyles: {
        fontSize: 9,
        halign: 'left'
      },
      columnStyles: {
        3: { halign: 'center' }
      }
    });

    let currentY = (doc as any).lastAutoTable.finalY || 100;

    const missingTools = getMissingTools(assignment);
    if (missingTools.length > 0) {
      doc.setFontSize(12);
      doc.setTextColor(180, 83, 9); // amber-700
      doc.text('FERRAMENTAS PENDENTES (A ENTREGAR)', 14, currentY + 15);
      
      const missingTableData = missingTools.map(mt => [mt.toolName, mt.missingQty.toString()]);
      
      autoTable(doc, {
        startY: currentY + 20,
        head: [['Ferramenta', 'Quantidade Faltante']],
        body: missingTableData,
        theme: 'grid',
        headStyles: { 
          fillColor: [251, 191, 36], // amber-400
          textColor: [30, 41, 59],
          fontSize: 10,
          fontStyle: 'bold',
          halign: 'center'
        },
        bodyStyles: {
          fontSize: 9,
          halign: 'left'
        },
        columnStyles: {
          1: { halign: 'center' }
        }
      });
      currentY = (doc as any).lastAutoTable.finalY || currentY + 40;
    }

    // Footer
    const finalY = currentY;
    
    // Signature lines
    doc.setDrawColor(30, 41, 59);
    doc.line(14, finalY + 40, 90, finalY + 40);
    doc.text('Assinatura do Colaborador', 14, finalY + 45);
    
    doc.line(120, finalY + 40, 196, finalY + 40);
    doc.text('Assinatura Responsável Volga', 120, finalY + 45);
    
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(`Documento gerado em ${new Date().toLocaleString()}`, 105, 285, { align: 'center' });

    doc.save(`termo_ferramentas_${emp?.name.replace(/\s+/g, '_')}.pdf`);
  };

  const handleDeleteAssignment = (id: string) => {
    setDeleteModal({
      isOpen: true,
      title: 'Excluir Atribuição',
      message: 'Excluir esta atribuição?',
      onConfirm: () => {
        setAssignments(assignments.filter(a => a.id !== id));
      }
    });
  };

  const filteredAssignments = assignments.filter(a => {
    if (filterType === 'all') return true;
    const missingTools = getMissingTools(a);
    if (filterType === 'pending') return missingTools.length > 0;
    if (filterType === 'completed') return missingTools.length === 0;
    return true;
  });

  return (
    <div className="space-y-6">
      <ConfirmModal 
        isOpen={deleteModal.isOpen}
        title={deleteModal.title}
        message={deleteModal.message}
        onConfirm={deleteModal.onConfirm}
        onCancel={() => setDeleteModal(prev => ({ ...prev, isOpen: false }))}
      />
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">Atribuições de Funcionários</h1>
        {!isAssigning && (
          <button 
            onClick={() => { setIsAssigning(true); setEditingAssignmentId(null); setSelectedEmployeeId(''); setCustomTools([]); }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Nova Atribuição
          </button>
        )}
      </div>

      {isAssigning && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <div className="flex justify-between items-center mb-6 border-b pb-4">
            <h2 className="text-lg font-bold text-slate-800">{editingAssignmentId ? 'Editar Atribuição' : 'Criar Atribuição'}</h2>
            <button onClick={() => setIsAssigning(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Selecionar Funcionário</label>
                <select 
                  value={selectedEmployeeId}
                  onChange={e => handleEmployeeSelect(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">-- Selecionar Funcionário --</option>
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{e.name} ({e.employeeId})</option>
                  ))}
                </select>
                {selectedEmployeeId && (
                  <p className="text-xs text-slate-500 mt-1">
                    As ferramentas padrão para o departamento deste funcionário foram carregadas. Você pode modificá-las abaixo.
                  </p>
                )}
              </div>
            </div>

            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <label className="block text-sm font-medium text-slate-700">Ferramentas Atribuídas ({customTools.length})</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="text" 
                    placeholder="Buscar ferramenta..." 
                    value={assignmentSearch}
                    onChange={e => setAssignmentSearch(e.target.value)}
                    className="text-sm p-1.5 border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-blue-500 w-full sm:w-40"
                  />
                  <select 
                    value={assignmentFilter}
                    onChange={e => setAssignmentFilter(e.target.value as any)}
                    className="text-sm p-1.5 border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="all">Todas</option>
                    <option value="selected">Atribuídas</option>
                    <option value="unselected">Não Atribuídas</option>
                  </select>
                </div>
              </div>
              <div className="border border-slate-200 rounded-lg p-3 h-64 overflow-y-auto bg-slate-50">
                {!selectedEmployeeId ? (
                  <div className="h-full flex items-center justify-center text-slate-400 text-sm text-center">
                    Selecione um funcionário primeiro para carregar as ferramentas padrão.
                  </div>
                ) : tools.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-400 text-sm">Nenhuma ferramenta disponível.</div>
                ) : (
                  <div className="space-y-2">
                    {tools
                      .filter(tool => {
                        const isSelected = customTools.some(t => t.toolId === tool.id);
                        if (assignmentFilter === 'selected' && !isSelected) return false;
                        if (assignmentFilter === 'unselected' && isSelected) return false;
                        
                        if (assignmentSearch) {
                          const searchLower = assignmentSearch.toLowerCase();
                          return tool.name.toLowerCase().includes(searchLower) || tool.brand.toLowerCase().includes(searchLower);
                        }
                        return true;
                      })
                      .sort((a, b) => {
                        // Sort selected tools to top
                        const aSelected = customTools.some(t => t.toolId === a.id);
                        const bSelected = customTools.some(t => t.toolId === b.id);
                        if (aSelected && !bSelected) return -1;
                        if (!aSelected && bSelected) return 1;
                        return a.name.localeCompare(b.name);
                      })
                      .map(tool => {
                        const isSelected = customTools.some(t => t.toolId === tool.id);
                        const emp = employees.find(e => e.id === selectedEmployeeId);
                        const dept = departments.find(d => d.id === emp?.departmentId);
                        const isStandard = standardLists.find(s => s.id === dept?.standardListId)?.tools?.some(t => t.toolId === tool.id);
                        
                        return (
                        <div 
                          key={tool.id}
                          className={`p-2 border rounded flex items-center gap-3 bg-white transition-colors ${
                            isSelected ? 'border-blue-400' : 'border-slate-200 hover:border-blue-200'
                          }`}
                        >
                          <div 
                            className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 cursor-pointer ${
                              isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300'
                            }`}
                            onClick={() => toggleCustomTool(tool.id)}
                          >
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <div className="flex-1 min-w-0 cursor-pointer" onClick={() => toggleCustomTool(tool.id)}>
                            <p className="text-sm font-medium text-slate-800 truncate">{tool.name}</p>
                            <p className="text-xs text-slate-500 truncate">{tool.brand}</p>
                          </div>
                          {isSelected && (
                            <div className="flex items-center gap-2">
                              <label className="text-xs text-slate-600">Qtd:</label>
                              <input 
                                type="number" 
                                min="1"
                                value={customTools.find(t => t.toolId === tool.id)?.quantity || 1}
                                onChange={(e) => updateCustomToolQuantity(tool.id, parseInt(e.target.value) || 1)}
                                className="w-14 p-1 border border-slate-300 rounded text-xs outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </div>
                          )}
                          {isStandard && <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">Padrão</span>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3 border-t pt-4">
            <button 
              onClick={() => setIsAssigning(false)}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button 
              onClick={handleSaveAssignment}
              disabled={!selectedEmployeeId}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Salvar Atribuição
            </button>
          </div>
        </div>
      )}

      {!isAssigning && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-slate-800">Atribuições Atuais</h2>
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-500 flex items-center gap-1">
                <Filter className="w-4 h-4" /> Filtrar:
              </label>
              <select 
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="text-sm p-1.5 border border-slate-200 rounded-lg bg-white outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">Todas</option>
                <option value="pending">Pendentes</option>
                <option value="completed">Entregues</option>
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-200">
                  <th className="p-4 font-medium">Funcionário</th>
                  <th className="p-4 font-medium">Departamento</th>
                  <th className="p-4 font-medium">Ferramentas Atribuídas</th>
                  <th className="p-4 font-medium">Data</th>
                  <th className="p-4 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredAssignments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">Nenhuma atribuição encontrada.</td>
                  </tr>
                ) : (
                  filteredAssignments.map(assignment => {
                    const emp = employees.find(e => e.id === assignment.employeeId);
                    const dept = departments.find(d => d.id === assignment.departmentId);
                    const date = new Date(assignment.dateAssigned).toLocaleDateString();
                    
                    const missingTools = getMissingTools(assignment);
                    
                    return (
                      <tr key={assignment.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="p-4">
                          <button 
                            onClick={() => handleViewAssignment(assignment)}
                            className="text-left hover:text-blue-600 transition-colors group"
                          >
                            <p className="font-medium text-slate-800 group-hover:text-blue-600">{emp?.name || 'Desconhecido'}</p>
                            <p className="text-xs text-slate-500">{emp?.employeeId}</p>
                          </button>
                        </td>
                        <td className="p-4 text-slate-600">{dept?.name || 'Desconhecido'}</td>
                        <td className="p-4">
                          <div className="flex flex-col items-start gap-2">
                            <span className="inline-flex items-center justify-center bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded-full">
                              {(assignment.assignedTools || []).reduce((acc, t) => acc + t.quantity, 0)} itens ({(assignment.assignedTools || []).length} tipos)
                            </span>
                            {missingTools.length > 0 && (
                              <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border border-amber-200">
                                <AlertTriangle className="w-3 h-3" />
                                Pendente
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-slate-600 text-sm">{date}</td>
                        <td className="p-4 flex justify-end gap-2">
                          <button onClick={() => handleViewAssignment(assignment)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors" title="Ver Detalhes">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button onClick={() => exportToPDF(assignment)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Exportar PDF">
                            <Download className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleEditAssignment(assignment)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteAssignment(assignment.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Excluir">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {/* Details Modal */}
      {viewingAssignment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Detalhes da Atribuição</h2>
                <p className="text-sm text-slate-500">
                  {employees.find(e => e.id === viewingAssignment.employeeId)?.name} • {new Date(viewingAssignment.dateAssigned).toLocaleDateString()}
                </p>
              </div>
              <button 
                onClick={() => setViewingAssignment(null)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-slate-500" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Colaborador</p>
                  <p className="font-bold text-slate-800">{employees.find(e => e.id === viewingAssignment.employeeId)?.name}</p>
                  <p className="text-sm text-slate-600">ID: {employees.find(e => e.id === viewingAssignment.employeeId)?.employeeId}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Departamento</p>
                  <p className="font-bold text-slate-800">{departments.find(d => d.id === viewingAssignment.departmentId)?.name}</p>
                  <p className="text-sm text-slate-600">Data: {new Date(viewingAssignment.dateAssigned).toLocaleDateString()}</p>
                </div>
              </div>

              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Ferramentas Atribuídas
              </h3>
              
              <div className="border border-slate-100 rounded-xl overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-100">
                      <th className="p-3 font-semibold">Marca</th>
                      <th className="p-3 font-semibold">Ferramenta</th>
                      <th className="p-3 font-semibold text-center">Qtd</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(viewingAssignment.assignedTools || []).map((at, idx) => {
                      const tool = tools.find(t => t.id === at.toolId);
                      return (
                        <tr key={idx} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                          <td className="p-3 text-slate-600">{tool?.brand}</td>
                          <td className="p-3">
                            <p className="font-medium text-slate-800">{tool?.name}</p>
                            <p className="text-[10px] text-slate-400">{tool?.category}</p>
                          </td>
                          <td className="p-3 text-center">
                            <span className="inline-flex items-center justify-center bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded text-sm">
                              {at.quantity}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {getMissingTools(viewingAssignment).length > 0 && (
                <div className="mt-6">
                  <h3 className="font-bold text-amber-800 mb-3 flex items-center gap-2 text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    Ferramentas Pendentes (Faltando)
                  </h3>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <ul className="space-y-2">
                      {getMissingTools(viewingAssignment).map((mt, idx) => (
                        <li key={idx} className="flex justify-between items-center text-sm text-amber-900">
                          <span>{mt.toolName}</span>
                          <span className="font-bold bg-amber-200 px-2 py-0.5 rounded">Falta: {mt.missingQty}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button 
                onClick={() => setViewingAssignment(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
              >
                Fechar
              </button>
              <button 
                onClick={() => exportToPDF(viewingAssignment)}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Exportar PDF
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal 
        isOpen={deleteModal.isOpen}
        title={deleteModal.title}
        message={deleteModal.message}
        onConfirm={deleteModal.onConfirm}
        onCancel={() => setDeleteModal({ ...deleteModal, isOpen: false })}
      />
    </div>
  );
}
