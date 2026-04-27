const fs = require('fs');
const path = require('path');

const componentsDir = path.join(process.cwd(), 'components');
const appDir = path.join(process.cwd(), 'app');

function refineFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace backgrounds and borders for generic cards
  content = content.replace(/bg-slate-900\/50 backdrop-blur-md rounded-2xl/g, 'bg-[#0a0a0a] rounded-xl');
  content = content.replace(/bg-slate-900\/50 backdrop-blur-md rounded-xl/g, 'bg-[#0a0a0a] rounded-xl');
  content = content.replace(/bg-slate-900\/50 backdrop-blur-md/g, 'bg-[#0a0a0a]');
  
  // Neutralize common slate into zinc for a purer monochrome feel
  content = content.replace(/bg-slate-950\/50/g, 'bg-zinc-900\/30');
  content = content.replace(/bg-slate-950/g, 'bg-transparent');
  content = content.replace(/bg-slate-[89]00/g, 'bg-zinc-900');
  content = content.replace(/border-slate-[78]00/g, 'border-white\/5');
  content = content.replace(/text-slate-400/g, 'text-zinc-400');
  content = content.replace(/text-slate-300/g, 'text-zinc-300');
  content = content.replace(/text-slate-200/g, 'text-zinc-200');
  content = content.replace(/text-slate-500/g, 'text-zinc-500');
  
  // Simplify loud shadows
  content = content.replace(/shadow-\[0_0_15px_rgba[^\]]*\]/g, 'shadow-sm');
  content = content.replace(/shadow-\[0_0_25px_rgba[^\]]*\]/g, 'shadow-md');
  
  // Remove colored blurs in Dashboards that make it look muddy
  content = content.replace(/<div className="absolute top-0 right-0 w-\d+ h-\d+ bg-[a-z]+-500\/\d+ rounded-full blur-\[.*?\] -z-10" \/>/g, '');
  content = content.replace(/<div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-transparent to-white opacity-5 rounded-full blur-3xl -mr-10 -mt-10 group-hover:opacity-10 transition-opacity`} \/>/g, '');

  fs.writeFileSync(filePath, content, 'utf8');
}

[componentsDir, appDir].forEach(dir => {
  if (fs.existsSync(dir)) {
    fs.readdirSync(dir).forEach(file => {
      const ext = path.extname(file);
      if (ext === '.tsx' || ext === '.ts') {
        refineFile(path.join(dir, file));
      }
    });
  }
});

console.log("Refinement complete.");
