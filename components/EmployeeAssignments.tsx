import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Employee, Assignment, Department, Tool, StandardToolList } from '@/lib/data';
import { Plus, Trash2, Edit2, Check, X, AlertTriangle, Eye, FileText, Download, Filter, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ConfirmModal from './ConfirmModal';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getLogoBase64 } from '@/lib/pdfUtils';
import { sortByName } from '@/lib/utils';

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
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [employeeSortByMatricula, setEmployeeSortByMatricula] = useState(false);
  const [customTools, setCustomTools] = useState<{ toolId: string, quantity: number }[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'pending' | 'completed'>('all');
  const [assignmentSearch, setAssignmentSearch] = useState('');
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'selected' | 'unselected'>('all');
  const [assignmentEmployeeSearch, setAssignmentEmployeeSearch] = useState('');
  const [assignmentDepartmentFilter, setAssignmentDepartmentFilter] = useState('');
  const [sortByMatricula, setSortByMatricula] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

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
    setEmployeeSearch('');
    setEmployeeSortByMatricula(false);
    setCustomTools([]);
    setAssignmentSearch('');
    setAssignmentFilter('all');
    setAssignmentEmployeeSearch('');
    setAssignmentDepartmentFilter('');
  };

  const getMissingTools = (assignment: Assignment) => {
    const dept = departments.find(d => d.id === assignment.departmentId);
    const missingTools: { toolName: string, missingQty: number }[] = [];
    
    if (dept && dept.standardListId) {
      const standardList = standardLists.find(s => s.id === dept.standardListId);
      if (standardList) {
        (standardList.tools || []).forEach(stdTool => {
          const assignedTool = (assignment.assignedTools || []).find(t => t.toolId === stdTool.toolId);
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
    setEmployeeSearch('');
    setEmployeeSortByMatricula(false);
    setCustomTools([...(assignment.assignedTools || [])]);
    setAssignmentSearch('');
    setAssignmentFilter('all');
    setAssignmentEmployeeSearch('');
    setAssignmentDepartmentFilter('');
  };

  const handleViewAssignment = (assignment: Assignment) => {
    setViewingAssignment(assignment);
  };

  const exportToPDF = (assignment: Assignment) => {
    const emp = employees.find(e => e.id === assignment.employeeId);
    const dept = departments.find(d => d.id === assignment.departmentId);
    const date = new Date(assignment.dateAssigned).toLocaleDateString('pt-BR');

    const doc = new jsPDF();
    const logoBase64 = getLogoBase64();
    
    // --- HEADER: Industrial / Tech Style (Clean Version) ---
    doc.setFillColor(248, 250, 252); // slate-50 background for header
    doc.rect(0, 0, 210, 45, 'F');

    if (logoBase64) {
      try {
        const imgProps = doc.getImageProperties(logoBase64);
        const maxLogoWidth = 45;
        const maxLogoHeight = 25;
        let logoWidth = maxLogoWidth;
        let logoHeight = (imgProps.height * logoWidth) / imgProps.width;

        if (logoHeight > maxLogoHeight) {
          logoHeight = maxLogoHeight;
          logoWidth = (imgProps.width * logoHeight) / imgProps.height;
        }

        doc.addImage(logoBase64, 'PNG', 14, 10, logoWidth, logoHeight, undefined, 'FAST');
      } catch (e) {
        console.error('Error adding logo to PDF', e);
      }
    }
    
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.setFont('helvetica', 'bold');
    doc.text('TERMO DE RESPONSABILIDADE', 196, 22, { align: 'right' });
    
    doc.setFontSize(9);
    doc.setTextColor(15, 118, 110); // teal-700
    doc.setFont('helvetica', 'bold');
    doc.text(`DATA: ${new Date().toLocaleDateString('pt-BR')} | HORA: ${new Date().toLocaleTimeString('pt-BR')}`, 196, 28, { align: 'right' });
    doc.text(`SYS-ID: TRM-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`, 196, 33, { align: 'right' });

    // Accent line
    doc.setDrawColor(15, 118, 110); // teal-700
    doc.setLineWidth(1.5);
    doc.line(0, 45, 210, 45);
    
    // Employee Info
    const infoY = 55;
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.setFont('helvetica', 'bold');
    doc.text('DADOS DO COLABORADOR', 14, infoY);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105); // slate-600
    doc.text(`NOME: ${emp?.name.toUpperCase() || 'DESCONHECIDO'}`, 14, infoY + 8);
    doc.text(`MATRÍCULA: ${emp?.employeeId || 'N/A'}`, 14, infoY + 14);
    doc.text(`DEPARTAMENTO: ${dept?.name.toUpperCase() || 'DESCONHECIDO'}`, 105, infoY + 8);
    doc.text(`DATA DE ENTREGA: ${date}`, 105, infoY + 14);
    
    // Agreement Text
    const textY = infoY + 25;
    const agreementText = `Eu, ${emp?.name || '____________________'}, colaborador da empresa, declaro ter recebido as ferramentas individuais abaixo relacionadas. A contar desta data, assumo a responsabilidade pela guarda e conservação das mesmas, comprometendo-me a devolvê-las em perfeito estado de funcionamento.\n\nEm caso de extravio ou danos por mau uso que acarretem a perda total ou parcial do bem, autorizo o desconto em folha de pagamento do valor correspondente ao prejuízo causado, fixado de acordo com o estado em que a ferramenta se encontrava no ato da entrega.`;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85); // slate-700
    const splitText = doc.splitTextToSize(agreementText, 182);
    doc.text(splitText, 14, textY);
    
    // Table
    const tableData = (assignment.assignedTools || []).map(at => {
      const tool = tools.find(t => t.id === at.toolId);
      return [
        tool?.brand.toUpperCase() || 'N/A',
        tool?.name.toUpperCase() || 'N/A',
        tool?.category.toUpperCase() || 'N/A',
        at.quantity.toString()
      ];
    });

    autoTable(doc, {
      startY: textY + (splitText.length * 5) + 10,
      head: [['MARCA', 'FERRAMENTA', 'CATEGORIA', 'QTD.']],
      body: tableData,
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 8,
        cellPadding: 3,
        lineColor: [203, 213, 225], // slate-300
        lineWidth: 0.1,
        valign: 'middle'
      },
      headStyles: { 
        fillColor: [15, 118, 110], // teal-700
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center'
      },
      bodyStyles: {
        textColor: [51, 65, 85], // slate-700
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252] // slate-50
      },
      columnStyles: {
        0: { halign: 'left' },
        1: { fontStyle: 'bold', halign: 'left' },
        2: { halign: 'left' },
        3: { halign: 'center', fontStyle: 'bold' }
      }
    });

    let currentY = (doc as any).lastAutoTable.finalY || 100;

    const missingTools = getMissingTools(assignment);
    if (missingTools.length > 0) {
      doc.setFontSize(12);
      doc.setTextColor(220, 38, 38); // red-600
      doc.setFont('helvetica', 'bold');
      doc.text('FERRAMENTAS PENDENTES (A ENTREGAR)', 14, currentY + 15);
      
      const missingTableData = missingTools.map(mt => [mt.toolName.toUpperCase(), mt.missingQty.toString()]);
      
      autoTable(doc, {
        startY: currentY + 20,
        head: [['FERRAMENTA', 'QTD. FALTANTE']],
        body: missingTableData,
        theme: 'grid',
        styles: {
          font: 'helvetica',
          fontSize: 8,
          cellPadding: 3,
          lineColor: [203, 213, 225], // slate-300
          lineWidth: 0.1,
          valign: 'middle'
        },
        headStyles: { 
          fillColor: [15, 118, 110], // teal-700
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center'
        },
        bodyStyles: {
          textColor: [51, 65, 85], // slate-700
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252] // slate-50
        },
        columnStyles: {
          0: { fontStyle: 'bold', halign: 'left' },
          1: { halign: 'center', fontStyle: 'bold', textColor: [220, 38, 38] } // Keep red for the number only
        }
      });
      currentY = (doc as any).lastAutoTable.finalY || currentY + 40;
    }

    // Footer
    const finalY = currentY;
    
    // Signature lines
    doc.setDrawColor(15, 23, 42); // slate-900
    doc.setLineWidth(0.5);
    doc.line(14, finalY + 40, 90, finalY + 40);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('ASSINATURA DO COLABORADOR', 14, finalY + 45);
    
    doc.line(120, finalY + 40, 196, finalY + 40);
    doc.text('ASSINATURA DO RESPONSÁVEL', 120, finalY + 45);
    
    // Add Footer with page numbers
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.setFont('helvetica', 'normal');
      doc.text(`PÁGINA ${i} DE ${pageCount} | GERADO PELO SISTEMA TOOLMANAGER`, 105, 285, { align: 'center' });
    }

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
    if (assignmentDepartmentFilter && a.departmentId !== assignmentDepartmentFilter) {
      return false;
    }

    if (filterType !== 'all') {
      const missingTools = getMissingTools(a);
      if (filterType === 'pending' && missingTools.length === 0) return false;
      if (filterType === 'completed' && missingTools.length > 0) return false;
    }
    
    if (assignmentEmployeeSearch) {
      const emp = employees.find(e => e.id === a.employeeId);
      if (!emp) return false;
      const searchLower = assignmentEmployeeSearch.toLowerCase();
      return emp.name.toLowerCase().includes(searchLower) || emp.employeeId.toLowerCase().includes(searchLower);
    }
    
    return true;
  }).sort((a, b) => {
    if (sortByMatricula) {
      const empA = employees.find(e => e.id === a.employeeId);
      const empB = employees.find(e => e.id === b.employeeId);
      if (empA && empB) {
        return empA.employeeId.localeCompare(empB.employeeId);
      }
    }
    // Default sort by date assigned (newest first)
    return new Date(b.dateAssigned).getTime() - new Date(a.dateAssigned).getTime();
  });

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
      
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500/10 border border-blue-500/30 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.2)]">
            <Users className="w-5 h-5 text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Atribuições de Funcionários</h1>
        </div>
        {!isAssigning && (
          <button 
            onClick={() => { setIsAssigning(true); setEditingAssignmentId(null); setSelectedEmployeeId(''); setEmployeeSearch(''); setEmployeeSortByMatricula(false); setCustomTools([]); }}
            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-500 hover:to-indigo-500 flex items-center gap-2 shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-all"
          >
            <Plus className="w-4 h-4" /> Nova Atribuição
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {isAssigning && (
          <motion.div 
            initial={{ opacity: 0, height: 0, overflow: 'hidden' }}
            animate={{ opacity: 1, height: 'auto', overflow: 'visible' }}
            exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
            className="bg-slate-900/50 backdrop-blur-md rounded-2xl shadow-xl border border-slate-800 p-6 relative"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500/50 to-indigo-500/50" />
            <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
              <h2 className="text-lg font-bold text-white">{editingAssignmentId ? 'Editar Atribuição' : 'Criar Atribuição'}</h2>
              <button onClick={() => setIsAssigning(false)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Selecionar Funcionário</label>
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      placeholder="Buscar funcionário por nome ou matrícula..."
                      value={employeeSearch}
                      onChange={e => setEmployeeSearch(e.target.value)}
                      className="flex-1 p-2.5 bg-slate-950/50 border border-slate-700 rounded-xl text-sm text-slate-200 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all"
                    />
                    <button
                      onClick={() => setEmployeeSortByMatricula(!employeeSortByMatricula)}
                      className={`text-xs font-mono p-2.5 border rounded-xl outline-none transition-all uppercase tracking-wider ${
                        employeeSortByMatricula 
                          ? 'border-blue-500/50 bg-blue-500/10 text-blue-400' 
                          : 'border-slate-700 bg-slate-950/50 text-slate-400 hover:bg-slate-800/50'
                      }`}
                      title="Ordenar por Matrícula"
                    >
                      Matrícula {employeeSortByMatricula ? 'ON' : 'OFF'}
                    </button>
                  </div>
                  <select 
                    value={selectedEmployeeId}
                    onChange={e => handleEmployeeSelect(e.target.value)}
                    className="w-full p-2.5 bg-slate-950/50 border border-slate-700 rounded-xl text-sm text-slate-200 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all appearance-none"
                  >
                    <option value="">-- Selecionar Funcionário --</option>
                    {employees
                      .filter(e => {
                        if (!employeeSearch) return true;
                        const searchLower = employeeSearch.toLowerCase();
                        return e.name.toLowerCase().includes(searchLower) || e.employeeId.toLowerCase().includes(searchLower);
                      })
                      .sort((a, b) => {
                        if (employeeSortByMatricula) {
                          return a.employeeId.localeCompare(b.employeeId);
                        }
                        return a.name.localeCompare(b.name);
                      })
                      .map(e => (
                      <option key={e.id} value={e.id}>{e.name} ({e.employeeId})</option>
                    ))}
                  </select>
                  {selectedEmployeeId && (
                    <p className="text-xs text-blue-400 mt-2 bg-blue-500/10 p-2 rounded-lg border border-blue-500/20">
                      As ferramentas padrão para o departamento deste funcionário foram carregadas. Você pode modificá-las abaixo.
                    </p>
                  )}
                </div>
              </div>

              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <label className="block text-sm font-medium text-slate-300">Ferramentas Atribuídas ({customTools.length})</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="text" 
                      placeholder="Buscar ferramenta..." 
                      value={assignmentSearch}
                      onChange={e => setAssignmentSearch(e.target.value)}
                      className="text-sm p-2 bg-slate-950/50 border border-slate-700 rounded-xl text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all w-full sm:w-40"
                    />
                    <select 
                      value={assignmentFilter}
                      onChange={e => setAssignmentFilter(e.target.value as any)}
                      className="text-sm p-2 bg-slate-950/50 border border-slate-700 rounded-xl text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all appearance-none"
                    >
                      <option value="all">Todas</option>
                      <option value="selected">Atribuídas</option>
                      <option value="unselected">Não Atribuídas</option>
                    </select>
                  </div>
                </div>
                <div className="border border-slate-800 rounded-xl p-3 h-64 overflow-y-auto bg-slate-950/30 custom-scrollbar">
                  {!selectedEmployeeId ? (
                    <div className="h-full flex items-center justify-center text-slate-500 text-sm text-center font-mono">
                      Selecione um funcionário primeiro para carregar as ferramentas padrão.
                    </div>
                  ) : tools.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-500 text-sm font-mono">Nenhuma ferramenta disponível.</div>
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
                          <motion.div 
                            layout
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            key={tool.id}
                            className={`p-3 border rounded-xl flex items-center gap-3 transition-all ${
                              isSelected ? 'bg-blue-900/20 border-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.1)]' : 'bg-slate-900/50 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'
                            }`}
                          >
                            <div 
                              className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 cursor-pointer transition-colors ${
                                isSelected ? 'bg-blue-500 border-blue-500' : 'border-slate-600 bg-slate-950'
                              }`}
                              onClick={() => toggleCustomTool(tool.id)}
                            >
                              {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                            </div>
                            <div className="flex-1 min-w-0 pr-2 cursor-pointer" onClick={() => toggleCustomTool(tool.id)}>
                              <p className="text-sm font-medium text-slate-200 break-words">{tool.name}</p>
                              <p className="text-[10px] font-mono text-slate-500 break-words uppercase tracking-wider">{tool.brand}</p>
                            </div>
                            {isSelected && (
                              <div className="flex items-center gap-2">
                                <label className="text-[10px] font-mono text-slate-400 uppercase">Qtd:</label>
                                <input 
                                  type="number" 
                                  min="1"
                                  value={customTools.find(t => t.toolId === tool.id)?.quantity || 1}
                                  onChange={(e) => updateCustomToolQuantity(tool.id, parseInt(e.target.value) || 1)}
                                  className="w-16 p-1.5 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                                />
                              </div>
                            )}
                            {isStandard && <span className="text-[9px] font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded uppercase tracking-widest">Padrão</span>}
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3 border-t border-slate-800 pt-5">
              <button 
                onClick={() => setIsAssigning(false)}
                className="px-5 py-2.5 border border-slate-700 text-slate-300 rounded-xl hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveAssignment}
                disabled={!selectedEmployeeId}
                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-all"
              >
                Salvar Atribuição
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!isAssigning && (
        <motion.div variants={itemVariants} className="bg-slate-900/50 backdrop-blur-md rounded-2xl shadow-xl border border-slate-800 overflow-hidden">
          <div className="p-5 border-b border-slate-800 bg-slate-900/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-white">Atribuições Atuais</h2>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <input
                type="text"
                placeholder="Buscar por nome ou matrícula..."
                value={assignmentEmployeeSearch}
                onChange={e => setAssignmentEmployeeSearch(e.target.value)}
                className="text-sm p-2 bg-slate-950/50 border border-slate-700 rounded-xl text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all w-full sm:w-48"
              />
              <select
                value={assignmentDepartmentFilter}
                onChange={(e) => setAssignmentDepartmentFilter(e.target.value)}
                className="text-sm p-2 bg-slate-950/50 border border-slate-700 rounded-xl text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all appearance-none w-full sm:w-auto"
              >
                <option value="">Todos os Departamentos</option>
                {[...departments].sort((a, b) => sortByName(a.name, b.name)).map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              <button
                onClick={() => setSortByMatricula(!sortByMatricula)}
                className={`text-xs font-mono p-2 border rounded-xl outline-none transition-all uppercase tracking-wider ${
                  sortByMatricula 
                    ? 'border-blue-500/50 bg-blue-500/10 text-blue-400' 
                    : 'border-slate-700 bg-slate-950/50 text-slate-400 hover:bg-slate-800/50'
                }`}
                title="Ordenar por Matrícula"
              >
                Matrícula {sortByMatricula ? 'ON' : 'OFF'}
              </button>
              <div className="flex items-center gap-2">
                <label className="text-xs font-mono text-slate-500 flex items-center gap-1 uppercase tracking-wider">
                  <Filter className="w-3.5 h-3.5" /> Filtrar:
                </label>
                <select 
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className="text-sm p-2 bg-slate-950/50 border border-slate-700 rounded-xl text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all appearance-none"
                >
                  <option value="all">Todas</option>
                  <option value="pending">Pendentes</option>
                  <option value="completed">Entregues</option>
                </select>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/50 text-slate-400 text-xs font-mono uppercase tracking-wider border-b border-slate-800">
                  <th className="p-4 font-medium">Funcionário</th>
                  <th className="p-4 font-medium">Departamento</th>
                  <th className="p-4 font-medium">Ferramentas Atribuídas</th>
                  <th className="p-4 font-medium">Faltantes</th>
                  <th className="p-4 font-medium">Data</th>
                  <th className="p-4 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredAssignments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500 font-mono text-sm">Nenhuma atribuição encontrada.</td>
                  </tr>
                ) : (
                  filteredAssignments.map((assignment, idx) => {
                    const emp = employees.find(e => e.id === assignment.employeeId);
                    const dept = departments.find(d => d.id === assignment.departmentId);
                    const date = new Date(assignment.dateAssigned).toLocaleDateString();
                    
                    const missingTools = getMissingTools(assignment);
                    const missingToolsCount = missingTools.reduce((acc, mt) => acc + mt.missingQty, 0);
                    
                    return (
                      <motion.tr 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        key={assignment.id} 
                        className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors group"
                      >
                        <td className="p-4">
                          <button 
                            onClick={() => handleViewAssignment(assignment)}
                            className="text-left hover:text-blue-400 transition-colors"
                          >
                            <p className="font-medium text-slate-200 group-hover:text-blue-400 transition-colors">{emp?.name || 'Desconhecido'}</p>
                            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mt-1">{emp?.employeeId}</p>
                          </button>
                        </td>
                        <td className="p-4 text-slate-400 text-sm">{dept?.name || 'Desconhecido'}</td>
                        <td className="p-4">
                          <div className="flex flex-col items-start gap-2">
                            <span className="inline-flex items-center justify-center bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold px-2.5 py-1 rounded-lg">
                              {(assignment.assignedTools || []).reduce((acc, t) => acc + t.quantity, 0)} itens ({(assignment.assignedTools || []).length} tipos)
                            </span>
                            {missingToolsCount > 0 && (
                              <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-500/20 uppercase tracking-wider">
                                <AlertTriangle className="w-3 h-3" />
                                Pendente
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          {missingToolsCount > 0 ? (
                            <span className="font-bold text-amber-500 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20">{missingToolsCount}</span>
                          ) : (
                            <span className="text-slate-600 font-mono">0</span>
                          )}
                        </td>
                        <td className="p-4 text-slate-400 text-sm font-mono">{date}</td>
                        <td className="p-4 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleViewAssignment(assignment)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors" title="Ver Detalhes">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button onClick={() => exportToPDF(assignment)} className="p-2 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors" title="Exportar PDF">
                            <Download className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleEditAssignment(assignment)} className="p-2 text-blue-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors" title="Editar">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteAssignment(assignment.id)} className="p-2 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Excluir">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </motion.tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
      
      {/* Details Modal */}
      {mounted && createPortal(
        <AnimatePresence>
          {viewingAssignment && (
            <motion.div 
              key="details-modal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            >
              <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col relative"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
                <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/80">
                  <div>
                    <h2 className="text-xl font-bold text-white">Detalhes da Atribuição</h2>
                    <p className="text-sm text-slate-400 font-mono mt-1">
                      {employees.find(e => e.id === viewingAssignment.employeeId)?.name} • {new Date(viewingAssignment.dateAssigned).toLocaleDateString()}
                    </p>
                  </div>
                  <button 
                    onClick={() => setViewingAssignment(null)}
                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                
                <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                  <div className="grid grid-cols-2 gap-6 mb-8">
                    <div className="bg-slate-950/50 p-5 rounded-xl border border-slate-800">
                      <p className="text-[10px] font-mono font-semibold text-slate-500 uppercase tracking-widest mb-2">Colaborador</p>
                      <p className="font-bold text-white text-lg">{employees.find(e => e.id === viewingAssignment.employeeId)?.name}</p>
                      <p className="text-sm text-slate-400 font-mono mt-1">ID: {employees.find(e => e.id === viewingAssignment.employeeId)?.employeeId}</p>
                    </div>
                    <div className="bg-slate-950/50 p-5 rounded-xl border border-slate-800">
                      <p className="text-[10px] font-mono font-semibold text-slate-500 uppercase tracking-widest mb-2">Departamento</p>
                      <p className="font-bold text-white text-lg">{departments.find(d => d.id === viewingAssignment.departmentId)?.name}</p>
                      <p className="text-sm text-slate-400 font-mono mt-1">Data: {new Date(viewingAssignment.dateAssigned).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-400" />
                    Ferramentas Atribuídas
                  </h3>
                  
                  <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/30">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-900/50 text-slate-400 text-[10px] font-mono uppercase tracking-wider border-b border-slate-800">
                          <th className="p-4 font-semibold">Marca</th>
                          <th className="p-4 font-semibold">Ferramenta</th>
                          <th className="p-4 font-semibold text-center">Qtd</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(viewingAssignment.assignedTools || []).map((at, idx) => {
                          const tool = tools.find(t => t.id === at.toolId);
                          return (
                            <tr key={idx} className="border-b border-slate-800/50 last:border-0 hover:bg-slate-800/30 transition-colors">
                              <td className="p-4 text-slate-400 text-sm">{tool?.brand}</td>
                              <td className="p-4">
                                <p className="font-medium text-slate-200">{tool?.name}</p>
                                <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mt-1">{tool?.category}</p>
                              </td>
                              <td className="p-4 text-center">
                                <span className="inline-flex items-center justify-center bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold px-3 py-1 rounded-lg text-sm">
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
                    <div className="mt-8">
                      <h3 className="font-bold text-amber-400 mb-4 flex items-center gap-2 text-sm">
                        <AlertTriangle className="w-4 h-4" />
                        Ferramentas Pendentes (Faltando)
                      </h3>
                      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-5">
                        <ul className="space-y-3">
                          {getMissingTools(viewingAssignment).map((mt, idx) => (
                            <li key={idx} className="flex justify-between items-center text-sm text-amber-200">
                              <span>{mt.toolName}</span>
                              <span className="font-bold font-mono bg-amber-500/20 text-amber-400 px-2.5 py-1 rounded-lg border border-amber-500/30">Falta: {mt.missingQty}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-6 border-t border-slate-800 bg-slate-900/80 flex justify-end gap-3">
                  <button 
                    onClick={() => setViewingAssignment(null)}
                    className="px-5 py-2.5 border border-slate-700 text-slate-300 rounded-xl hover:bg-slate-800 transition-colors"
                  >
                    Fechar
                  </button>
                  <button 
                    onClick={() => exportToPDF(viewingAssignment)}
                    className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-500 hover:to-teal-500 transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                  >
                    <Download className="w-4 h-4" />
                    Exportar PDF
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      <ConfirmModal 
        isOpen={deleteModal.isOpen}
        title={deleteModal.title}
        message={deleteModal.message}
        onConfirm={deleteModal.onConfirm}
        onCancel={() => setDeleteModal({ ...deleteModal, isOpen: false })}
      />
    </motion.div>
  );
}
