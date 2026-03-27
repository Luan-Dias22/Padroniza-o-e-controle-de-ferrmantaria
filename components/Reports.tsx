import React, { useState, useMemo } from 'react';
import { Tool, Department, Assignment, Employee } from '@/lib/data';
import { FileText, Search, Download, Filter } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReportsProps {
  tools: Tool[];
  departments: Department[];
  assignments: Assignment[];
  employees: Employee[];
}

export default function Reports({ tools, departments, assignments, employees }: ReportsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');

  // Calculate tool quantities per department
  const reportData = useMemo(() => {
    const data: Record<string, Record<string, number>> = {};

    // Initialize data structure for all departments
    departments.forEach(dept => {
      data[dept.id] = {};
    });

    // Aggregate tool quantities from assignments
    assignments.forEach(assignment => {
      const deptId = assignment.departmentId;
      if (!data[deptId]) {
        data[deptId] = {};
      }

      assignment.assignedTools.forEach(assignedTool => {
        if (!data[deptId][assignedTool.toolId]) {
          data[deptId][assignedTool.toolId] = 0;
        }
        data[deptId][assignedTool.toolId] += assignedTool.quantity;
      });
    });

    return data;
  }, [assignments, departments]);

  const filteredDepartments = departments.filter(dept => {
    if (selectedDepartment !== 'all' && dept.id !== selectedDepartment) return false;
    if (searchQuery) {
      return dept.name.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Relatório de Ferramentas por Linha', 14, 22);
    
    doc.setFontSize(11);
    doc.text(`Data de emissão: ${new Date().toLocaleDateString('pt-BR')}`, 14, 30);

    let currentY = 40;

    filteredDepartments.forEach((dept, index) => {
      const deptTools = reportData[dept.id] || {};
      const toolIds = Object.keys(deptTools);
      
      if (toolIds.length === 0) return; // Skip empty departments

      if (index > 0 && currentY > 250) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`Linha/Departamento: ${dept.name}`, 14, currentY);
      currentY += 5;

      const tableData = toolIds.map(toolId => {
        const tool = tools.find(t => t.id === toolId);
        return [
          tool?.name || 'Ferramenta Desconhecida',
          tool?.brand || '-',
          tool?.category || '-',
          deptTools[toolId].toString()
        ];
      });

      autoTable(doc, {
        startY: currentY,
        head: [['Ferramenta', 'Marca', 'Categoria', 'Quantidade Total']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
        margin: { top: 10 },
      });

      currentY = (doc as any).lastAutoTable.finalY + 15;
    });

    doc.save('relatorio-ferramentas-por-linha.pdf');
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[calc(100vh-2rem)]">
      <div className="p-6 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" />
            Relatório por Linha
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Visão geral das quantidades de ferramentas atribuídas por departamento/linha.
          </p>
        </div>
        
        <button
          onClick={handleExportPDF}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
        >
          <Download className="w-4 h-4" /> Exportar PDF
        </button>
      </div>

      <div className="p-4 border-b border-slate-200 bg-white flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar linha/departamento..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-slate-400" />
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white min-w-[200px]"
          >
            <option value="all">Todas as Linhas</option>
            {departments.map(dept => (
              <option key={dept.id} value={dept.id}>{dept.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 bg-slate-50/50">
        <div className="space-y-8 max-w-5xl mx-auto">
          {filteredDepartments.map(dept => {
            const deptTools = reportData[dept.id] || {};
            const toolIds = Object.keys(deptTools);
            
            if (toolIds.length === 0) return null;

            return (
              <div key={dept.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="bg-slate-100 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                  <h2 className="text-lg font-bold text-slate-800">{dept.name}</h2>
                  <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                    {toolIds.length} tipos de ferramentas
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm">
                        <th className="p-4 font-semibold">Ferramenta</th>
                        <th className="p-4 font-semibold">Marca</th>
                        <th className="p-4 font-semibold">Categoria</th>
                        <th className="p-4 font-semibold text-center">Quantidade Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {toolIds.map(toolId => {
                        const tool = tools.find(t => t.id === toolId);
                        return (
                          <tr key={toolId} className="hover:bg-slate-50 transition-colors">
                            <td className="p-4 text-slate-800 font-medium">{tool?.name || 'Ferramenta Desconhecida'}</td>
                            <td className="p-4 text-slate-600">{tool?.brand || '-'}</td>
                            <td className="p-4 text-slate-600">
                              <span className="inline-flex items-center px-2 py-1 rounded-md bg-slate-100 text-slate-600 text-xs font-medium">
                                {tool?.category || '-'}
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 text-blue-700 font-bold text-sm">
                                {deptTools[toolId]}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
          
          {filteredDepartments.every(dept => Object.keys(reportData[dept.id] || {}).length === 0) && (
            <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-slate-900 mb-1">Nenhum dado encontrado</h3>
              <p className="text-slate-500">Não há ferramentas atribuídas para as linhas selecionadas.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
