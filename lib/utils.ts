import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function sortByName(a: string, b: string) {
  const getWeight = (name: string) => {
    const n = name.toLowerCase().trim();
    
    // Specific Linha 1 sub-areas
    if (n.includes('nova bancada principal') || n.includes('bancada principal nova')) return 11;
    if (n.includes('bancada principal')) return 10;
    if (n.includes('bancada auxiliar')) return 12;
    if (n.includes('implantação de barra') || n.includes('implantacao de barra')) return 13;
    if (n.includes('cabeamento')) return 14;
    if (n.includes('fine comb')) return 15;
    
    // Other Linha 1 items not caught above
    if (n.includes('linha 1 ') || n === 'linha 1') return 19;

    // Specific Quality areas
    if (n.includes('elétrica bt') || n.includes('eletrica bt')) return 110;
    if (n.includes('elétrica mt') || n.includes('eletrica mt')) return 111;
    if (n.includes('elétrica') || n.includes('eletrica')) return 111.5; // fallback
    if (n.includes('mecânica') || n.includes('mecanica')) return 112;
    if (n.includes('final')) return 113;
    if (n.includes('cabos')) return 114;

    // General Linha X (2, 3, 4, 6, 9, 10, etc.)
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
  return a.localeCompare(b);
}
