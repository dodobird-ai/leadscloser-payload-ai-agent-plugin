import { readFileSync, writeFileSync, rmSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { fetchSnapshot, applyPatches } from './source-snapshot.mjs'
export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
export const repository = 'https://github.com/dodobird-ai/dodo-ai-chat.git'
export const ignored = ['node_modules', '.cache', 'dist', 'package-lock.json']
export const exclusions = ['.env', '.envrc', '.github', '.nvmrc', 'CLAUDE.md', 'README.md', 'cypress', 'cypress.config.js', 'cypress.live.config.js', 'justfile', 'yarn.lock', 'public/sothebys.png', 'public/store.png', 'src/helpers/fake-messages.js']
export const readRevision = () => JSON.parse(readFileSync(path.join(root, 'vue/UPSTREAM.json'), 'utf8')).revision
export function renderVue(revision) {
  const snapshot = fetchSnapshot(repository, revision, process.env.VUE_UPSTREAM_SOURCE || repository)
  try {
    for (const name of exclusions) rmSync(path.join(snapshot.tree, name), { recursive: true, force: true })
    applyPatches(snapshot.tree, path.join(root, 'vue-patches'))
    writeFileSync(path.join(snapshot.tree, 'UPSTREAM.json'), JSON.stringify({ repository, revision: snapshot.commit }, null, 2) + '\n')
    return snapshot
  } catch (error) { snapshot.cleanup(); throw error }
}
