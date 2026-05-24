import fs from 'fs'
import path from 'path'

const root = process.cwd()
const summaryPath = path.join(root, 'data', 'normalized', 'school-summary.json')
const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf-8'))

const records = summary.records
const allYears = [2021, 2022, 2023, 2024]
const subjects = ['physics', 'history']
const subjectLabel = { physics: '物理类', history: '历史类' }

// Per-school year coverage
const coverage = records.map(school => {
  const subs = school.subjects || {}
  const missing = {}
  const has = {}

  for (const sub of subjects) {
    const data = subs[sub] || {}
    const present = allYears.filter(y => data[String(y)] && data[String(y)].min_rank != null && data[String(y)].min_rank > 0)
    const absent = allYears.filter(y => !present.includes(y))
    has[sub] = present
    missing[sub] = absent
  }

  return { school: school.school, has, missing }
})

// 1. Schools missing ALL years for a subject
console.log('\n═══ 完全缺少某科类数据的院校 ═══\n')
for (const sub of subjects) {
  const missingAll = coverage.filter(c => c.has[sub].length === 0)
  console.log(`[${subjectLabel[sub]}] 完全无数据: ${missingAll.length} 所`)
  if (missingAll.length > 0 && missingAll.length <= 10) {
    missingAll.forEach(c => console.log(`  ${c.school}`))
  }
}

// 2. Schools missing 2021 一分一段对应数据（专业分数线已有但缺一分一段的年份）
// Actually, let's focus on the admission scores per school per year

console.log('\n\n═══ 各年份覆盖统计（专业分数线） ═══\n')
for (const sub of subjects) {
  console.log(`--- ${subjectLabel[sub]} ---`)
  for (const year of allYears) {
    const hasYear = coverage.filter(c => c.has[sub].includes(year))
    const pct = ((hasYear.length / records.length) * 100).toFixed(1)
    console.log(`  ${year}年: ${hasYear.length} 所 (${pct}%)`)
  }
  // Schools with all 4 years
  const full = coverage.filter(c => c.has[sub].length === 4)
  console.log(`  四年全齐: ${full.length} 所`)
}

// 3. Top missing patterns
console.log('\n\n═══ 最常见的缺失模式 ═══\n')
const patternCount = {}
for (const c of coverage) {
  for (const sub of subjects) {
    if (c.missing[sub].length > 0 && c.missing[sub].length < 4) {
      const key = `${subjectLabel[sub]}: ${c.missing[sub].join('/')}`
      patternCount[key] = (patternCount[key] || 0) + 1
    }
  }
}

const sorted = Object.entries(patternCount).sort((a, b) => b[1] - a[1])
const topN = 10
console.log(`前 ${topN} 个缺失模式（排除完全无数据的院校）:\n`)
for (const [pattern, count] of sorted.slice(0, topN)) {
  console.log(`  ${pattern} — ${count} 所`)
}

// 4. Show some specific schools with notable gaps
console.log('\n\n═══ 只缺 2021 年数据的院校（示例） ═══\n')
const onlyMissing2021 = coverage.filter(c => {
  const physics = c.missing.physics.length === 1 && c.missing.physics[0] === 2021
  const history = c.missing.history.length === 1 && c.missing.history[0] === 2021
  return physics || history
})
console.log(`  共 ${onlyMissing2021.length} 所（仅列前 15 所）:`)
onlyMissing2021.slice(0, 15).forEach(c => {
  const detail = subjects.map(s => c.missing[s].length > 0 ? `${subjectLabel[s]}缺${c.missing[s].join('/')}` : '').filter(Boolean).join(', ')
  console.log(`  ${c.school} — ${detail}`)
})

// 5. Count how many schools have exactly how many years
console.log('\n\n═══ 每个院校拥有的年份数分布 ═══\n')
for (const sub of subjects) {
  const dist = {}
  for (let y = 0; y <= 4; y++) {
    dist[y] = coverage.filter(c => c.has[sub].length === y).length
  }
  console.log(`[${subjectLabel[sub]}] 0年:${dist[0]} | 1年:${dist[1]} | 2年:${dist[2]} | 3年:${dist[3]} | 4年:${dist[4]}`)
}
