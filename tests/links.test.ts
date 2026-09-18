import assert from 'node:assert/strict';
import {objectSchema,makeObject,safeLink} from '../lib/objects';
for(const href of ['https://note.com/kazu_t','http://example.com/','mailto:test@example.com'])assert(safeLink(href));
for(const href of ['javascript:alert(1)','data:text/html,test','file:///etc/passwd','https://name:secret@example.com','https://example.com/\n'])assert(!safeLink(href),href);
const old=makeObject('text');assert.equal(old.href,undefined);
assert.equal(objectSchema.parse({...old,href:'https://note.com/kazu_t'}).href,'https://note.com/kazu_t');
assert.throws(()=>objectSchema.parse({...old,href:'javascript:alert(1)'}));
console.log('Text links: allowed protocols, unsafe URLs rejected, legacy compatibility PASS');
