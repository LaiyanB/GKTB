/**
 * 将 admissions.json 导入 Supabase schools 表
 * 分批生成 SQL 文件
 */
import { readFileSync, writeFileSync } from 'fs'
import zlib from 'zlib'

// 读取数据
const raw = readFileSync('dist/data/admissions.json.gz')
const data = JSON.parse(zlib.gunzipSync(raw))
const records = data.records || []
console.log(`共 ${records.length} 条记录`)

// 分批写入 SQL 文件
const BATCH_SIZE = 500
const totalBatches = Math.ceil(records.length / BATCH_SIZE)

for (let b = 0; b < totalBatches; b++) {
  const start = b * BATCH_SIZE
  const end = Math.min(start + BATCH_SIZE, records.length)
  const batch = records.slice(start, end)
  
  const values = batch.map(r => {
    const esc = s => s == null ? 'NULL' : "'" + String(s).replace(/'/g, "''") + "'"
    return `(${[
      r.id, r.year, esc(r.subject), esc(r.school), esc(r.raw_school),
      esc(r.major_group), esc(r.major), esc(r.direction),
      r.min_score ?? 'NULL', r.min_rank ?? 'NULL',
      r.plan_count ?? 'NULL', esc(r.province), esc(r.city),
      r.is_985 ? 'TRUE' : 'FALSE', r.is_211 ? 'TRUE' : 'FALSE',
      r.is_double_first_class ? 'TRUE' : 'FALSE',
      esc(r.school_type), esc(r.batch), esc(r.admission_type),
      esc(r.requirement), esc(r.tuition)
    ].join(',')})`
  }).join(',\n')

  const sql = `INSERT INTO public.schools (id, year, subject, school, raw_school, major_group, major, direction, min_score, min_rank, plan_count, province, city, is_985, is_211, is_double_first_class, school_type, batch, admission_type, requirement, tuition) VALUES\n${values}\nON CONFLICT (id) DO NOTHING;`
  
  writeFileSync(`scripts/sql-batch-${String(b).padStart(3, '0')}.sql`, sql)
  console.log(`  批次 ${b + 1}/${totalBatches} (${batch.length} 条) -> scripts/sql-batch-${String(b).padStart(3, '0')}.sql`)
}

console.log(`\n✅ 共生成 ${totalBatches} 个 SQL 文件`)
