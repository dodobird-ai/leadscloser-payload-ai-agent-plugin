import path from 'node:path'
import { root, ignored, renderVue } from './vue-source.mjs'
import { replaceTree } from './source-snapshot.mjs'
const revision = process.argv[2]
if (!revision) throw new Error('Usage: node scripts/sync-vue.mjs <revision>')
const snapshot = renderVue(revision)
try {
  replaceTree(snapshot.tree, path.join(root, 'vue'), ignored)
  console.log(`Vue synchronized at ${snapshot.commit}. Review patches and refresh package-lock.json if dependencies changed.`)
} finally { snapshot.cleanup() }
