export type Tool = { id: string, brand: string, name: string, category: string, description: string, price?: number, uid?: string };
export type StandardToolList = { id: string, name: string, tools: { toolId: string, quantity: number }[], isLocked?: boolean, uid?: string };
export type Department = { id: string, name: string, standardListId?: string, expectedNewcomers?: number, requiredHeadcount?: number, uid?: string };
export type Employee = { id: string, employeeId: string, name: string, departmentId: string, uid?: string };
export type Assignment = { id: string, employeeId: string, departmentId: string, assignedTools: { toolId: string, quantity: number }[], dateAssigned: string, maleta_id?: string, uid?: string };

export type Maleta = {
  id: string;
  codigo_tag: string;
  nome: string;
  setor: string;
  status: 'Ativa' | 'Inativa' | 'Manutenção';
  responsavel_id?: string;
  observacoes?: string;
  transfer_history?: {
    from_employee_id: string | null;
    to_employee_id: string | null;
    date: string;
  }[];
  created_at: string;
  updated_at: string;
  uid?: string;
};

export type MaletaTool = {
  id: string;
  maleta_id: string;
  ferramenta_id: string;
  quantidade: number;
  estado: 'Boa' | 'Danificada' | 'Faltando';
  tag?: string;
  uid?: string;
};

export type MaletaCheckItem = {
  toolId: string;
  expectedQuantity: number;
  observedQuantity: number;
  status: 'OK' | 'Faltando' | 'Danificada';
  notes?: string;
};

export type MaletaCheck = {
  id: string;
  maleta_id: string;
  checked_by_id: string;
  user_name: string;
  date: string;
  items: MaletaCheckItem[];
  observacoes?: string;
  uid?: string;
};

export type MaletaEvent = {
  id: string;
  maleta_id: string;
  type: 'creation' | 'edition' | 'transfer' | 'tool_addition' | 'tool_removal' | 'check';
  date: string;
  user_name: string;
  user_id: string;
  description: string;
  uid?: string;
};

export type CollectiveStation = {
  id: string;
  name: string;
  line: string;
  tools: { toolId?: string; name: string; category: string; quantity: number; requiredQuantity?: number }[];
  uid?: string;
};

export type CollectiveLine = {
  id: string;
  name: string;
  uid?: string;
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
  uid?: string;
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
  { id: 'a1', employeeId: 'e1', departmentId: 'd1', assignedTools: [{ toolId: 't1', quantity: 1 }, { toolId: 't2', quantity: 1 }, { toolId: 't3', quantity: 1 }], dateAssigned: new Date().toISOString(), maleta_id: 'm1' },
];

export const mockMaletas: Maleta[] = [
  { id: 'm1', codigo_tag: 'MAL-001', nome: 'Maleta Alpha 01', setor: 'Montagem', status: 'Ativa', responsavel_id: 'e1', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'm2', codigo_tag: 'MAL-002', nome: 'Maleta Alpha 02', setor: 'Controle de Qualidade', status: 'Ativa', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

export const mockMaletaTools: MaletaTool[] = [
  { id: 'mt1', maleta_id: 'm1', ferramenta_id: 't1', quantidade: 1, estado: 'Boa' },
  { id: 'mt2', maleta_id: 'm1', ferramenta_id: 't2', quantidade: 1, estado: 'Boa' },
];
