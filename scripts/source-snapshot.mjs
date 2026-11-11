import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, lstatSync, rmSync, cpSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

export function fetchSnapshot(repository, revision, source = repository) {
  if (!/^[a-zA-Z0-9][\w./-]*$/.test(revision)) throw new Error('Invalid revision')
  const temp = mkdtempSync(path.join(tmpdir(), 'source-snapshot-'))
  const git = path.join(temp, 'git'), tree = path.join(temp, 'tree')
  mkdirSync(tree)
  const run = args => execFileSync('git', args, { env: { ...process.env, GIT_TERMINAL_PROMPT: '0' }, stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 128 * 1024 * 1024 })
  try {
    run(['init', '--bare', git])
    // gh supplies credentials through Git's pipe; never embed a token in a URL/file.
    run(['-C', git, '-c', 'credential.helper=!gh auth git-credential', 'fetch', '--depth=1', source, revision])
    const commit = run(['-C', git, 'rev-parse', 'FETCH_HEAD^{commit}']).toString().trim()
    const archive = run(['-C', git, 'archive', commit])
    execFileSync('tar', ['-xf', '-', '-C', tree], { input: archive })
    return { tree, commit, cleanup: () => rmSync(temp, { recursive: true, force: true }) }
  } catch (error) {
    rmSync(temp, { recursive: true, force: true })
    throw new Error(`Cannot fetch ${repository} at ${revision}. Check revision availability and read access.`, { cause: error })
  }
}
export function files(root, ignored = []) {
  const result = new Map()
  const walk = (directory, prefix = '') => {
    for (const entry of readdirSync(directory)) {
      const name = prefix + entry
      if (ignored.some(p => name === p || name.startsWith(p + '/'))) continue
      const file = path.join(directory, entry), stat = lstatSync(file)
      if (stat.isSymbolicLink()) throw new Error(`Unexpected symlink: ${name}`)
      if (stat.isDirectory()) walk(file, name + '/')
      else if (stat.isFile()) result.set(name, readFileSync(file))
    }
  }
  walk(root)
  return result
}
export function compareTrees(expected, actual, ignored = []) {
  const a = files(expected, ignored), b = files(actual, ignored)
  const changed = [...new Set([...a.keys(), ...b.keys()])].filter(name => !a.get(name)?.equals(b.get(name) ?? Buffer.alloc(0)) || !b.has(name)).sort()
  if (changed.length) throw new Error(`Vendored source drift:\n${changed.join('\n')}`)
  return a.size
}
export function replaceTree(source, target, preserved = []) {
  mkdirSync(target, { recursive: true })
  for (const name of readdirSync(target)) if (!preserved.includes(name)) rmSync(path.join(target, name), { recursive: true, force: true })
  cpSync(source, target, { recursive: true })
}
export function applyPatches(tree, directory) {
  for (const name of readdirSync(directory).filter(n => n.endsWith('.patch')).sort()) {
    // --no-index avoids treating the temporary tree as part of a surrounding checkout.
    execFileSync('git', ['apply', '--no-index', '--whitespace=nowarn', path.resolve(directory, name)], { cwd: tree, stdio: 'pipe' })
  }
}
