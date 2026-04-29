export type Tool = { id: string, brand: string, name: string, category: string, description: string, price?: number };
export type StandardToolList = { id: string, name: string, tools: { toolId: string, quantity: number }[], isLocked?: boolean };
export type Department = { id: string, name: string, standardListId?: string, expectedNewcomers?: number, requiredHeadcount?: number };
export type Employee = { id: string, employeeId: string, name: string, departmentId: string };
export type Assignment = { id: string, employeeId: string, departmentId: string, assignedTools: { toolId: string, itemTag: string }[], dateAssigned: string };

export type CollectiveStation = {
  id: string;
  name: string;
  line: string;
  tools: { toolId?: string; name: string; category: string; quantity: number; requiredQuantity?: number }[];
};

export type CollectiveLine = {
  id: string;
  name: string;
};

export type StockEntry = {
  id: string;
  toolId: string;
  lineId: string; // Can be department id or collective line id
  quantity: number;
  date: string;
  type?: 'individual' | 'collective';
  station?: string;
  employeeId?: string;
};

export type Case = {
  id: string;
  tag: string;
  name: string;
  sector: string;
  status: 'Ativa' | 'Inativa' | 'Manutenção';
  responsibleId: string;
  tools: { toolId: string, itemTag: string }[];
  notes?: string;
};

export type CaseInspection = {
  id: string;
  caseId: string;
  date: string;
  inspectorId: string;
  inspectorName?: string;
  items: { itemTag: string, toolId: string, status: 'OK' | 'Faltando' | 'Danificada' }[];
  notes?: string;
};

export type CaseLog = {
  id: string;
  caseId: string;
  date: string;
  type: string;
  description: string;
  details?: any;
};

export const mockTools: Tool[] = [
  { id: 't1', brand: 'Bosch', name: 'Furadeira Elétrica', category: 'ferramenta elétrica', description: 'Furadeira sem fio 20V' },
  { id: 't2', brand: 'Gedore', name: 'Chave de Torque', category: 'ferramenta manual', description: 'Encaixe de 1/2 polegada' },
  { id: 't3', brand: 'Mitutoyo', name: 'Paquímetro Digital', category: 'medição', description: '0-150mm' },
  { id: 't4', brand: 'Makita', name: 'Parafusadeira de Impacto', category: 'ferramenta elétrica', description: 'Parafusadeira de Impacto 18V' },
  { id: 't5', brand: '3M', name: 'Óculos de Segurança', category: 'segurança', description: 'Anti-embaçante' },
];

export const mockStandardLists: StandardToolList[] = [
  { id: 'k1', name: 'Kit Montagem Básica', tools: [{ toolId: 't1', quantity: 1 }, { toolId: 't2', quantity: 1 }, { toolId: 't3', quantity: 1 }] },
  { id: 'k2', name: 'Kit Chassi', tools: [{ toolId: 't2', quantity: 1 }, { toolId: 't4', quantity: 1 }, { toolId: 't5', quantity: 1 }] },
];

export const mockDepartments: Department[] = [
  { id: 'd1', name: 'Montagem', standardListId: 'k1' },
  { id: 'd2', name: 'Controle de Qualidade', standardListId: 'k2' },
  { id: 'd3', name: 'Manutenção' },
];

export const mockEmployees: Employee[] = [
  { id: 'e1', employeeId: 'EMP-101', name: 'Alice Smith', departmentId: 'd1' },
  { id: 'e2', employeeId: 'EMP-102', name: 'Bob Jones', departmentId: 'd2' },
];

export const mockAssignments: Assignment[] = [
  { id: 'a1', employeeId: 'e1', departmentId: 'd1', assignedTools: [{ toolId: 't1', itemTag: 'EMP-101-A' }, { toolId: 't2', itemTag: 'EMP-101-B' }, { toolId: 't3', itemTag: 'EMP-101-C' }], dateAssigned: new Date().toISOString() },
];
