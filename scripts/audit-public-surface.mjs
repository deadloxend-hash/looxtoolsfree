import fs from 'node:fs';
import assert from 'node:assert/strict';
const config=fs.readFileSync(new URL('../_config.yml',import.meta.url),'utf8');
const excluded=new Set([...config.matchAll(/^  - (.+)$/gm)].map(m=>m[1].replace(/^"|"$/g,'')));
for(const name of ['docs','database','scripts','tests','node_modules','dist','site-audit-results.json','PLATFORM.md','AI-UPDATE-REPORT.md','.env','**/*.map','**/*.sql','**/*.log','**/*.looxbackup'])assert.ok(excluded.has(name),'Publishing policy must exclude '+name);
assert.equal(fs.existsSync(new URL('../.nojekyll',import.meta.url)),false,'Native Pages must apply the Jekyll exclusion policy');
for(const name of ['platform','vendor','tools','content','assets','learn'])assert.equal(excluded.has(name),false,'Required runtime directory excluded: '+name);
console.log('Public deployment policy excludes engineering files and preserves runtime assets.');
