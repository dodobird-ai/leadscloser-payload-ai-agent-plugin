import path from 'node:path'
import { root, ignored, readRevision, renderVue } from './vue-source.mjs'
import { compareTrees } from './source-snapshot.mjs'
const revision = readRevision()
if (!/^[a-f0-9]{40}$/.test(revision)) throw new Error('UPSTREAM.json must pin a full commit SHA')
const snapshot = renderVue(revision)
try {
  const count = compareTrees(snapshot.tree, path.join(root, 'vue'), ignored)
  console.log(`Vue sync verified: ${count} files at ${revision} + explicit patches.`)
} finally { snapshot.cleanup() }
