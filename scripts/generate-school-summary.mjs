import fs from 'fs'
import path from 'path'

const root = process.cwd()
const admissionsPath = path.join(root, 'data', 'normalized', 'admissions.json')
const universitiesPath = path.join(root, 'data', 'normalized', 'universities.json')
const outDir = path.join(root, 'data', 'normalized')
const publicDir = path.join(root, 'public', 'data')

fs.mkdirSync(outDir, { recursive: true })
fs.mkdirSync(publicDir, { recursive: true })

if (!fs.existsSync(admissionsPath)) {
  console.error('Missing admissions.json. Run npm run map:data first.')
  process.exit(1)
}

const admissions = JSON.parse(fs.readFileSync(admissionsPath, 'utf-8'))
const universities = JSON.parse(fs.readFileSync(universitiesPath, 'utf-8'))

// Build a lookup: school → province, city, tags
const uniMap = new Map()
for (const u of universities.records) {
  uniMap.set(u.school, {
    province: u.province || '',
    city: u.city || '',
    is_985: u.is_985 ?? false,
    is_211: u.is_211 ?? false,
    is_double_first_class: u.is_double_first_class ?? false
  })
}

// Aggregate by school → subject → year
// For each school+subject+year, pick the lowest score and its corresponding rank
const schoolMap = new Map() // school -> { province, city, is_*, subjects: { subject: { year: { min_score, min_rank } } } }

for (const rec of admissions.records) {
  if (!rec.school) continue
  if (!rec.subject || (rec.subject !== 'physics' && rec.subject !== 'history')) continue
  if (!rec.year) continue

  let entry = schoolMap.get(rec.school)
  if (!entry) {
    const meta = uniMap.get(rec.school) || { province: '', city: '', is_985: false, is_211: false, is_double_first_class: false }
    entry = {
      school: rec.school,
      province: meta.province,
      city: meta.city,
      is_985: meta.is_985,
      is_211: meta.is_211,
      is_double_first_class: meta.is_double_first_class,
      subjects: {}
    }
    schoolMap.set(rec.school, entry)
  }

  // Init subject group
  if (!entry.subjects[rec.subject]) {
    entry.subjects[rec.subject] = {}
  }

  const yearKey = String(rec.year)
  const existing = entry.subjects[rec.subject][yearKey]

  const score = rec.min_score
  const rank = rec.min_rank

  if (!existing) {
    entry.subjects[rec.subject][yearKey] = { min_score: score, min_rank: rank }
  } else {
    // Update to lower score if new score is smaller (and valid)
    if (score != null && (existing.min_score == null || score < existing.min_score)) {
      existing.min_score = score
      existing.min_rank = rank
    }
  }
}

// Sort schools alphabetically by Chinese
const sortedSchools = [...schoolMap.values()].sort((a, b) => a.school.localeCompare(b.school, 'zh-CN'))

// Remove unused subjects (empty after agg)
for (const s of sortedSchools) {
  for (const subj of Object.keys(s.subjects)) {
    const years = Object.keys(s.subjects[subj])
    // Remove years where both min_score and min_rank are null
    for (const y of years) {
      if (s.subjects[subj][y].min_score == null && s.subjects[subj][y].min_rank == null) {
        delete s.subjects[subj][y]
      }
    }
    // Remove subject if all years are empty
    if (Object.keys(s.subjects[subj]).length === 0) {
      delete s.subjects[subj]
    }
  }
  // Remove subjects field entirely if empty
  if (Object.keys(s.subjects).length === 0) {
    delete s.subjects
  }
}

const output = {
  generated_at: new Date().toISOString(),
  total: sortedSchools.length,
  records: sortedSchools
}

const outPath = path.join(outDir, 'school-summary.json')
const publicPath = path.join(publicDir, 'school-summary.json')

fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf-8')
fs.writeFileSync(publicPath, JSON.stringify(output), 'utf-8')

// Quick stats
let phy2024 = 0, his2024 = 0, hasAny2024 = 0
for (const s of sortedSchools) {
  const phy = s.subjects?.physics?.['2024']
  const his = s.subjects?.history?.['2024']
  if (phy) phy2024++
  if (his) his2024++
  if (phy || his) hasAny2024++
}

console.log(`school-summary.json generated.`)
console.log(`Total schools: ${sortedSchools.length}`)
console.log(`Schools with physics 2024: ${phy2024}`)
console.log(`Schools with history 2024: ${his2024}`)
console.log(`Schools with any 2024 data: ${hasAny2024}`)
