const test = require('node:test');
const assert = require('node:assert/strict');
const {selectArchiveFiles, normaliseReference, resolveMetadata} = require('./slop-slip.js');
const {searchClause} = require('./slop-archive.js');

test('one rendition per recording without losing FLAC-only tracks', () => {
  const files = [
    {name:'01.flac', title:'First recording', track:'1'},
    {name:'01.mp3', original:'01.flac'},
    {name:'01.ogg', original:'01.flac'},
    {name:'02.flac', title:'Second recording', track:'2', private:'false'},
    {name:'secret.mp3', private:'true'},
    {name:'../../invalid.mp3'},
    {name:'album.zip'}
  ];
  const result = selectArchiveFiles(files);
  assert.deepEqual(result.map(f => f.name), ['01.mp3','02.flac']);
  assert.equal(result[0].title, 'First recording');
  assert.deepEqual(selectArchiveFiles(files, ext => ext === 'flac').map(f => f.name), ['01.flac','02.flac']);
});

test('same titles do not collapse distinct recordings', () => {
  assert.equal(selectArchiveFiles([{name:'take1.mp3',title:'Song'},{name:'take2.mp3',title:'Song'}]).length,2);
});

test('expanded formats retain Slip validation and private-file protection', () => {
  for (const extension of ['mp3','ogg','m4a','flac','wav','opus']) {
    const ref = {release:'example',file:'track.' + extension};
    assert.ok(normaliseReference(ref));
    assert.equal(resolveMetadata(ref,{files:[{name:ref.file}]}).track.file,ref.file);
    assert.throws(() => resolveMetadata(ref,{files:[{name:ref.file,private:true}]}));
  }
  assert.equal(normaliseReference({release:'example',file:'../track.flac'}),null);
});

test('name searches keep phrases together and exclude incidental description matches', () => {
  for (const name of ['a kind of likeness','Grateful Dead','Björk']) {
    assert.equal(searchClause(name,'artist'),'creator:"' + name + '"');
    assert.ok(!searchClause(name,'all').includes('description:'));
  }
  assert.equal(searchClause('Dark Star','release'),'title:"Dark Star"');
  assert.equal(searchClause('field recordings','tags'),'subject:"field recordings"');
  assert.ok(!searchClause('name" OR mediatype:movies','artist').includes('" OR'));
});
