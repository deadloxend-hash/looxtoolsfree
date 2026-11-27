import test from 'node:test';import assert from 'node:assert/strict';import {existsSync} from 'node:fs';
import {activeNavigation,navigationGroups,navigationFooter,workspaceIcon} from '../platform/workspace-navigation.js';
test('sidebar selects one exact destination, including Home versus Utilities and Creative Tools',()=>{
 for(const [path,label] of [['ai-image-landing.html','Home'],['ai-home.html','Home'],['index.html','Utilities'],['index.html#tools','Creative Tools'],['ai-chat.html?session=fixture','AI Assistant'],['ai-text-to-image.html?session=fixture#generate','AI Image'],['ai-video-generator.html#generate','AI Video'],['community.html?feed=saved','Community'],['creator.html','My Creations'],['account.html#usage','Recent Activity'],['settings.html#security','Settings']])assert.equal(activeNavigation('https://example.com/looxtoolsfree/'+path),label);
 assert.equal(activeNavigation('https://example.com/unrelated.html'),null);
});
test('every sidebar destination exists, labels are unique and icons are consistent inline SVG',()=>{
 const labels=new Set();for(const [kind,label,href,badge] of [...navigationGroups.flatMap(g=>g.items),...navigationFooter]){assert.ok(!labels.has(label));labels.add(label);assert.ok(existsSync(new URL('../'+href.split('#')[0],import.meta.url)),href);assert.match(workspaceIcon(kind),/^<svg/);assert.match(workspaceIcon(kind),/stroke-width="1.7"/);assert.equal(badge,label==='AI Video'?'Coming Soon':undefined);}
 assert.equal(labels.size,21);
});
