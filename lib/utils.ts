import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function sortByName(a: string, b: string) {
  const getWeight = (name: string) => {
    const n = name.toLowerCase().trim();
    
    // Check for "Linha X"
    const linhaMatch = n.match(/linha\s+(\d+)/);
    if (linhaMatch) {
      return parseInt(linhaMatch[1], 10);
    }

    // Specific keywords in order
    if (n.includes('elétrica') || n.includes('eletrica')) return 100;
    if (n.includes('mecânica') || n.includes('mecanica')) return 101;
    if (n.includes('final')) return 102;
    if (n.includes('cabos')) return 103;
    
    return 999;
  };

  const weightA = getWeight(a);
  const weightB = getWeight(b);

  if (weightA !== weightB) return weightA - weightB;
  return a.localeCompare(b);
}
