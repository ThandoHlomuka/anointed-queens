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

  /* The suites drive demo behaviour through localStorage (aq_session with
     demo:true, seeded catalog, simulated escrow). config.js now carries the
     real Supabase publishable key for production, so blank the two vars in
     the BUILT copy only. Without this AQ.DEMO flips to false and every
     demo assertion would hit Postgres instead of localStorage. */
  const cfgPath = path.join(OUT, 'config.js');
  let cfg = fs.readFileSync(cfgPath, 'utf8');
  const before = cfg;
  cfg = cfg
    .replace(/var SUPABASE_URL = (?:'[^']*'|"[^"]*");/, "var SUPABASE_URL = '';")
    .replace(/var SUPABASE_ANON_KEY = (?:'[^']*'|"[^"]*");/, "var SUPABASE_ANON_KEY = '';");
  if (cfg === before) {
    throw new Error('build_site: could not find the Supabase key assignments in config.js; '
      + 'harness would silently run against live Supabase instead of demo mode');
  }
  fs.writeFileSync(cfgPath, '/* harness build: Supabase keys blanked, DEMO MODE forced */\n' + cfg);
  if (!/var SUPABASE_URL = '';/.test(cfg) || !/var SUPABASE_ANON_KEY = '';/.test(cfg)) {
    throw new Error('build_site: failed to blank Supabase keys in the built config.js');
  }

  console.log('Built harness site with: ' + files.filter((f) => f.endsWith('.html')).join(', '));
  console.log('config.js: Supabase keys blanked -> harness runs in DEMO mode');
}

main();