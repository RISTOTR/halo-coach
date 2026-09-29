// Source inventory only: never connects to Supabase or loads .env.
import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'

const rows = []
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name)
    if (entry.isDirectory()) { walk(file); continue }
    if (!/\.(ts|vue)$/.test(file)) continue
    let source = fs.readFileSync(file, 'utf8')
    if (file.endsWith('.vue')) {
      const scripts = [...source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)]
      source = scripts.map(m => '\n'.repeat(source.slice(0, m.index + m[0].indexOf('>') + 1).split('\n').length - 1) + m[1]).join('\n')
    }
    const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true)
    function visit(node) {
      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
        const method = node.expression.name.text
        const arg = node.arguments[0]
        if (['from', 'rpc'].includes(method) && arg && ts.isStringLiteral(arg)) {
          let outer = node
          while (outer.parent && (ts.isPropertyAccessExpression(outer.parent) || ts.isCallExpression(outer.parent))) outer = outer.parent
          const chain = outer.getText(tree).replace(/\s+/g, ' ')
          const line = tree.getLineAndCharacterOfPosition(node.expression.name.getStart(tree)).line + 1
          rows.push({ file, line, method, name: arg.text, chain })
        }
      }
      ts.forEachChild(node, visit)
    }
    visit(tree)
  }
}
for (const dir of ['pages', 'components', 'composables', 'server', 'app']) walk(dir)
rows.sort((a,b) => a.name.localeCompare(b.name) || a.file.localeCompare(b.file) || a.line-b.line)
const tables = [...new Set(rows.filter(r => r.method === 'from').map(r => r.name))]
const rpcs = [...new Set(rows.filter(r => r.method === 'rpc').map(r => r.name))]
let output = '# Halo database call-site inventory\n\nGenerated from application source with `node scripts/inventory-database.mjs`. This is source evidence, not deployed SQL.\n\n'
output += `${tables.length} tables; ${rpcs.length} RPC names; ${rows.length} call sites.\n\n`
for (const name of [...tables, ...rpcs]) {
  output += `## ${name}\n\n`
  for (const row of rows.filter(r => r.name === name)) {
    output += `- \`${row.file}:${row.line}\`\n\n\`\`\`ts\n${row.chain}\n\`\`\`\n\n`
  }
}
fs.writeFileSync('docs/audit/HALO_DATABASE_CALLS.md', output.trimEnd() + '\n')
console.log(`${tables.length} tables, ${rpcs.length} RPCs, ${rows.length} call sites inventoried.`)
