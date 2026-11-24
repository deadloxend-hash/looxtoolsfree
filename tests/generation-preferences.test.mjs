import test from 'node:test';
import assert from 'node:assert/strict';
import {applyGenerationPreferences} from '../platform/generation-preferences.js';
const control=options=>({value:'old',options:options.map(([value,disabled=false,hidden=false])=>({value,disabled,hidden})),dispatchEvent(){this.changed=true;}});
test('generation defaults respect disabled and hidden model capabilities',()=>{
 const model=control([['flux'],['unavailable',true]]),ratio=control([['1:1'],['9:16',false,true]]),duration=control([['5'],['10',true]]);
 applyGenerationPreferences('video',{model,ratio,duration},{videoModel:'unavailable',videoRatio:'9:16',videoDuration:'10'});
 assert.equal(model.value,'old');assert.equal(ratio.value,'old');assert.equal(duration.value,'old');
 applyGenerationPreferences('video',{model,ratio,duration},{videoModel:'flux',videoRatio:'1:1',videoDuration:5});
 assert.equal(model.value,'flux');assert.equal(ratio.value,'1:1');assert.equal(duration.value,'5');
});
