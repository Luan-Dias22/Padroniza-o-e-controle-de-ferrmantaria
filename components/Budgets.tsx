import React, { useState, useMemo } from 'react';
import { Tool, Department, Assignment, Employee, StandardToolList, CollectiveStation, CollectiveLine } from '@/lib/data';
import { Calculator, Download, Save, Search } from 'lucide-react';
import { motion } from 'motion/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getLogoBase64 } from '@/lib/pdfUtils';
import { sortByName } from '@/lib/utils';

interface BudgetsProps {
  tools: Tool[];
  setTools: (tools: Tool[]) => void;
  departments: Department[];
  assignments: Assignment[];
  employees: Employee[];
  collectiveStations: CollectiveStation[];
  standardLists: StandardToolList[];
  collectiveLines: CollectiveLine[];
}

export default function Budgets({ 
  tools, setTools, departments, assignments, employees, collectiveStations, standardLists, collectiveLines 
}: BudgetsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingPrices, setEditingPrices] = useState<Record<string, string>>({});
  const [toolCategoryFilter, setToolCategoryFilter] = useState<'all' | 'collective' | 'individual'>('all');

  // Initialize editing prices with current tool prices
  React.useEffect(() => {
    const initialPrices: Record<string, string> = {};
    tools.forEach(tool => {
      initialPrices[tool.id] = tool.price !== undefined ? tool.price.toString() : '';
    });
    setEditingPrices(initialPrices);
  }, [tools]);

  const handlePriceChange = (toolId: string, value: string) => {
    setEditingPrices(prev => ({ ...prev, [toolId]: value }));
  };

  const handleSavePrices = () => {
    const updatedTools = tools.map(tool => {
      const newPriceStr = editingPrices[tool.id];
      const newPrice = newPriceStr ? parseFloat(newPriceStr) : null;
      
      const updatedTool = { ...tool };
      if (newPriceStr === '' || isNaN(newPrice as number) || newPrice === null) {
        delete updatedTool.price;
      } else {
        updatedTool.price = newPrice;
      }
      return updatedTool;
    });
    setTools(updatedTools);
  };

  // Calculate tool quantities per line (department or collective line)
  const budgetData = useMemo(() => {
    const data: Record<string, { 
      name: string;
      expectedNewcomers: number;
      requiredCost: number;
      missingCost: number;
      tools: { tool: Tool, required: number, missing: number, costRequired: number, costMissing: number }[];
    }> = {};

    // Initialize data structure for all departments
    (departments || []).forEach(dept => {
      data[dept.id] = { name: dept.name, expectedNewcomers: dept.expectedNewcomers || 0, requiredCost: 0, missingCost: 0, tools: [] };
    });

    // Initialize data structure for collective lines that are NOT departments
    (collectiveLines || []).forEach(line => {
      const isDepartment = (departments || []).some(d => d.name === line.name);
      if (isDepartment) return;
      const lineId = `line_${line.id}`;
      data[lineId] = { name: line.name, expectedNewcomers: 0, requiredCost: 0, missingCost: 0, tools: [] };
    });

    // Calculate Collective Tools
    if (toolCategoryFilter === 'all' || toolCategoryFilter === 'collective') {
      const processCollectiveStations = (stations: CollectiveStation[], lineName: string, lineId: string) => {
        if (!data[lineId]) return;
        
        // Aggregate tools for this line
        const lineTools: Record<string, { required: number, available: number }> = {};
        
        stations.filter(s => s.line === lineName).forEach(s => {
          (s.tools || []).forEach(t => {
            if (t.toolId) {
              if (!lineTools[t.toolId]) lineTools[t.toolId] = { required: 0, available: 0 };
              lineTools[t.toolId].required += (t.requiredQuantity ?? t.quantity);
              lineTools[t.toolId].available += t.quantity;
            }
          });
        });

        Object.keys(lineTools).forEach(toolId => {
          const tool = tools.find(t => t.id === toolId);
          if (tool) {
            const required = lineTools[toolId].required;
            const missing = Math.max(0, required - lineTools[toolId].available);
            const price = tool.price || 0;
            
            const costRequired = required * price;
            const costMissing = missing * price;

            data[lineId].requiredCost += costRequired;
            data[lineId].missingCost += costMissing;
            
            data[lineId].tools.push({ tool, required, missing, costRequired, costMissing });
          }
        });
      };

      // Process collective tools for departments
      (departments || []).forEach(dept => {
        processCollectiveStations(collectiveStations || [], dept.name, dept.id);
      });

      // Process collective tools for collective lines
      (collectiveLines || []).forEach(line => {
        const isDepartment = (departments || []).some(d => d.name === line.name);
        if (isDepartment) return;
        processCollectiveStations(collectiveStations || [], line.name, `line_${line.id}`);
      });
    }

    // Calculate Individual Tools (only for departments)
    if (toolCategoryFilter === 'all' || toolCategoryFilter === 'individual') {
      (departments || []).forEach(dept => {
        if (!dept.standardListId) return;
        
        const standardList = (standardLists || []).find(l => l.id === dept.standardListId);
        if (!standardList) return;

        const deptEmployees = (employees || []).filter(e => e.departmentId === dept.id);
        const deptEmployeesCount = Math.max(deptEmployees.length + (dept.expectedNewcomers || 0), dept.requiredHeadcount || 0);
        
        // Calculate available tools from assignments
        const availableTools: Record<string, number> = {};
        (assignments || []).filter(a => a.departmentId === dept.id).forEach(assignment => {
          (assignment.assignedTools || []).forEach(t => {
            availableTools[t.toolId] = (availableTools[t.toolId] || 0) + t.quantity;
          });
        });

        (standardList.tools || []).forEach(t => {
          const tool = tools.find(tool => tool.id === t.toolId);
          if (tool) {
            const required = t.quantity * deptEmployeesCount;
            const available = availableTools[t.toolId] || 0;
            const missing = Math.max(0, required - available);
            const price = tool.price || 0;

            const costRequired = required * price;
            const costMissing = missing * price;

            data[dept.id].requiredCost += costRequired;
            data[dept.id].missingCost += costMissing;

            // Check if tool already exists in this line's tools array (from collective)
            const existingToolIndex = data[dept.id].tools.findIndex(item => item.tool.id === tool.id);
            if (existingToolIndex >= 0) {
              data[dept.id].tools[existingToolIndex].required += required;
              data[dept.id].tools[existingToolIndex].missing += missing;
              data[dept.id].tools[existingToolIndex].costRequired += costRequired;
              data[dept.id].tools[existingToolIndex].costMissing += costMissing;
            } else {
              data[dept.id].tools.push({ tool, required, missing, costRequired, costMissing });
            }
          }
        });
      });
    }

    // Sort the budget data based on the requested order
    const sortedData = Object.entries(data).sort(([, a], [, b]) => sortByName(a.name, b.name));

    return Object.fromEntries(sortedData);
  }, [tools, departments, assignments, employees, collectiveStations, standardLists, collectiveLines, toolCategoryFilter]);

  const generatePDF = () => {
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

    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.setFont('helvetica', 'bold');
    let title = 'RELATÓRIO DE ORÇAMENTOS';
    if (toolCategoryFilter === 'collective') title += ' (COLETIVAS)';
    if (toolCategoryFilter === 'individual') title += ' (INDIVIDUAIS)';
    doc.text(title, 196, 22, { align: 'right' });
    
    doc.setFontSize(9);
    doc.setTextColor(15, 118, 110); // teal-700 (Volga Teal)
    doc.setFont('helvetica', 'bold');
    doc.text(`DATA: ${new Date().toLocaleDateString('pt-BR')} | HORA: ${new Date().toLocaleTimeString('pt-BR')}`, 196, 28, { align: 'right' });
    doc.text(`SYS-ID: VOLGA-BUD-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`, 196, 33, { align: 'right' });

    // Accent line
    doc.setDrawColor(15, 118, 110); // teal-700
    doc.setLineWidth(1.5);
    doc.line(0, 45, 210, 45);

    let isFirstLine = true;
    let yPos = 55;

    Object.values(budgetData).forEach(line => {
      if (line.tools.length === 0) return;

      if (!isFirstLine) {
        doc.addPage();
        yPos = 20;
      } else {
        isFirstLine = false;
        yPos = 55;
      }

      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.setFont('helvetica', 'bold');
      const lineText = `LINHA/DEPARTAMENTO: ${line.name.toUpperCase()}`;
      doc.text(lineText, 14, yPos);
      
      if (line.expectedNewcomers > 0) {
        const textWidth = doc.getTextWidth(lineText);
        doc.setFontSize(10);
        doc.setTextColor(16, 185, 129); // emerald-500
        doc.setFont('courier', 'bold');
        doc.text(`[+${line.expectedNewcomers} NOVATOS PREVISTOS]`, 14 + textWidth + 4, yPos);
      }
      yPos += 8;

      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105); // slate-600
      doc.setFont('courier', 'bold');
      doc.text(`CUSTO TOTAL NECESSÁRIO: R$ ${line.requiredCost.toFixed(2)}`, 14, yPos);
      doc.setTextColor(220, 38, 38); // red-600
      doc.text(`CUSTO TOTAL FALTANTE: R$ ${line.missingCost.toFixed(2)}`, 100, yPos);
      yPos += 6;

      const tableData = line.tools.map(t => [
        t.tool.name.toUpperCase(),
        t.tool.brand.toUpperCase(),
        `R$ ${(t.tool.price || 0).toFixed(2)}`,
        t.required.toString(),
        t.missing.toString(),
        `R$ ${t.costRequired.toFixed(2)}`,
        `R$ ${t.costMissing.toFixed(2)}`
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['FERRAMENTA', 'MARCA', 'VALOR UNIT.', 'QTD. NEC.', 'QTD. FAL.', 'CUSTO NEC.', 'CUSTO FAL.']],
        body: tableData,
        theme: 'grid',
        styles: {
          font: 'helvetica',
          fontSize: 7,
          cellPadding: 2,
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
          textColor: [51, 65, 85] // slate-700
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252] // slate-50
        },
        columnStyles: {
          0: { fontStyle: 'bold', halign: 'left', cellWidth: 45 },
          1: { halign: 'left', cellWidth: 25 },
          2: { halign: 'right', cellWidth: 25 },
          3: { halign: 'center', fontStyle: 'bold', cellWidth: 15 },
          4: { halign: 'center', fontStyle: 'bold', textColor: [220, 38, 38], cellWidth: 15 }, // red-600
          5: { halign: 'right', cellWidth: 25 },
          6: { halign: 'right', fontStyle: 'bold', textColor: [220, 38, 38], cellWidth: 25 } // red-600
        },
        margin: { left: 14, right: 14 }
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;
    });

    // Add Footer with page numbers
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.setFont('helvetica', 'normal');
      doc.text(`PÁGINA ${i} DE ${pageCount} | GERADO PELO SISTEMA VOLGA TOOLMANAGER`, 105, 285, { align: 'center' });
    }

    doc.save('orcamentos_linhas.pdf');
  };

  const filteredTools = tools.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    t.brand.toLowerCase().includes(searchQuery.toLowerCase())
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.2)]">
            <Calculator className="w-5 h-5 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Orçamentos</h1>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <select
            value={toolCategoryFilter}
            onChange={(e) => setToolCategoryFilter(e.target.value as any)}
            className="w-full sm:w-auto p-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-sm text-slate-200 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-all appearance-none"
          >
            <option value="all">Todas as Ferramentas</option>
            <option value="collective">Apenas Coletivas</option>
            <option value="individual">Apenas Individuais</option>
          </select>
          <button
            onClick={generatePDF}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-5 py-2.5 rounded-xl hover:from-emerald-500 hover:to-teal-500 transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            Gerar PDF
          </button>
        </div>
      </div>

      <motion.div variants={itemVariants} className="bg-slate-900/50 backdrop-blur-md rounded-2xl shadow-xl border border-slate-800 overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-900/80">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar ferramentas para definir preço..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-700 bg-slate-950/50 text-slate-200 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-all text-sm"
            />
          </div>
          <button
            onClick={handleSavePrices}
            className="flex items-center gap-2 bg-blue-600/20 border border-blue-500/30 hover:bg-blue-600/30 text-blue-400 px-5 py-2.5 rounded-xl transition-all shadow-sm w-full sm:w-auto justify-center"
          >
            <Save className="w-4 h-4" />
            Salvar Preços
          </button>
        </div>

        <div className="overflow-x-auto custom-scrollbar max-h-96">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-slate-950/90 backdrop-blur-sm z-10">
              <tr className="border-b border-slate-800">
                <th className="p-4 text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold">Ferramenta</th>
                <th className="p-4 text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold">Marca</th>
                <th className="p-4 text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold">Categoria</th>
                <th className="p-4 text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold w-48">Valor Unitário (R$)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filteredTools.map((tool, idx) => (
                <motion.tr 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.02 }}
                  key={tool.id} 
                  className="hover:bg-slate-800/30 transition-colors"
                >
                  <td className="p-4 text-sm text-slate-200 font-medium">{tool.name}</td>
                  <td className="p-4 text-xs font-mono text-slate-400 uppercase tracking-wider">{tool.brand}</td>
                  <td className="p-4 text-sm text-slate-400">
                    <span className="px-2.5 py-1 bg-slate-800/50 border border-slate-700 text-slate-300 rounded-lg text-[10px] font-mono uppercase tracking-wider">
                      {tool.category}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-mono">R$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editingPrices[tool.id] ?? ''}
                        onChange={(e) => handlePriceChange(tool.id, e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-700 bg-slate-950/50 text-slate-200 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-all text-sm font-mono"
                        placeholder="0.00"
                      />
                    </div>
                  </td>
                </motion.tr>
              ))}
              {filteredTools.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500 font-mono text-sm">
                    Nenhuma ferramenta encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.values(budgetData).map((line, idx) => {
          if (line.tools.length === 0) return null;
          
          return (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1 }}
              key={line.name} 
              className="bg-slate-900/50 backdrop-blur-md rounded-2xl shadow-xl border border-slate-800 p-6 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500/50 to-teal-500/50" />
              <h3 className="text-lg font-bold text-white mb-5 border-b border-slate-800 pb-3 flex items-center justify-between">
                <span>{line.name}</span>
                {line.expectedNewcomers > 0 && (
                  <span className="text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-lg uppercase tracking-wider">
                    +{line.expectedNewcomers} novatos
                  </span>
                )}
              </h3>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-blue-500/5 p-4 rounded-xl border border-blue-500/10">
                  <p className="text-[10px] font-mono text-blue-400/70 uppercase tracking-widest mb-1">Custo Necessário</p>
                  <p className="text-2xl font-bold text-blue-400 font-mono">
                    R$ {line.requiredCost.toFixed(2)}
                  </p>
                </div>
                <div className="bg-red-500/5 p-4 rounded-xl border border-red-500/10">
                  <p className="text-[10px] font-mono text-red-400/70 uppercase tracking-widest mb-1">Custo Faltante</p>
                  <p className="text-2xl font-bold text-red-400 font-mono">
                    R$ {line.missingCost.toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-[10px] font-mono font-semibold text-slate-500 uppercase tracking-widest">Detalhamento</h4>
                <div className="max-h-60 overflow-y-auto custom-scrollbar pr-2 space-y-2">
                  {line.tools.map((t, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm p-3 bg-slate-950/30 border border-slate-800/50 hover:border-slate-700 rounded-xl transition-colors">
                      <div className="flex-1">
                        <p className="font-medium text-slate-200">{t.tool.name}</p>
                        <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mt-0.5">{t.tool.brand} • R$ {(t.tool.price || 0).toFixed(2)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-slate-400 text-xs">
                          <span className="font-bold text-slate-200">{t.missing}</span> faltam de {t.required}
                        </p>
                        <p className="text-xs font-mono font-bold text-red-400 mt-0.5">
                          R$ {t.costMissing.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </motion.div>
  );
}
