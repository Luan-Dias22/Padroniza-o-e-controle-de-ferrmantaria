import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function sortByName(a: string, b: string) {
  const getWeight = (name: string) => {
    if (!name || typeof name !== 'string') return 999;
    const n = name.toLowerCase().trim();
    
    // Teste / Inspeção
    if (n.includes('teste') || n.includes('inspeção') || n.includes('inspecao')) {
      if (n.includes('elétrica bt') || n.includes('eletrica bt')) return 110;
      if (n.includes('elétrica mt') || n.includes('eletrica mt')) return 111;
      if (n.includes('mecânica') || n.includes('mecanica')) return 112;
      if (n.includes('final')) return 113;
      return 119;
    }

    // Fábrica de Cabos
    if (n.includes('cabos')) return 120;

    // Linha 10
    if (n.includes('linha 10')) {
      if (n.includes('cabeamento')) return 101;
      if (n.includes('montagem')) return 102;
      return 109;
    }

    // Linha 9
    if (n.includes('linha 9')) return 90;
    
    // Linha 6
    if (n.includes('linha 6')) return 60;
    
    // Linha 4
    if (n.includes('linha 4')) return 40;
    
    // Linha 3
    if (n.includes('linha 3')) return 30;
    
    // Linha 2
    if (n.includes('linha 2')) return 20;

    // Linha 1 (or specific Linha 1 sub-areas that might not have "Linha 1" in the name)
    if (n.includes('nova bancada principal') || n.includes('bancada principal nova')) return 11;
    if (n.includes('bancada principal')) return 12; // Existente
    if (n.includes('bancada auxiliar')) return 13;
    if (n.includes('implantação de barra') || n.includes('implantacao de barra')) return 14;
    if (n === 'cabeamento' || n.includes('linha 1 (cabeamento)') || n.includes('linha 1 cabeamento')) return 15;
    if (n.includes('fine comb')) return 16;
    if (n.includes('linha 1')) return 19;

    // General fallback for any other Linha X
    const linhaMatch = n.match(/linha\s+(\d+)/);
    if (linhaMatch) {
      const num = parseInt(linhaMatch[1], 10);
      return num * 10;
    }
    
    return 999;
  };

  const weightA = getWeight(a);
  const weightB = getWeight(b);

  if (weightA !== weightB) return weightA - weightB;
  
  const strA = String(a || '');
  const strB = String(b || '');
  return strA.localeCompare(strB);
}
