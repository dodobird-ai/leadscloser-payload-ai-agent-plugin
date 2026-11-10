import { execFileSync } from 'node:child_process'
import { cpSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const source = path.join(root, 'vue')
const output = path.join(source, '.cache/dist')
execFileSync('npm', ['run', 'build', '--', '--dest', output], { cwd: source, stdio: 'inherit', env: {
  ...process.env, VUE_APP_CHATBOT_BACKEND_ROUTE: 'api/v1', VUE_APP_CHATBOT_PROXY_ROUTE: 'api/v1/chatbot/proxy', VUE_APP_DEV_AUTH_PROXY: 'false',
}})
const target = path.resolve(process.argv[2] || path.join(root, 'dist/chatbot'))
mkdirSync(target, { recursive: true })
for (const directory of ['assets', 'img']) cpSync(path.join(output, directory), path.join(target, directory), { recursive: true })
console.log(`Widget assets: ${target}`)
