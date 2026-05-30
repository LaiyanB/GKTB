/**
 * Vite 构建后自动压缩 admissions.json
 * 由 npm run build 自动调用
 */
import { readFileSync, writeFileSync, unlinkSync } from 'fs'
import zlib from 'zlib'

try {
  const src = readFileSync('dist/data/admissions.json')
  const compressed = zlib.gzipSync(src)
  writeFileSync('dist/data/admissions.json.gz', compressed)
  unlinkSync('dist/data/admissions.json')
  console.log(`📦 admissions.json 压缩: ${(src.length/1024/1024).toFixed(0)}MB → ${(compressed.length/1024/1024).toFixed(1)}MB`)
} catch {
  // admissions.json 可能已被压缩，忽略
}
