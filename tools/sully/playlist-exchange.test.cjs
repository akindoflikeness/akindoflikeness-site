'use strict';
const assert=require('node:assert/strict');
const {test}=require('node:test');
const P=require('./playlist-exchange.js');
const track={id:'archive-item',file:'Set One/track&one.flac',title:'A & B <Live>',artist:'The "Band"',release:'A release',tags:['folk','folk']};
test('Sully playlist JSON preserves metadata and repeated positions',()=>{
 const data=P.parseJson(P.exportJson({title:'Two copies',tracks:[track,track]}));
 assert.equal(data.title,'Two copies');assert.equal(data.tracks.length,2);assert.deepEqual(data.tracks[0],track);assert.deepEqual(data.tracks[1],track);
});
test('XSPF export is escaped and includes playable Archive references and Sully tags',()=>{
 const xml=P.exportXspf({title:'Set & list',tracks:[track,track]});
 assert.match(xml,/<playlist version="1"/);assert.match(xml,/track%26one\.flac/);assert.match(xml,/A &amp; B &lt;Live&gt;/);assert.match(xml,/sully:tag>folk/);assert.equal((xml.match(/<track>/g)||[]).length,2);
});
test('playlist JSON rejects invalid audio references and oversized lists',()=>{
 assert.throws(()=>P.exportJson({title:'bad',tracks:[{...track,file:'../bad.mp3'}]}),/Invalid audio reference|Invalid Archive/);
 assert.throws(()=>P.playlist({title:'bad',tracks:new Array(2001).fill(track)}),/2,000/);
});
