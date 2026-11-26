/* No jobs, uploads, auth, provider or payment calls: validate dashboard targets and SEO. */
const fs=require('node:fs'),assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8'),catalog=JSON.parse(fs.readFileSync('platform/utilities-catalog.json','utf8')),root='https://deadloxend-hash.github.io/looxtoolsfree/';
const links=[...html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)].map(m=>m[1].replaceAll('&amp;','&'));let internal=0,anchors=0;
for(const href of new Set(links)){if(href.startsWith('http')){assert.ok(href.startsWith(root),href);continue}const [path,fragment]=href.split('#'),file=path||'index.html';assert.ok(fs.existsSync(file),href);internal++;if(fragment){assert.match(fs.readFileSync(file,'utf8'),new RegExp('id=["\']'+fragment+'["\']'));anchors++}}
const sitemap=fs.readFileSync('sitemap.xml','utf8'),locs=[...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1]);let indexable=0;
for(const url of locs){const file=url.slice(root.length)||'index.html';assert.ok(fs.existsSync(file),url);assert.ok(!/<meta[^>]+name=["']robots["'][^>]+content=["']noindex/i.test(fs.readFileSync(file,'utf8')),url+' is noindex but in sitemap')}
for(const t of catalog){const file=t.url.split('#')[0],source=fs.readFileSync(file,'utf8');if(t.status==='available'&&!/<meta[^>]+name=["']robots["'][^>]+content=["']noindex/i.test(source)){assert.ok(locs.includes(root+file),file+' missing sitemap');indexable++}}
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size,'duplicate element ids');assert.equal((html.match(/<h1\b/g)||[]).length,1);assert.ok(!html.includes('platform/dashboard.js'),'obsolete slideshow module');assert.ok(!/https?:\/\/[^" ]+\.woff/.test(html),'no remote font dependency');
console.log(JSON.stringify({catalog:catalog.length,uniqueInternalLinks:internal,fragmentTargets:anchors,sitemapUrls:locs.length,indexableToolTargets:indexable,allPassed:true},null,2));
