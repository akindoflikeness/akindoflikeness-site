const test=require('node:test'),assert=require('node:assert/strict'),P=require('./slop-personal.js');
const track={id:'example',file:'song.flac',title:'Unavailable song',artist:'Some Artist',release:'Album',tags:['ambient']};
test('complete backup round trip preserves repeats and explicit choices without network access',()=>{
 const personal={playlists:[{id:'list',title:'Sequence',tracks:[track,track]}],modes:[{id:'mode',title:'Quiet',query:'ambient',scope:'tags',diversify:false}],excludedCreators:['Some Artist'],diversify:false};
 const data={format:'slop-library',version:2,tracks:[track],personal};
 const result=P.backup(JSON.parse(JSON.stringify(data)));
 assert.equal(result.personal.playlists[0].tracks.length,2);assert.equal(result.personal.diversify,false);assert.deepEqual(result.tracks,[track]);assert.deepEqual(result.personal.excludedCreators,['some artist']);
});
test('old liked-track files remain readable; malformed references are rejected before writes',()=>{
 assert.deepEqual(P.backup({format:'slop-saved-tracks',version:1,tracks:[track]}).tracks,[track]);
 for(const file of ['../song.mp3','https://example.com/a.mp3','/song.mp3','song.exe'])assert.throws(()=>P.track({...track,file}));
 assert.throws(()=>P.backup({format:'slop-library',version:99}));
});
test('merge preserves local lists, keeps conflicts, unions exclusions and keeps existing policy',()=>{
 const a={...P.empty(),playlists:[{id:'p',title:'Mine',tracks:[track]}],excludedCreators:['first'],diversify:false};
 const b={...P.empty(),playlists:[{id:'p',title:'Other edit',tracks:[]}],excludedCreators:['second']};
 const merged=P.merge(a,b,()=> 'new-id');assert.equal(merged.playlists.length,2);assert.equal(merged.playlists[0].title,'Mine');assert.equal(merged.diversify,false);assert.deepEqual(merged.excludedCreators,['first','second']);assert.equal(P.merge(a,a,()=> 'unused').playlists.length,1);
});
test('hard exclusions apply to any creator credit and diversity does not invent candidates',()=>{
 const docs=[{identifier:'1',creator:'A'},{identifier:'2',creator:'A'},{identifier:'3',creator:['B','Excluded']},{identifier:'4',creator:'C'}];
 assert.deepEqual(P.rank(docs,{...P.empty(),excludedCreators:['excluded']}).map(d=>d.identifier),['1','4','2']);
 assert.deepEqual(P.rank(docs,{...P.empty(),diversify:false}).map(d=>d.identifier),['1','2','3','4']);
});
