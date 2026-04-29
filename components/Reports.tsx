import React, { useState, useMemo } from 'react';
import { Tool, Department, Assignment, Employee, StandardToolList, CollectiveStation, CollectiveLine, StockEntry } from '@/lib/data';
import { FileText, Search, Download, Filter, Users, Building2, Package, X } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx-js-style';
import { getLogoBase64 } from '@/lib/pdfUtils';
import { motion, AnimatePresence } from 'motion/react';
import { sortByName } from '@/lib/utils';

interface ReportsProps {
  tools: Tool[];
  departments: Department[];
  assignments: Assignment[];
  employees: Employee[];
  collectiveStations: CollectiveStation[];
  standardLists: StandardToolList[];
  collectiveLines: CollectiveLine[];
  stockEntries?: StockEntry[];
  cases?: Case[];
  caseInspections?: CaseInspection[];
}

export default function Reports({ tools, departments, assignments, employees, collectiveStations, standardLists, collectiveLines, stockEntries, cases = [], caseInspections = [] }: ReportsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedToolType, setSelectedToolType] = useState<'all' | 'individual' | 'collective'>('all');
  const [specificToolId, setSpecificToolId] = useState<string>('');
  const [isToolSearchOpen, setIsToolSearchOpen] = useState(false);
  const [toolSearchValue, setToolSearchValue] = useState('');
  const toolListRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (toolListRef.current && !toolListRef.current.contains(event.target as Node)) {
        setIsToolSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Calculate tool quantities per department
  const reportData = useMemo(() => {
    const data: Record<string, { 
      individual: Record<string, number>, 
      collective: Record<string, number>,
      stockIndividual: Record<string, number>,
      stockCollective: Record<string, number>,
      stockStation: Record<string, Record<string, number>>,
      requiredCollective: Record<string, number>,
      requiredIndividual: Record<string, number>,
      total: Record<string, number>,
      stations: Record<string, string[]>,
      stationDetails: Record<string, { name: string, missing: number, required: number, current: number }[]>,
      standardQtyPerBox: Record<string, number>
    }> = {};

    // Initialize data structure for all departments
    (departments || []).forEach(dept => {
      data[dept.id] = {
        individual: {},
        collective: {},
        stockIndividual: {},
        stockCollective: {},
        stockStation: {},
        requiredCollective: {},
        requiredIndividual: {},
        total: {},
        stations: {},
        stationDetails: {},
        standardQtyPerBox: {}
      };
      
      // Add tools from new collectiveStations collection
      // Match by line name if it matches department name
      (collectiveStations || [])
        .filter(s => s.line === dept.name)
        .forEach(s => {
          (s.tools || []).forEach(tool => {
            if (tool.toolId) {
              data[dept.id].requiredCollective[tool.toolId] = (data[dept.id].requiredCollective[tool.toolId] || 0) + (tool.requiredQuantity ?? tool.quantity);
              
              if (!data[dept.id].stations[tool.toolId]) {
                data[dept.id].stations[tool.toolId] = [];
                data[dept.id].stationDetails[tool.toolId] = [];
              }
              if (!data[dept.id].stations[tool.toolId].includes(s.name)) {
                data[dept.id].stations[tool.toolId].push(s.name);
                const required = tool.requiredQuantity ?? tool.quantity;
                const current = 0;
                const missing = Math.max(0, required - current);
                data[dept.id].stationDetails[tool.toolId].push({ name: s.name, missing, required, current });
              }
            }
          });
        });
    });

    // Initialize data structure for collective lines that are NOT departments
    (collectiveLines || []).forEach(line => {
      // Check if this line is already a department to avoid duplication
      const isDepartment = (departments || []).some(d => d.name === line.name);
      if (isDepartment) return;

      // Use a prefix to distinguish from department IDs
      const lineId = `line_${line.id}`;
      
      data[lineId] = {
        individual: {},
        collective: {},
        stockIndividual: {},
        stockCollective: {},
        stockStation: {},
        requiredCollective: {},
        requiredIndividual: {},
        total: {},
        stations: {},
        stationDetails: {},
        standardQtyPerBox: {}
      };

      (collectiveStations || [])
        .filter(s => s.line === line.name)
        .sort((a, b) => {
          const numA = parseInt(a.name.match(/\d+/)?.[0] || '0', 10);
          const numB = parseInt(b.name.match(/\d+/)?.[0] || '0', 10);
          if (numA !== numB) return numA - numB;
          return a.name.localeCompare(b.name);
        })
        .forEach(s => {
          (s.tools || []).forEach(tool => {
            if (tool.toolId) {
              data[lineId].requiredCollective[tool.toolId] = (data[lineId].requiredCollective[tool.toolId] || 0) + (tool.requiredQuantity ?? tool.quantity);
              
              if (!data[lineId].stations[tool.toolId]) {
                data[lineId].stations[tool.toolId] = [];
                data[lineId].stationDetails[tool.toolId] = [];
              }
              if (!data[lineId].stations[tool.toolId].includes(s.name)) {
                data[lineId].stations[tool.toolId].push(s.name);
                const required = tool.requiredQuantity ?? tool.quantity;
                const current = 0;
                const missing = Math.max(0, required - current);
                data[lineId].stationDetails[tool.toolId].push({ name: s.name, missing, required, current });
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

    // Aggregate stock entries
    (stockEntries || []).forEach(se => {
      if (!data[se.lineId]) return;
      
      if (se.type === 'individual') {
        data[se.lineId].stockIndividual[se.toolId] = (data[se.lineId].stockIndividual[se.toolId] || 0) + se.quantity;
      } else {
        // Add to collective count for the line/dept
        data[se.lineId].collective[se.toolId] = (data[se.lineId].collective[se.toolId] || 0) + se.quantity;

        if (se.station) {
          if (!data[se.lineId].stockStation[se.toolId]) data[se.lineId].stockStation[se.toolId] = {};
          data[se.lineId].stockStation[se.toolId][se.station] = (data[se.lineId].stockStation[se.toolId][se.station] || 0) + se.quantity;
        } else {
          data[se.lineId].stockCollective[se.toolId] = (data[se.lineId].stockCollective[se.toolId] || 0) + se.quantity;
        }
      }
      
      data[se.lineId].total[se.toolId] = (data[se.lineId].total[se.toolId] || 0) + se.quantity;
    });

    // Aggregate tools from active cases (Maletas)
    (cases || []).filter(c => c.status === 'Ativa').forEach(c => {
      // Find matching department by name (sector)
      const dept = departments.find(d => d.name === c.sector);
      if (!dept) return;
      
      const deptId = dept.id;
      if (!data[deptId]) return;

      // Find last inspection
      const lastInspection = [...caseInspections]
        .filter(i => i.caseId === c.id)
        .sort((a, b) => b.date.localeCompare(a.date))[0];
      
      c.tools.forEach(caseTool => {
        // Count tool as "Ativo" if it's OK in the last inspection
        // or if there is no inspection yet (assume OK initially)
        const inspectionItem = lastInspection?.items.find(i => i.itemTag === caseTool.itemTag);
        const isOK = !inspectionItem || inspectionItem.status === 'OK';

        if (isOK) {
          // Case tools are treated as individual assignments for the department
          data[deptId].individual[caseTool.toolId] = (data[deptId].individual[caseTool.toolId] || 0) + 1;
          data[deptId].total[caseTool.toolId] = (data[deptId].total[caseTool.toolId] || 0) + 1;
        }
      });
    });

    // Update stationDetails with stock quantities
    Object.keys(data).forEach(id => {
      const deptData = data[id];
      Object.keys(deptData.stationDetails).forEach(toolId => {
        deptData.stationDetails[toolId].forEach(detail => {
          const stockQty = deptData.stockStation[toolId]?.[detail.name] || 0;
          if (stockQty > 0) {
            detail.current += stockQty;
            detail.missing = Math.max(0, detail.required - detail.current);
          }
        });
      });
    });

    // Calculate required individual tools based on employees and standard lists
    (departments || []).forEach(dept => {
      if (!dept.standardListId || !data[dept.id]) return;
      
      const standardList = (standardLists || []).find(l => l.id === dept.standardListId);
      if (!standardList) return;

      const currentEmployeesCount = (employees || []).filter(e => e.departmentId === dept.id).length;
      const deptEmployeesCount = Math.max(currentEmployeesCount + (dept.expectedNewcomers || 0), dept.requiredHeadcount || 0);
      
      (standardList.tools || []).forEach(tool => {
        const requiredQty = tool.quantity * deptEmployeesCount;
        // We use requiredCollective as a general "required" bucket for collective tools, 
        // but for individual tools we need to factor this into the "Nec." (Necessary) column.
        // Let's add a new field to track required individual tools.
        data[dept.id].requiredIndividual[tool.toolId] = requiredQty;
        data[dept.id].standardQtyPerBox[tool.toolId] = tool.quantity;
        
        // Ensure the tool is in the total list so it shows up in the report even if not assigned yet
        if (data[dept.id].total[tool.toolId] === undefined) {
          data[dept.id].total[tool.toolId] = 0;
        }
      });
    });

    return data;
  }, [assignments, departments, collectiveStations, employees, standardLists, collectiveLines, stockEntries, cases, caseInspections]);

  // Aggregate global tool stats
  const globalToolStats = useMemo(() => {
    const stats: Record<string, { required: number, current: number, missing: number }> = {};
    
    Object.keys(reportData).forEach(deptId => {
      const deptData = reportData[deptId];
      const toolIds = Object.keys(deptData.total || {});
      
      toolIds.forEach(toolId => {
        if (!stats[toolId]) stats[toolId] = { required: 0, current: 0, missing: 0 };
        
        const individualQty = deptData.individual[toolId] || 0;
        const stockIndQty = deptData.stockIndividual[toolId] || 0;
        
        // collectiveQty already contains the sum of all collective stock entries for this line
        const collectiveQty = deptData.collective[toolId] || 0;
        
        const reqInd = deptData.requiredIndividual[toolId] || 0;
        const reqCol = deptData.requiredCollective[toolId] || 0;

        stats[toolId].required += (reqInd + reqCol);
        stats[toolId].current += (individualQty + stockIndQty + collectiveQty);
      });
    });

    Object.keys(stats).forEach(toolId => {
      stats[toolId].missing = Math.max(0, stats[toolId].required - stats[toolId].current);
    });

    return stats;
  }, [reportData]);

  // Combine departments and collective lines for filtering and display
  const allReportEntities = useMemo(() => {
    const entities: { id: string, name: string, isLineOnly?: boolean }[] = [...departments];
    
    (collectiveLines || []).forEach(line => {
      if (!entities.some(e => e.name === line.name)) {
        entities.push({ id: `line_${line.id}`, name: line.name, isLineOnly: true });
      }
    });
    
    return entities.sort((a, b) => sortByName(a.name, b.name));
  }, [departments, collectiveLines]);

  const filteredDepartments = allReportEntities.filter(dept => {
    if (selectedDepartment !== 'all' && dept.id !== selectedDepartment) return false;
    
    // Filter by specific tool if selected
    if (specificToolId) {
      const deptData = reportData[dept.id];
      if (!deptData) return false;
      
      const hasSpecificTool = (deptData.total && deptData.total[specificToolId] !== undefined) || 
                              (deptData.requiredIndividual && deptData.requiredIndividual[specificToolId] !== undefined) ||
                              (deptData.requiredCollective && deptData.requiredCollective[specificToolId] !== undefined);
      
      if (!hasSpecificTool) return false;
    }

    if (searchQuery) {
      return dept.name.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  const dropdownEntities = useMemo(() => {
    if (selectedToolType === 'all') return allReportEntities;
    
    return allReportEntities.filter(entity => {
      if (selectedToolType === 'individual') {
        const data = reportData[entity.id];
        return data && (Object.keys(data.individual).length > 0 || Object.keys(data.requiredIndividual).length > 0);
      }
      
      if (selectedToolType === 'collective') {
        return (collectiveStations || []).some(s => s.line === entity.name);
      }
      
      return true;
    });
  }, [allReportEntities, selectedToolType, reportData, collectiveStations]);

  const summaryData = useMemo(() => {
    let indCurrent = 0;
    let indMissing = 0;
    let colCurrent = 0;
    let colMissing = 0;

    filteredDepartments.forEach(dept => {
      const deptData = reportData[dept.id];
      if (!deptData) return;

      let toolIds = Object.keys(deptData.total || {}).filter(toolId => {
        // If specific tool is selected, we only care about that tool in the summary
        if (specificToolId && toolId !== specificToolId) return false;

        const hasIndividual = (deptData.individual[toolId] || 0) > 0 || (deptData.requiredIndividual[toolId] !== undefined);
        const hasCollective = (deptData.collective[toolId] || 0) > 0 || (deptData.requiredCollective[toolId] !== undefined) || (deptData.stations[toolId] && deptData.stations[toolId].length > 0);
        
        if (selectedToolType === 'individual') return hasIndividual;
        if (selectedToolType === 'collective') return hasCollective;
        return hasIndividual || hasCollective;
      });

      // If specific tool is selected but not in total, check if it's required (edge case)
      if (specificToolId && !toolIds.includes(specificToolId)) {
        const isRequired = (deptData.requiredIndividual && deptData.requiredIndividual[specificToolId] !== undefined) ||
                           (deptData.requiredCollective && deptData.requiredCollective[specificToolId] !== undefined);
        if (isRequired) toolIds = [specificToolId];
      }

      toolIds.forEach(toolId => {
        const currentInd = deptData.individual[toolId] || 0;
        const requiredInd = deptData.requiredIndividual[toolId] || 0;
        const missingInd = Math.max(0, requiredInd - currentInd);

        const currentCol = deptData.collective[toolId] || 0;
        const requiredCol = deptData.requiredCollective[toolId] || 0;
        const missingCol = Math.max(0, requiredCol - currentCol);

        if (selectedToolType === 'all' || selectedToolType === 'individual') {
          indCurrent += currentInd;
          indMissing += missingInd;
        }
        
        if (selectedToolType === 'all' || selectedToolType === 'collective') {
          colCurrent += currentCol;
          colMissing += missingCol;
        }
      });
    });

    return {
      individual: { current: indCurrent, missing: indMissing },
      collective: { current: colCurrent, missing: colMissing },
      total: { current: indCurrent + colCurrent, missing: indMissing + colMissing }
    };
  }, [filteredDepartments, reportData, selectedToolType, specificToolId]);

  const handleExportPDF = () => {
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
    const title = selectedToolType === 'all' 
      ? 'RELATÓRIO DE FERRAMENTAS' 
      : `RELATÓRIO: FERRAMENTAS ${selectedToolType === 'individual' ? 'INDIVIDUAIS' : 'COLETIVAS'}`;
    doc.text(title, 196, 22, { align: 'right' });
    
    doc.setFontSize(9);
    doc.setTextColor(15, 118, 110); // teal-700
    doc.setFont('helvetica', 'bold');
    doc.text(`DATA: ${new Date().toLocaleDateString('pt-BR')} | HORA: ${new Date().toLocaleTimeString('pt-BR')}`, 196, 28, { align: 'right' });
    doc.text(`SYS-ID: REP-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`, 196, 33, { align: 'right' });

    // Accent line
    doc.setDrawColor(15, 118, 110); // teal-700
    doc.setLineWidth(1.5);
    doc.line(0, 45, 210, 45);

    let currentY = 55;

    filteredDepartments.forEach((dept, index) => {
      const deptData = reportData[dept.id];
      const toolIds = Object.keys(deptData?.total || {}).filter(toolId => {
        const hasIndividual = (deptData.individual[toolId] || 0) > 0 || (deptData.requiredIndividual[toolId] || 0) > 0;
        const hasCollective = (deptData.collective[toolId] || 0) > 0 || (deptData.requiredCollective[toolId] || 0) > 0 || (deptData.stations[toolId] && deptData.stations[toolId].length > 0);
        
        if (selectedToolType === 'individual') return hasIndividual;
        if (selectedToolType === 'collective') return hasCollective;
        return hasIndividual || hasCollective;
      });
      
      if (toolIds.length === 0) return; // Skip empty departments

      if (index > 0 && currentY > 250) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.setFont('helvetica', 'bold');
      const deptText = `LINHA/DEPARTAMENTO: ${dept.name.toUpperCase()}`;
      
      const splitDeptText = doc.splitTextToSize(deptText, 182);
      doc.text(splitDeptText, 14, currentY);
      
      let lastLineWidth = doc.getTextWidth(splitDeptText[splitDeptText.length - 1]);
      let badgeY = currentY + ((splitDeptText.length - 1) * 6);
      
      // Find the original department to get expectedNewcomers and requiredHeadcount
      const originalDept = departments.find(d => d.id === dept.id);
      let badgeX = 14 + lastLineWidth + 4;
      
      if (originalDept) {
        let badges: {text: string, color: number[]}[] = [];
        if (originalDept.expectedNewcomers && originalDept.expectedNewcomers > 0) {
          badges.push({ text: `[+${originalDept.expectedNewcomers} NOVATOS]`, color: [16, 185, 129] });
        }
        if (originalDept.requiredHeadcount && originalDept.requiredHeadcount > 0) {
          badges.push({ text: `[META: ${originalDept.requiredHeadcount} FUNC.]`, color: [15, 118, 110] });
        }
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        
        let totalBadgesWidth = badges.reduce((acc, b) => acc + doc.getTextWidth(b.text) + 3, 0);
        
        if (badgeX + totalBadgesWidth > 196) {
          badgeX = 14;
          badgeY += 5;
        }
        
        badges.forEach(b => {
          doc.setTextColor(b.color[0], b.color[1], b.color[2]);
          doc.text(b.text, badgeX, badgeY);
          badgeX += doc.getTextWidth(b.text) + 3;
        });
      }
      
      currentY = badgeY + 6;

      const head = ['FERRAMENTA', 'MARCA', 'QTD/CAIXA', 'NEC.', 'ATU.', 'FAL.'];
      if (selectedToolType === 'all') head.push('POSTOS');
      if (selectedToolType === 'collective') {
        head.splice(1, 0, 'POSTO'); // Insert POSTO after FERRAMENTA
        // Remove QTD/CAIXA for collective as it doesn't apply the same way
        const boxIdx = head.indexOf('QTD/CAIXA');
        if (boxIdx > -1) head.splice(boxIdx, 1);
      }

      const tableData: any[][] = [];
      
      toolIds.forEach(toolId => {
        const tool = tools.find(t => t.id === toolId);
        const stations = deptData.stationDetails?.[toolId] || [];
        const stockIndQty = deptData.stockIndividual[toolId] || 0;
        const stockColQty = deptData.stockCollective[toolId] || 0;
        const stockStationData = deptData.stockStation[toolId] || {};
        
        if (selectedToolType === 'collective' && stations.length > 0) {
          // Expand rows for collective tools by station
          let remainingStock = stockColQty;
          
          stations.forEach(s => {
            let currentForStation = stockStationData[s.name] || 0;
            let missingForStation = Math.max(0, s.required - currentForStation);
            
            if (remainingStock > 0 && missingForStation > 0) {
              const allocated = Math.min(remainingStock, missingForStation);
              currentForStation += allocated;
              missingForStation -= allocated;
              remainingStock -= allocated;
            }

            tableData.push([
              tool?.name.toUpperCase() || 'DESCONHECIDA',
              s.name.toUpperCase(),
              tool?.brand.toUpperCase() || '-',
              s.required.toString(),
              currentForStation.toString(),
              missingForStation.toString()
            ]);
          });
        } else {
          // Grouped view for individual or combined
          const stationsText = stations.length > 0 
            ? stations.map(s => `${s.name}${s.missing > 0 ? ` (Falta ${s.missing})` : ''}`).join(', ') 
            : '-';
          
          const individualQty = deptData.individual[toolId] || 0;
          const stockColQtyTotal = (deptData.stockCollective[toolId] || 0) + Object.values(stockStationData).reduce((a,b)=>a+b,0);
          const requiredCollectiveQty = deptData.requiredCollective[toolId] || 0;
          const requiredIndividualQty = deptData.requiredIndividual[toolId] || 0;
          const standardQty = deptData.standardQtyPerBox[toolId] || 0;

          const reqQty = selectedToolType === 'all' 
            ? (requiredIndividualQty + requiredCollectiveQty)
            : (selectedToolType === 'individual' ? requiredIndividualQty : requiredCollectiveQty);

          const curQty = selectedToolType === 'all'
            ? (individualQty + stockIndQty + stockColQtyTotal)
            : (selectedToolType === 'individual' ? individualQty + stockIndQty : stockColQtyTotal);

          const missingQty = Math.max(0, reqQty - curQty);

          const row: any[] = [
            tool?.name.toUpperCase() || 'DESCONHECIDA',
            tool?.brand.toUpperCase() || '-',
            standardQty > 0 ? standardQty.toString() : '-',
            reqQty.toString(),
            curQty.toString(),
            missingQty.toString()
          ];
          
          if (selectedToolType === 'all') {
            row.push(stationsText.toUpperCase());
          }
          
          tableData.push(row);
        }
      });

      // Sort tableData by Posto (Station) for better visualization
      if (selectedToolType === 'collective') {
        tableData.sort((a, b) => {
          const postoA = a[1] || '';
          const postoB = b[1] || '';
          const cmp = postoA.localeCompare(postoB);
          if (cmp !== 0) return cmp;
          return (a[0] || '').localeCompare(b[0] || ''); // Tool name
        });
      } else if (selectedToolType === 'all') {
        tableData.sort((a, b) => {
          const postoA = a[6] || '';
          const postoB = b[6] || '';
          const cmp = postoA.localeCompare(postoB);
          if (cmp !== 0) return cmp;
          return (a[0] || '').localeCompare(b[0] || ''); // Tool name
        });
      }

      autoTable(doc, {
        startY: currentY,
        head: [head],
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
          textColor: [51, 65, 85] // slate-700
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252] // slate-50
        },
        columnStyles: selectedToolType === 'collective' ? {
          0: { fontStyle: 'bold', halign: 'left' },
          1: { halign: 'left' },
          2: { halign: 'left' },
          3: { halign: 'center' },
          4: { halign: 'center' },
          5: { halign: 'center', fontStyle: 'bold', textColor: [220, 38, 38] },
        } : {
          0: { fontStyle: 'bold', halign: 'left' },
          1: { halign: 'left' },
          2: { halign: 'center' }, // QTD/CAIXA
          3: { halign: 'center' },
          4: { halign: 'center' },
          5: { halign: 'center', fontStyle: 'bold', textColor: [220, 38, 38] },
          6: { halign: 'left' }, // POSTOS
        },
        margin: { top: 15 },
      });

      currentY = (doc as any).lastAutoTable.finalY + 15;
    });

    // Add Footer with page numbers
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.setFont('helvetica', 'normal');
      doc.text(`PÁGINA ${i} DE ${pageCount} | GERADO PELO SISTEMA TOOLMANAGER`, 105, 285, { align: 'center' });
    }

    doc.save(`relatorio-ferramentas-${new Date().getTime()}.pdf`);
  };

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();
    const wsData: any[][] = [];

    // Add headers
    const headers = [
      'LINHA / DEPARTAMENTO',
      'FERRAMENTA',
      'MARCA',
      'CATEGORIA',
      'QTD. NECESSÁRIA',
      'QTD. ATUAL',
      'QTD. FALTANTE'
    ];
    if (selectedToolType === 'collective' || selectedToolType === 'all') {
      headers.splice(2, 0, 'POSTO DE MONTAGEM');
    }
    wsData.push(headers);

    filteredDepartments.forEach(dept => {
      const deptData = reportData[dept.id];
      if (!deptData) return;

      const toolIds = Object.keys(deptData.requiredIndividual).concat(Object.keys(deptData.requiredCollective));
      const uniqueToolIds = Array.from(new Set(toolIds));

      const deptRows: any[][] = [];

      uniqueToolIds.forEach(toolId => {
        const tool = tools.find(t => t.id === toolId);
        const individualQty = deptData.individual[toolId] || 0;
        const collectiveQty = deptData.collective[toolId] || 0;
        const stockIndQty = deptData.stockIndividual[toolId] || 0;
        const stockColQty = deptData.stockCollective[toolId] || 0;
        const stockStationData = deptData.stockStation[toolId] || {};
        const requiredCollectiveQty = deptData.requiredCollective[toolId] || 0;
        const requiredIndividualQty = deptData.requiredIndividual[toolId] || 0;
        const stations = deptData.stationDetails?.[toolId] || [];

        if (selectedToolType === 'collective' && stations.length > 0) {
          // Distribute stock across stations to reduce missing
          let remainingStock = stockColQty;
          
          stations.forEach(s => {
            let currentForStation = stockStationData[s.name] || 0;
            let missingForStation = Math.max(0, s.required - currentForStation);
            
            if (remainingStock > 0 && missingForStation > 0) {
              const allocated = Math.min(remainingStock, missingForStation);
              currentForStation += allocated;
              missingForStation -= allocated;
              remainingStock -= allocated;
            }

            deptRows.push([
              dept.name.toUpperCase(),
              tool?.name.toUpperCase() || 'DESCONHECIDA',
              s.name.toUpperCase(),
              tool?.brand.toUpperCase() || '-',
              tool?.category.toUpperCase() || '-',
              s.required,
              currentForStation,
              missingForStation
            ]);
          });
        } else {
          const reqQty = selectedToolType === 'all' 
            ? (requiredIndividualQty + requiredCollectiveQty)
            : (selectedToolType === 'individual' ? requiredIndividualQty : requiredCollectiveQty);

          const curQty = selectedToolType === 'all'
            ? (individualQty + stockIndQty + stockColQtyTotal)
            : (selectedToolType === 'individual' ? individualQty + stockIndQty : stockColQtyTotal);

          const missingQty = Math.max(0, reqQty - curQty);
          
          if (reqQty === 0 && curQty === 0) return;

          const row: any[] = [
            dept.name.toUpperCase(),
            tool?.name.toUpperCase() || 'DESCONHECIDA',
          ];

          if (selectedToolType === 'all' || selectedToolType === 'collective') {
            const stationsText = stations.length > 0 
              ? stations.map(s => `${s.name}${s.missing > 0 ? ` (Falta ${s.missing})` : ''}`).join(', ') 
              : '-';
            row.push(stationsText.toUpperCase());
          }

          row.push(
            tool?.brand.toUpperCase() || '-',
            tool?.category.toUpperCase() || '-',
            reqQty,
            curQty,
            missingQty
          );
          
          deptRows.push(row);
        }
      });

      // Sort rows by Posto (Station) if applicable
      if (selectedToolType === 'collective') {
        deptRows.sort((a, b) => {
          const postoA = a[2] || '';
          const postoB = b[2] || '';
          const cmp = postoA.localeCompare(postoB);
          if (cmp !== 0) return cmp;
          return (a[1] || '').localeCompare(b[1] || ''); // Tool name
        });
      } else if (selectedToolType === 'all') {
        deptRows.sort((a, b) => {
          const postoA = a[2] || '';
          const postoB = b[2] || '';
          const cmp = postoA.localeCompare(postoB);
          if (cmp !== 0) return cmp;
          return (a[1] || '').localeCompare(b[1] || ''); // Tool name
        });
      }

      wsData.push(...deptRows);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    // Apply styles
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:H1');
    
    // Header style
    const headerStyle = {
      font: { bold: true, color: { rgb: "000000" } },
      fill: { fgColor: { rgb: "B4C6E7" } }, // Light blue
      alignment: { horizontal: "center", vertical: "center" },
      border: {
        top: { style: "thin", color: { rgb: "000000" } },
        bottom: { style: "thin", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "000000" } },
        right: { style: "thin", color: { rgb: "000000" } }
      }
    };

    // Body style
    const bodyStyle = {
      border: {
        top: { style: "thin", color: { rgb: "000000" } },
        bottom: { style: "thin", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "000000" } },
        right: { style: "thin", color: { rgb: "000000" } }
      }
    };

    for (let R = range.s.r; R <= range.e.r; ++R) {
      const rowData = wsData[R];
      if (!rowData || rowData.length === 0) continue;

      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        let cell = ws[cellAddress];
        
        if (!cell) {
          cell = { v: '', t: 's' };
          ws[cellAddress] = cell;
        }

        if (R === 0) {
          cell.s = headerStyle;
        } else {
          cell.s = bodyStyle;
        }
      }
    }

    // Auto-size columns
    const colWidths = headers.map(() => ({ wch: 20 }));
    colWidths[0] = { wch: 30 }; // Linha
    colWidths[1] = { wch: 45 }; // Ferramenta
    if (selectedToolType === 'collective' || selectedToolType === 'all') {
      colWidths[2] = { wch: 35 }; // Posto
      colWidths[3] = { wch: 20 }; // Marca
      colWidths[4] = { wch: 20 }; // Categoria
      colWidths[5] = { wch: 18 }; // Qtd Nec
      colWidths[6] = { wch: 18 }; // Qtd Atu
      colWidths[7] = { wch: 18 }; // Qtd Fal
    } else {
      colWidths[2] = { wch: 20 }; // Marca
      colWidths[3] = { wch: 20 }; // Categoria
      colWidths[4] = { wch: 18 }; // Qtd Nec
      colWidths[5] = { wch: 18 }; // Qtd Atu
      colWidths[6] = { wch: 18 }; // Qtd Fal
    }
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, 'Relatório');
    XLSX.writeFile(wb, `relatorio-ferramentas-${new Date().getTime()}.xlsx`);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col h-[calc(100vh-2rem)]"
    >
      <div className="p-6 border-b border-slate-200/50 dark:border-slate-800/50 bg-white/30 dark:bg-slate-900/30 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2 tracking-tight">
            <FileText className="w-6 h-6 text-cyan-400" />
            Relatório por Linha
          </h1>
          <p className="text-slate-400 dark:text-slate-500 dark:text-slate-400 text-sm mt-1">
            Visão geral das quantidades de ferramentas atribuídas por departamento/linha.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
          <div className="flex items-center gap-6 bg-slate-100/50 dark:bg-slate-800/50 px-5 py-2.5 rounded-xl border border-slate-300/50 dark:border-slate-700/50 shadow-inner flex-1 lg:flex-none justify-center">
            {(selectedToolType === 'all' || selectedToolType === 'individual') && (
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Individuais</span>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5" title="Atuais">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]"></div>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">{summaryData.individual.current}</span>
                  </div>
                  <div className="flex items-center gap-1.5" title="Faltantes">
                    <div className="w-2 h-2 rounded-full bg-red-400 shadow-[0_0_10px_rgba(248,113,113,0.5)]"></div>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">{summaryData.individual.missing}</span>
                  </div>
                </div>
              </div>
            )}
            
            {(selectedToolType === 'all' || selectedToolType === 'collective') && (
              <>
                {selectedToolType === 'all' && <div className="w-px h-8 bg-slate-700/50"></div>}
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Coletivas</span>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5" title="Atuais">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]"></div>
                      <span className="text-sm font-bold text-slate-900 dark:text-white">{summaryData.collective.current}</span>
                    </div>
                    <div className="flex items-center gap-1.5" title="Faltantes">
                      <div className="w-2 h-2 rounded-full bg-red-400 shadow-[0_0_10px_rgba(248,113,113,0.5)]"></div>
                      <span className="text-sm font-bold text-slate-900 dark:text-white">{summaryData.collective.missing}</span>
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="w-px h-8 bg-slate-700/50"></div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Total Faltante</span>
              <span className="text-sm font-bold text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.5)]">{summaryData.total.missing}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full lg:w-auto">
            <button
              onClick={handleExportExcel}
              className="px-4 py-2.5 h-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-slate-900 dark:text-white rounded-xl flex items-center justify-center gap-2 transition-all font-medium shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] flex-1 lg:flex-none"
            >
              <Download className="w-4 h-4" /> Excel
            </button>
            <button
              onClick={handleExportPDF}
              className="px-4 py-2.5 h-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-slate-900 dark:text-white rounded-xl flex items-center justify-center gap-2 transition-all font-medium shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:shadow-[0_0_25px_rgba(6,182,212,0.5)] flex-1 lg:flex-none"
            >
              <Download className="w-4 h-4" /> PDF
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 border-b border-slate-200/50 dark:border-slate-800/50 bg-white/30 dark:bg-slate-900/30 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 group">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
          <input
            type="text"
            placeholder="Buscar linha/departamento..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none text-slate-800 dark:text-slate-200 placeholder-slate-600 transition-all"
          />
        </div>

        <div className="relative flex-1 group" ref={toolListRef}>
          <Package className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within:text-amber-400 transition-colors" />
          <input
            type="text"
            placeholder="Filtrar por ferramenta específica..."
            value={toolSearchValue}
            autoComplete="off"
            onFocus={() => setIsToolSearchOpen(true)}
            onChange={(e) => {
              setToolSearchValue(e.target.value);
              setIsToolSearchOpen(true);
              if (specificToolId) setSpecificToolId('');
            }}
            className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none text-slate-800 dark:text-slate-200 placeholder-slate-600 transition-all"
          />
          {toolSearchValue && (
            <button 
              onClick={() => { setToolSearchValue(''); setSpecificToolId(''); setIsToolSearchOpen(false); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <AnimatePresence>
            {isToolSearchOpen && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl z-50 max-h-64 overflow-y-auto custom-scrollbar"
              >
                {tools
                  .filter(t => t.name.toLowerCase().includes(toolSearchValue.toLowerCase()) || t.brand.toLowerCase().includes(toolSearchValue.toLowerCase()))
                  .sort((a,b) => a.name.localeCompare(b.name))
                  .map(tool => (
                    <button
                      key={tool.id}
                      onClick={() => {
                        setSpecificToolId(tool.id);
                        setToolSearchValue(tool.name);
                        setIsToolSearchOpen(false);
                      }}
                      className="w-full text-left p-3 hover:bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800 last:border-0 flex flex-col"
                    >
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{tool.name}</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-mono">{tool.brand}</span>
                    </button>
                  ))
                }
                {tools.filter(t => t.name.toLowerCase().includes(toolSearchValue.toLowerCase()) || t.brand.toLowerCase().includes(toolSearchValue.toLowerCase())).length === 0 && (
                  <div className="p-4 text-center text-slate-400 dark:text-slate-500 text-sm italic">Nenhuma ferramenta encontrada</div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-slate-400 dark:text-slate-500" />
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none text-slate-800 dark:text-slate-200 min-w-[150px] transition-all appearance-none"
          >
            <option value="all">Todas as Linhas</option>
            {dropdownEntities.map(dept => (
              <option key={dept.id} value={dept.id}>{dept.name}</option>
            ))}
          </select>
          <select
            value={selectedToolType}
            onChange={(e) => {
              const newType = e.target.value as any;
              setSelectedToolType(newType);
              
              // If current department is not in the new filtered list, reset to 'all'
              if (selectedDepartment !== 'all') {
                const isStillValid = allReportEntities.filter(entity => {
                  if (newType === 'all') return true;
                  if (newType === 'individual') {
                    const data = reportData[entity.id];
                    return data && (Object.keys(data.individual).length > 0 || Object.keys(data.requiredIndividual).length > 0);
                  }
                  if (newType === 'collective') {
                    return (collectiveStations || []).some(s => s.line === entity.name);
                  }
                  return true;
                }).some(e => e.id === selectedDepartment);
                
                if (!isStillValid) {
                  setSelectedDepartment('all');
                }
              }
            }}
            className="p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none text-slate-800 dark:text-slate-200 min-w-[150px] transition-all appearance-none"
          >
            <option value="all">Todos os Tipos</option>
            <option value="individual">Individuais</option>
            <option value="collective">Coletivas</option>
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 bg-slate-50/30 dark:bg-slate-950/30 custom-scrollbar">
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-8 max-w-6xl mx-auto"
        >
          {specificToolId && globalToolStats[specificToolId] && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-slate-900 border border-amber-500/30 rounded-2xl p-6 shadow-2xl relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Package className="w-24 h-24 text-amber-500" />
              </div>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
                <div>
                  <h3 className="text-amber-400 text-xs font-bold uppercase tracking-widest mb-1">Resumo Global da Ferramenta</h3>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                    {tools.find(t => t.id === specificToolId)?.name}
                  </h2>
                  <p className="text-slate-400 dark:text-slate-500 dark:text-slate-400 text-sm font-mono mt-1 uppercase">
                    {tools.find(t => t.id === specificToolId)?.brand} | {tools.find(t => t.id === specificToolId)?.category}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-8 md:gap-12 w-full md:w-auto">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Necessário</span>
                    <span className="text-2xl font-black text-slate-900 dark:text-white">{globalToolStats[specificToolId].required}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Em Estoque</span>
                    <span className={`text-2xl font-black ${globalToolStats[specificToolId].current < globalToolStats[specificToolId].required ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {globalToolStats[specificToolId].current}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Faltante</span>
                    <span className={`text-2xl font-black ${globalToolStats[specificToolId].missing > 0 ? 'text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'text-cyan-400'}`}>
                      {globalToolStats[specificToolId].missing}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {filteredDepartments.map(dept => {
            const deptData = reportData[dept.id];
            let toolIds = Object.keys(deptData?.total || {}).filter(toolId => {
              // If specific tool is selected, prioritize it
              if (specificToolId && toolId === specificToolId) return true;

              const hasIndividual = (deptData.individual[toolId] || 0) > 0 || (deptData.requiredIndividual[toolId] !== undefined);
              const hasCollective = (deptData.collective[toolId] || 0) > 0 || (deptData.requiredCollective[toolId] !== undefined) || (deptData.stations[toolId] && deptData.stations[toolId].length > 0);
              
              if (selectedToolType === 'individual') return hasIndividual;
              if (selectedToolType === 'collective') return hasCollective;
              return hasIndividual || hasCollective;
            });

            // If specific tool is selected, filter only that one
            if (specificToolId) {
              toolIds = toolIds.filter(id => id === specificToolId);
              
              // Fallback: if tool is required but wasn't in total or was filtered out
              if (toolIds.length === 0) {
                const isRequired = (deptData.requiredIndividual && deptData.requiredIndividual[specificToolId] !== undefined) ||
                                   (deptData.requiredCollective && deptData.requiredCollective[specificToolId] !== undefined);
                if (isRequired) toolIds = [specificToolId];
              }
            }
            
            if (toolIds.length === 0) return null;

            return (
              <motion.div 
                variants={itemVariants}
                key={dept.id} 
                className="bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-lg backdrop-blur-sm"
              >
                <div className="bg-slate-100/50 dark:bg-slate-800/50 px-6 py-4 border-b border-slate-300/50 dark:border-slate-700/50 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">{dept.name}</h2>
                    {(() => {
                      const originalDept = departments.find(d => d.id === dept.id);
                      if (originalDept && originalDept.expectedNewcomers && originalDept.expectedNewcomers > 0) {
                        return (
                          <span className="text-xs font-medium bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-500/20">
                            +{originalDept.expectedNewcomers} novatos previstos
                          </span>
                        );
                      }
                      return null;
                    })()}
                  </div>
                  <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-semibold px-3 py-1 rounded-full">
                    {toolIds.length} tipos de ferramentas
                  </span>
                </div>
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 dark:text-slate-400 text-sm">
                        <th className="p-4 font-semibold">Ferramenta</th>
                        {selectedToolType === 'collective' && <th className="p-4 font-semibold">Posto</th>}
                        <th className="p-4 font-semibold">Marca</th>
                        <th className="p-4 font-semibold text-center">
                          <div className="flex flex-col items-center">
                            <span className="text-slate-400 dark:text-slate-500 dark:text-slate-400">Nec.</span>
                          </div>
                        </th>
                        <th className="p-4 font-semibold text-center">
                          <div className="flex flex-col items-center">
                            <span className="text-slate-400 dark:text-slate-500 dark:text-slate-400">Atu.</span>
                          </div>
                        </th>
                        <th className="p-4 font-semibold text-center bg-cyan-950/30">
                          <div className="flex flex-col items-center">
                            <span className="text-cyan-400">Fal.</span>
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {(() => {
                        const rows: any[] = [];
                        toolIds.forEach(toolId => {
                          const tool = tools.find(t => t.id === toolId);
                          const individualQty = deptData.individual[toolId] || 0;
                          const collectiveQty = deptData.collective[toolId] || 0;
                          const stockIndQty = deptData.stockIndividual[toolId] || 0;
                          const stockColQty = deptData.stockCollective[toolId] || 0;
                          const stockStationData = deptData.stockStation[toolId] || {};
                          const requiredCollectiveQty = deptData.requiredCollective[toolId] || 0;
                          const requiredIndividualQty = deptData.requiredIndividual[toolId] || 0;
                          const stations = deptData.stationDetails?.[toolId] || [];

                          if (selectedToolType === 'collective' && stations.length > 0) {
                            let remainingStock = stockColQty;
                            
                            stations.forEach(s => {
                              let currentForStation = s.current + (stockStationData[s.name] || 0);
                              let missingForStation = Math.max(0, s.required - currentForStation);
                              
                              if (remainingStock > 0 && missingForStation > 0) {
                                const allocated = Math.min(remainingStock, missingForStation);
                                currentForStation += allocated;
                                missingForStation -= allocated;
                                remainingStock -= allocated;
                              }

                              rows.push({
                                id: `${toolId}-${s.name}`,
                                tool,
                                station: { ...s, current: currentForStation, missing: missingForStation },
                                reqQty: s.required,
                                curQty: currentForStation,
                                missingQty: missingForStation,
                                isExpanded: true
                              });
                            });
                          } else {
                            const reqQty = selectedToolType === 'all' 
                              ? (requiredIndividualQty + requiredCollectiveQty)
                              : (selectedToolType === 'individual' ? requiredIndividualQty : requiredCollectiveQty);

                            const curQty = selectedToolType === 'all'
                              ? (individualQty + stockIndQty + collectiveQty + stockColQty + Object.values(stockStationData).reduce((a,b)=>a+b,0))
                              : (selectedToolType === 'individual' ? individualQty + stockIndQty : collectiveQty + stockColQty + Object.values(stockStationData).reduce((a,b)=>a+b,0));

                            const missingQty = Math.max(0, reqQty - curQty);
                            
                            rows.push({
                              id: toolId,
                              tool,
                              station: null,
                              stationsList: stations,
                              reqQty,
                              curQty,
                              missingQty,
                              isExpanded: false
                            });
                          }
                        });

                        if (selectedToolType === 'collective') {
                          rows.sort((a, b) => {
                            const postoA = a.station?.name || '';
                            const postoB = b.station?.name || '';
                            const cmp = postoA.localeCompare(postoB);
                            if (cmp !== 0) return cmp;
                            return (a.tool?.name || '').localeCompare(b.tool?.name || '');
                          });
                        } else if (selectedToolType === 'all') {
                          rows.sort((a, b) => {
                            const postoA = a.stationsList?.[0]?.name || '';
                            const postoB = b.stationsList?.[0]?.name || '';
                            const cmp = postoA.localeCompare(postoB);
                            if (cmp !== 0) return cmp;
                            return (a.tool?.name || '').localeCompare(b.tool?.name || '');
                          });
                        }

                        return rows.map(row => (
                          <motion.tr 
                            whileHover={{ backgroundColor: 'rgba(30, 41, 59, 0.5)' }}
                            key={row.id} 
                            className="transition-colors"
                          >
                            <td className="p-4">
                              <p className="text-slate-800 dark:text-slate-200 font-medium">{row.tool?.name || 'Ferramenta Desconhecida'}</p>
                              <div className="flex flex-col gap-1 mt-1">
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono">{row.tool?.category}</p>
                                {!row.isExpanded && (selectedToolType === 'all' || selectedToolType === 'collective') && row.stationsList?.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 mt-2">
                                    {row.stationsList.map((detail: any, idx: number) => (
                                      <span key={idx} className={`text-[10px] px-2 py-0.5 rounded-md border ${detail.missing > 0 ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                                        Posto: {detail.name} {detail.missing > 0 && `(Falta ${detail.missing})`}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </td>
                            {selectedToolType === 'collective' && (
                              <td className="p-4">
                                <span className="px-2.5 py-1 bg-slate-100/50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider">
                                  {row.station?.name || '-'}
                                </span>
                              </td>
                            )}
                            <td className="p-4 text-slate-400 dark:text-slate-500 dark:text-slate-400">{row.tool?.brand || '-'}</td>
                            <td className="p-4 text-center">
                              <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                                {row.reqQty}
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              <span className={`text-sm font-medium ${row.curQty < row.reqQty ? 'text-amber-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                {row.curQty}
                              </span>
                            </td>
                            <td className="p-4 text-center bg-cyan-950/20">
                              <span className={`inline-flex items-center justify-center min-w-[2rem] h-8 rounded-full font-bold text-sm px-2 border ${row.missingQty > 0 ? 'bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_10px_rgba(248,113,113,0.2)]' : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'}`}>
                                {row.missingQty}
                              </span>
                            </td>
                          </motion.tr>
                        ));
                      })()}
                    </tbody>

                  </table>
                </div>
              </motion.div>
            );
          })}
          
          {filteredDepartments.every(dept => Object.keys(reportData[dept.id]?.total || {}).length === 0) && (
            <motion.div 
              variants={itemVariants}
              className="text-center py-16 bg-white/50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 backdrop-blur-sm"
            >
              <FileText className="w-16 h-16 text-slate-700 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-slate-700 dark:text-slate-300 mb-2">Nenhum dado encontrado</h3>
              <p className="text-slate-400 dark:text-slate-500">Não há ferramentas atribuídas para as linhas selecionadas.</p>
            </motion.div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
