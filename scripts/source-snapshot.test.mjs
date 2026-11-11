import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { compareTrees } from './source-snapshot.mjs'
test('drift check rejects changed, missing and extra source while ignoring only declared build artifacts', () => {
 const temp = mkdtempSync(path.join(tmpdir(), 'snapshot-test-')), a = path.join(temp, 'a'), b = path.join(temp, 'b')
 mkdirSync(a); mkdirSync(b)
 try {
  writeFileSync(path.join(a, 'source.js'), 'original'); writeFileSync(path.join(b, 'source.js'), 'original')
  assert.equal(compareTrees(a,b),1)
  writeFileSync(path.join(b, 'source.js'), 'changed'); assert.throws(()=>compareTrees(a,b), /source.js/)
  rmSync(path.join(b, 'source.js')); assert.throws(()=>compareTrees(a,b), /source.js/)
  writeFileSync(path.join(b, 'source.js'), 'original'); writeFileSync(path.join(b,'extra.js'),'extra'); assert.throws(()=>compareTrees(a,b),/extra.js/)
  rmSync(path.join(b,'extra.js')); writeFileSync(path.join(b,'package-lock.json'),'resolution'); assert.equal(compareTrees(a,b,['package-lock.json']),1)
 } finally { rmSync(temp,{recursive:true,force:true}) }
})
