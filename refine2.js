const fs = require('fs');
const path = require('path');

const dirs = [path.join(process.cwd(), 'components'), path.join(process.cwd(), 'app')];

function updateHeadings(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Add font-sans and tracking-tight to h1, h2, h3 and similar titles
  content = content.replace(/className="text-3xl font-bold/g, 'className="text-3xl font-bold font-sans tracking-tight');
  content = content.replace(/className="text-2xl font-bold/g, 'className="text-2xl font-bold font-sans tracking-tight');
  content = content.replace(/className="text-lg font-semibold/g, 'className="text-lg font-semibold font-sans tracking-tight');
  content = content.replace(/className="text-xl font-bold/g, 'className="text-xl font-bold font-sans tracking-tight');
  
  // Update main stats texts directly
  content = content.replace(/<h3 className={`text-4xl font-bold/g, '<h3 className={`text-5xl font-light font-sans tracking-tight font-mono');
  
  // Make borders even more minimal
  content = content.replace(/border border-white\/5 rounded-2xl/g, 'border border-white/5 rounded-xl');
  content = content.replace(/border border-white\//g, 'border border-white/10');
  
  fs.writeFileSync(filePath, content, 'utf8');
}

dirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    fs.readdirSync(dir).forEach(file => {
      const ext = path.extname(file);
      if (ext === '.tsx') {
        updateHeadings(path.join(dir, file));
      }
    });
  }
});
