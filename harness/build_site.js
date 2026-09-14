/* Harness builder: copies the repo into harness/site for serving + testing. */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(__dirname, 'site');

function copyDir(src, rel) {
  if (!fs.existsSync(src)) return;
  const outDir = path.join(OUT, rel);
  fs.mkdirSync(outDir, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    const s = path.join(src, name);
    const d = path.join(outDir, name);
    const st = fs.statSync(s);
    if (st.isDirectory()) copyDir(s, path.join(rel, name));
    else fs.copyFileSync(s, d);
  }
}

function main() {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  const files = fs.readdirSync(ROOT).filter((f) => /\.(html|js|css|json|ps1)$/.test(f) || f === 'sw.js' || f === 'robots.txt' || f === 'sitemap.xml' || f === 'manifest.webmanifest');
  for (const f of files) {
    if (f === 'version.json' || f === 'package.json' || f === 'package-lock.json') continue;
    if (f.startsWith('make-') || f === 'db.upgrade') continue;
    fs.copyFileSync(path.join(ROOT, f), path.join(OUT, f));
  }
  copyDir(path.join(ROOT, 'assets'), 'assets');
  console.log('Built harness site with: ' + files.filter((f) => f.endsWith('.html')).join(', '));
}

main();