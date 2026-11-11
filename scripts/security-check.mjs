import { execFileSync } from 'node:child_process'
import { mkdtempSync, cpSync, mkdirSync, rmSync, lstatSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const scanner = process.env.GITLEAKS_BIN || 'gitleaks'
const run = (command, args, options = {}) => execFileSync(command, args, { cwd: root, stdio: 'inherit', ...options })
const forbidden = /(^|\/)(?:\.env(?:\..*)?|secrets?|credentials?|node_modules|\.cache|\.git)(?:\/|$)|\.(?:pem|key|p12|pfx|sql|dump|sqlite(?:3)?|log|map)$/i
const sensitivePath = name => forbidden.test(name) && !/(^|\/)\.env\.example$/.test(name)
const staging = mkdtempSync(path.join(tmpdir(), 'leadscloser-publication-check-'))
try {
  // Failure to find/run the scanner blocks publication; never silently skip it.
  run(scanner, ['version'])
  run(scanner, ['git', root, '--redact=100', '--log-opts=--all'])
  const files = run('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { encoding: 'utf8', stdio: 'pipe' }).split('\0').filter(Boolean)
  for (const name of new Set(files)) {
    if (sensitivePath(name)) throw new Error(`Private file must not be published: ${name}`)
    const source = path.join(root, name)
    let info
    try { info = lstatSync(source) } catch (error) { if (error.code === 'ENOENT') continue; throw error }
    if (info.isSymbolicLink()) throw new Error(`Review symlink before publication: ${name}`)
    if (!info.isFile()) continue
    const destination = path.join(staging, name)
    mkdirSync(path.dirname(destination), { recursive: true })
    cpSync(source, destination)
  }
  run(scanner, ['dir', staging, '--redact=100'])
  const [pack] = JSON.parse(run('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], { encoding: 'utf8', stdio: 'pipe' }))
  for (const { path: name } of pack.files) {
    if (sensitivePath(name)) throw new Error(`Private file in npm package: ${name}`)
  }
  console.log(`Publication checks passed: ${pack.files.length} package files; working tree and Git history scanned.`)
} finally {
  rmSync(staging, { recursive: true, force: true })
}
