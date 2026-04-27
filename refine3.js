const fs = require('fs');
const path = require('path');

const pagePath = path.join(process.cwd(), 'app', 'page.tsx');
let content = fs.readFileSync(pagePath, 'utf8');

// Fix typo
content = content.replace(/border-white\/105/g, 'border-white/5');

// Sidebar and layout styling
content = content.replace(/bg-zinc-900\/30 border-r border-white\/5/g, 'bg-[#0a0a0a] border-r border-white/5'); // previous script might have hit it
content = content.replace(/bg-zinc-900/g, 'bg-[#0a0a0a]'); 
content = content.replace(/bg-slate-900/g, 'bg-[#0a0a0a]'); 
content = content.replace(/border-slate-800/g, 'border-white/5');
content = content.replace(/bg-cyan-600\/20/g, 'bg-zinc-800 border border-white/5');
content = content.replace(/shadow-\[0_0_[\d]+px_rgba[^\]]*\]/g, 'shadow-sm');
content = content.replace(/shadow-2xl/g, 'shadow-sm');

// Minimal typography spacing in main return
content = content.replace(/text-slate-200/g, 'text-zinc-200');
content = content.replace(/text-slate-300/g, 'text-zinc-300');
content = content.replace(/text-slate-400/g, 'text-zinc-500');
// let's leave cyan alone in the layout, except for some minimal aspects

fs.writeFileSync(pagePath, content, 'utf8');
