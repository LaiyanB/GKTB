/**
 * 构建项目 + 压缩 admissions.json
 * 用 node scripts/build-and-zip.mjs 运行
 * 完成后把 dist 文件夹拖到 Cloudflare Pages 部署
 */
import { execSync } from 'child_process'
import { readFileSync, writeFileSync, unlinkSync } from 'fs'
import zlib from 'zlib'

console.log('🏗️  构建项目...')
execSync('npm run build', { stdio: 'inherit' })

console.log('📦 压缩 admissions.json...')
const src = readFileSync('dist/data/admissions.json')
const compressed = zlib.gzipSync(src)
writeFileSync('dist/data/admissions.json.gz', compressed)
unlinkSync('dist/data/admissions.json')
console.log(`   ✅ 39MB → ${(compressed.length/1024/1024).toFixed(1)}MB`)

console.log(`\n🎉 完成！dist 文件夹已准备好，拖到 Cloudflare Pages 部署`)
