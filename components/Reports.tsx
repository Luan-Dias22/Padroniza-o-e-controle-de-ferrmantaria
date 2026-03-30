import React, { useState, useMemo } from 'react';
import { Tool, Department, Assignment, Employee, StandardToolList, CollectiveStation } from '@/lib/data';
import { FileText, Search, Download, Filter, Users, Building2 } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getLogoBase64 } from '@/lib/pdfUtils';

interface ReportsProps {
  tools: Tool[];
  departments: Department[];
  assignments: Assignment[];
  employees: Employee[];
  collectiveStations: CollectiveStation[];
}

export default function Reports({ tools, departments, assignments, employees, collectiveStations }: ReportsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');

  // Calculate tool quantities per department
  const reportData = useMemo(() => {
    const data: Record<string, { 
      individual: Record<string, number>, 
      collective: Record<string, number>,
      requiredCollective: Record<string, number>,
      total: Record<string, number>,
      stations: Record<string, string[]>
    }> = {};

    // Initialize data structure for all departments
    (departments || []).forEach(dept => {
      data[dept.id] = {
        individual: {},
        collective: {},
        requiredCollective: {},
        total: {},
        stations: {}
      };
      
      // Add tools from new collectiveStations collection
      // Match by line name if it matches department name
      (collectiveStations || [])
        .filter(s => s.line === dept.name)
        .forEach(s => {
          (s.tools || []).forEach(tool => {
            if (tool.toolId) {
              data[dept.id].collective[tool.toolId] = (data[dept.id].collective[tool.toolId] || 0) + tool.quantity;
              data[dept.id].requiredCollective[tool.toolId] = (data[dept.id].requiredCollective[tool.toolId] || 0) + (tool.requiredQuantity ?? tool.quantity);
              data[dept.id].total[tool.toolId] = (data[dept.id].total[tool.toolId] || 0) + tool.quantity;
              
              if (!data[dept.id].stations[tool.toolId]) {
                data[dept.id].stations[tool.toolId] = [];
              }
              if (!data[dept.id].stations[tool.toolId].includes(s.name)) {
                data[dept.id].stations[tool.toolId].push(s.name);
              }
            }
          });
        });
    });

    // Aggregate tool quantities from individual assignments
    (assignments || []).forEach(assignment => {
      const deptId = assignment.departmentId;
      if (!data[deptId]) return;

      (assignment.assignedTools || []).forEach(assignedTool => {
        data[deptId].individual[assignedTool.toolId] = (data[deptId].individual[assignedTool.toolId] || 0) + assignedTool.quantity;
        data[deptId].total[assignedTool.toolId] = (data[deptId].total[assignedTool.toolId] || 0) + assignedTool.quantity;
      });
    });

    return data;
  }, [assignments, departments, collectiveStations]);

  const filteredDepartments = departments.filter(dept => {
    if (selectedDepartment !== 'all' && dept.id !== selectedDepartment) return false;
    if (searchQuery) {
      return dept.name.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const logoBase64 = getLogoBase64();
    
    let startY = 20;

    if (logoBase64) {
      try {
        const imgProps = doc.getImageProperties(logoBase64);
        const maxLogoWidth = 40;
        const maxLogoHeight = 20;
        let logoWidth = maxLogoWidth;
        let logoHeight = (imgProps.height * logoWidth) / imgProps.width;

        if (logoHeight > maxLogoHeight) {
          logoHeight = maxLogoHeight;
          logoWidth = (imgProps.width * logoHeight) / imgProps.height;
        }

        doc.addImage(logoBase64, 'PNG', 14, 15, logoWidth, logoHeight, undefined, 'FAST');
        startY = 15 + logoHeight + 10;
      } catch (e) {
        console.error('Error adding logo to PDF', e);
      }
    }
    
    doc.setFontSize(22);
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text('Relatório de Ferramentas por Linha', 14, startY);
    
    doc.setFontSize(11);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(`Data de emissão: ${new Date().toLocaleDateString('pt-BR')}`, 14, startY + 8);

    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.5);
    doc.line(14, startY + 12, 196, startY + 12);

    let currentY = startY + 22;

    filteredDepartments.forEach((dept, index) => {
      const deptData = reportData[dept.id];
      const toolIds = Object.keys(deptData?.total || {});
      
      if (toolIds.length === 0) return; // Skip empty departments

      if (index > 0 && currentY > 250) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.setFont('helvetica', 'bold');
      doc.text(`Linha/Departamento: ${dept.name}`, 14, currentY);
      currentY += 6;

      const tableData = toolIds.map(toolId => {
        const tool = tools.find(t => t.id === toolId);
        const stations = deptData.stations?.[toolId] || [];
        const stationsText = stations.length > 0 ? stations.join(', ') : '-';
        return [
          tool?.name || 'Ferramenta Desconhecida',
          tool?.brand || '-',
          deptData.individual[toolId] || 0,
          deptData.collective[toolId] || 0,
          deptData.total[toolId],
          stationsText
        ];
      });

      autoTable(doc, {
        startY: currentY,
        head: [['Ferramenta', 'Marca', 'Indiv.', 'Colet.', 'Total', 'Postos']],
        body: tableData,
        theme: 'grid',
        headStyles: { 
          fillColor: [15, 118, 110], // teal-700 (Volga brand color)
          textColor: [255, 255, 255],
          fontSize: 10,
          fontStyle: 'bold'
        },
        bodyStyles: {
          fontSize: 9,
          textColor: [51, 65, 85] // slate-700
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252] // slate-50
        },
        margin: { top: 15 },
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
        <div className="space-y-8 max-w-6xl mx-auto">
          {filteredDepartments.map(dept => {
            const deptData = reportData[dept.id];
            const toolIds = Object.keys(deptData?.total || {});
            
            if (toolIds.length === 0) return null;

            return (
              <div key={dept.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="bg-slate-100 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-bold text-slate-800">{dept.name}</h2>
                  </div>
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
                        <th className="p-4 font-semibold text-center">
                          <div className="flex flex-col items-center">
                            <Users className="w-4 h-4 mb-1 text-slate-400" />
                            <span>Individual</span>
                          </div>
                        </th>
                        <th className="p-4 font-semibold text-center">
                          <div className="flex flex-col items-center">
                            <Building2 className="w-4 h-4 mb-1 text-slate-400" />
                            <span>Coletivo</span>
                          </div>
                        </th>
                        <th className="p-4 font-semibold text-center bg-blue-50/50">
                          <div className="flex flex-col items-center">
                            <span className="text-blue-600">Total</span>
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {toolIds.map(toolId => {
                        const tool = tools.find(t => t.id === toolId);
                        const individualQty = deptData.individual[toolId] || 0;
                        const collectiveQty = deptData.collective[toolId] || 0;
                        const requiredCollectiveQty = deptData.requiredCollective[toolId] || 0;
                        const totalQty = deptData.total[toolId];
                        const stations = deptData.stations?.[toolId] || [];

                        return (
                          <tr key={toolId} className="hover:bg-slate-50 transition-colors">
                            <td className="p-4">
                              <p className="text-slate-800 font-medium">{tool?.name || 'Ferramenta Desconhecida'}</p>
                              <div className="flex flex-col gap-1 mt-1">
                                <p className="text-[10px] text-slate-400 uppercase tracking-tighter">{tool?.category}</p>
                                {stations.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {stations.map((station, idx) => (
                                      <span key={idx} className="bg-amber-50 text-amber-700 text-[9px] px-1.5 py-0.5 rounded border border-amber-200">
                                        Posto: {station}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="p-4 text-slate-600">{tool?.brand || '-'}</td>
                            <td className="p-4 text-center">
                              <span className={`text-sm ${individualQty > 0 ? 'text-slate-700 font-medium' : 'text-slate-300'}`}>
                                {individualQty}
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              <div className="flex flex-col items-center">
                                <span className={`text-sm ${collectiveQty > 0 ? 'text-amber-700 font-medium' : 'text-slate-300'}`}>
                                  {collectiveQty}
                                </span>
                                {requiredCollectiveQty > collectiveQty && (
                                  <span className="text-[9px] text-red-500 font-bold mt-0.5">Falta {requiredCollectiveQty - collectiveQty}</span>
                                )}
                              </div>
                            </td>
                            <td className="p-4 text-center bg-blue-50/30">
                              <span className="inline-flex items-center justify-center min-w-[2rem] h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-sm px-2">
                                {totalQty}
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
          
          {filteredDepartments.every(dept => Object.keys(reportData[dept.id]?.total || {}).length === 0) && (
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
