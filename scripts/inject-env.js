const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, 'gift', 'new-year-2026.html');
const outputPath = path.join(__dirname, 'gift', 'new-year-2026.html');

let html = fs.readFileSync(htmlPath, 'utf8');

html = html.replace(/__SUPABASE_URL__/g, process.env.SUPABASE_URL || '');
html = html.replace(/__SUPABASE_ANON_KEY__/g, process.env.SUPABASE_ANON_KEY || '');

fs.writeFileSync(outputPath, html, 'utf8');

console.log('Supabase 环境变量已注入到 HTML 文件');
