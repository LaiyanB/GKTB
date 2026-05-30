import fs from 'fs'
import path from 'path'
import { PROJECT_985, PROJECT_211, DOUBLE_FIRST_CLASS, UNIVERSITY_LOCATION_PATCH } from './university-static.mjs'

const root = process.cwd()
const input = path.join(root, 'data', 'normalized', 'raw-records.json')
const outDir = path.join(root, 'data', 'normalized')
const publicDir = path.join(root, 'public', 'data')
fs.mkdirSync(outDir, { recursive: true })
fs.mkdirSync(publicDir, { recursive: true })

if (!fs.existsSync(input)) {
  console.log('Missing raw-records.json. Run npm run normalize:data first.')
  process.exit(1)
}

const raw = JSON.parse(fs.readFileSync(input, 'utf-8'))

const aliases = {
  school: ['院校名称', '学校名称', '院校', '学校'],
  group: ['院校专业组', '专业组代码', '专业组'],
  major: ['专业名称', '招生专业', '专业'],
  score: ['投档最低分', '最低分', '分数'],
  rank: ['投档最低位次', '投档最低排位', '最低位次', '最低排位', '最低分排名', '位次', '排位'],
  plan: ['招生计划', '招生人数', '计划数'],
  province: ['省份'],
  city: ['城市', '所在地', '办学地点'],
  schoolType: ['办学性质'],
  subject: ['科类'],
  batch: ['批次'],
  admissionType: ['招生类型'],
  requirement: ['选科要求', '选科'],
  tuition: ['学费']
}

function pick(row, keys) {
  // 第一遍：精确匹配（列名完全等于别名之一）
  for (const key of Object.keys(row)) {
    if (keys.includes(key)) return row[key]
  }
  // 第二遍：子串匹配，优先选择匹配更长的别名（避免"专业"误匹配"专业组"）
  let bestKey = ''
  let bestAliasLen = 0
  for (const key of Object.keys(row)) {
    for (const alias of keys) {
      if (String(key).includes(alias) && alias.length > bestAliasLen) {
        bestKey = key
        bestAliasLen = alias.length
      }
    }
  }
  return bestKey ? row[bestKey] : ''
}

function normalizeSchoolName(value) {
  return String(value || '')
    .replace(/（/g, '(')
    .replace(/）/g, ')')
    .replace(/\s+/g, '')
    .replace(/\(.*?校区\)/g, '')
    .replace(/\(.*?学院\)/g, '')
    .replace(/\(.*?中外合作.*?\)/g, '')
    .replace(/\(.*?联合培养.*?\)/g, '')
    .replace(/\(.*?协同培养.*?\)/g, '')
    .replace(/\(.*?地方专项.*?\)/g, '')
    .replace(/\(.*?少数民族.*?\)/g, '')
    .replace(/\(.*?\)/g, '')
    .trim()
}

function num(value) {
  const text = String(value ?? '').replace(/,/g, '').replace(/[^0-9.]/g, '').trim()
  if (!text) return null
  const result = Number(text)
  return Number.isFinite(result) ? result : null
}

function subject(value, fallback) {
  const text = String(value || '')
  if (text.includes('物理')) return 'physics'
  if (text.includes('历史')) return 'history'
  return fallback
}

function normalizeCity(value) {
  return String(value || '').replace(/市$/, '').trim()
}

function inferCity(school) {
  const text = String(school || '')
  if (text.includes('深圳')) return '深圳'
  if (text.includes('广州') || text.includes('华南') || text.includes('中山大学')) return '广州'
  if (text.includes('珠海')) return '珠海'
  if (text.includes('佛山')) return '佛山'
  if (text.includes('东莞')) return '东莞'
  return ''
}

function direction(major) {
  const text = String(major || '')
  if (/计算机|软件|数据|网络|人工智能/.test(text)) return '计算机'
  if (/电子|通信|信息/.test(text)) return '电子信息'
  if (/自动化|机器|电气/.test(text)) return '自动化'
  if (/法学|法律/.test(text)) return '法学'
  if (/金融|会计|经济|财务|财政/.test(text)) return '财经'
  if (/师范|教育|汉语言/.test(text)) return '师范'
  if (/医学|临床|口腔|药学/.test(text)) return '医学'
  return '其他'
}

function first(...values) {
  return values.find((value) => value !== null && value !== undefined && String(value).trim() !== '') ?? ''
}

function isSegment(file) {
  return file.includes('一分一段')
}

function staticTags(school) {
  return {
    is_985: PROJECT_985.has(school),
    is_211: PROJECT_211.has(school),
    is_double_first_class: DOUBLE_FIRST_CLASS.has(school)
  }
}

function patchedLocation(school) {
  const patch = UNIVERSITY_LOCATION_PATCH[school]
  return patch ? { province: patch[0], city: patch[1] } : { province: '', city: '' }
}

let admissions = []
const scoreSegments = []
const universities = new Map()
const unknownColumns = new Set()
const sourceSummary = {}

function collectUniversity(rawSchool, patch = {}) {
  const school = normalizeSchoolName(rawSchool)
  if (!school) return
  const tags = staticTags(school)
  const location = patchedLocation(school)

  if (!universities.has(school)) {
    universities.set(school, {
      school,
      aliases: [],
      province: '',
      city: '',
      ...tags
    })
  }

  const current = universities.get(school)
  if (rawSchool && rawSchool !== school && !current.aliases.includes(rawSchool)) current.aliases.push(rawSchool)

  current.province = first(patch.province, current.province, location.province)
  current.city = first(patch.city, current.city, location.city)
  current.is_985 = tags.is_985
  current.is_211 = tags.is_211
  current.is_double_first_class = tags.is_double_first_class
}

function isEmptyKeyRow(row) {
  return Object.keys(row).length > 0 && Object.keys(row).some(k => /^__EMPTY/.test(k))
}

function pickByPosition(row, pos) {
  const keys = Object.keys(row)
  if (pos >= keys.length) return ''
  const val = row[keys[pos]]
  return val != null ? String(val).trim() : ''
}

for (const record of raw.records) {
  const row = record.raw || {}
  const sourceKey = `${record.source_file} / ${record.source_sheet}`
  sourceSummary[sourceKey] ||= { total: 0, admissions: 0, score_segments: 0 }
  sourceSummary[sourceKey].total += 1

  for (const key of Object.keys(row)) {
    const known = Object.values(aliases).flat().some((name) => String(key).includes(name))
    if (!known) unknownColumns.add(key)
  }

  // 检测 __EMPTY 键模式（2024年Excel: 首行合并标题导致列名丢失）
  const isEmptyKeys = isEmptyKeyRow(row)

  if (isSegment(record.source_file)) {
    const item = {
      id: scoreSegments.length + 1,
      year: record.inferred_year,
      subject: subject(pick(row, aliases.subject), record.inferred_subject),
      score: num(pick(row, ['分数', '成绩'])),
      count: num(pick(row, ['本段人数', '本段人数(人)'])),
      cumulative: num(pick(row, ['累计人数', '累计人数(人)', '排名区间'])),
      source_file: record.source_file,
      source_sheet: record.source_sheet
    }
    if (item.score || item.count || item.cumulative) {
      scoreSegments.push(item)
      sourceSummary[sourceKey].score_segments += 1
    }
    continue
  }

  let rawSchool, school, major, minRank, minScore
  let subjText = '', groupField = '', batchField = '', provinceField = '', cityField = '', reqField = ''

  if (isEmptyKeys) {
    // 2024年格式：按列位置映射（跳过表头行）
    // 位置: 0=生源地, 1=学校, 2=年份, 3=专业, 4=专业组, 5=科类, 6=选科, 7=最低分, 8=最低位次, 9=批次, 10=省份, 11=城市
    if (pickByPosition(row, 1) === '学校') continue
    rawSchool = pickByPosition(row, 1)
    school = normalizeSchoolName(rawSchool)
    major = pickByPosition(row, 3)
    minRank = num(pickByPosition(row, 8))
    minScore = num(pickByPosition(row, 7))
    subjText = pickByPosition(row, 5)
    groupField = pickByPosition(row, 4)
    batchField = pickByPosition(row, 9)
    provinceField = pickByPosition(row, 10)
    cityField = pickByPosition(row, 11)
    reqField = pickByPosition(row, 6)
  } else {
    rawSchool = pick(row, aliases.school)
    school = normalizeSchoolName(rawSchool)
    major = pick(row, aliases.major)
    minRank = num(pick(row, aliases.rank))
    minScore = num(pick(row, aliases.score))
    subjText = pick(row, aliases.subject)
    groupField = pick(row, aliases.group)
    batchField = pick(row, aliases.batch)
    provinceField = pick(row, aliases.province)
    cityField = pick(row, aliases.city)
    reqField = pick(row, aliases.requirement)
  }
  if (!school && !major && !minRank && !minScore) continue

  // 使用数据列中的科类（覆盖文件名推断，解决2024混合科类问题）
  const subjectVal = subject(subjText, record.inferred_subject)

  const location = patchedLocation(school)
  const province = first(provinceField, location.province)
  const city = normalizeCity(first(cityField, location.city, inferCity(school)))
  const tags = staticTags(school)

  collectUniversity(rawSchool, { province, city })

  admissions.push({
    id: admissions.length + 1,
    year: record.inferred_year,
    subject: subjectVal,
    school,
    raw_school: rawSchool,
    major_group: groupField,
    major,
    direction: direction(major),
    min_score: minScore,
    min_rank: minRank,
    plan_count: num(pick(row, aliases.plan)),
    province,
    city,
    ...tags,
    school_type: pick(row, aliases.schoolType),
    batch: batchField,
    admission_type: pick(row, aliases.admissionType),
    requirement: reqField,
    tuition: pick(row, aliases.tuition),
    source_file: record.source_file,
    source_sheet: record.source_sheet
  })
  sourceSummary[sourceKey].admissions += 1
}

// 过滤掉专科批次数据
// 原因：2021/2022 原始数据包含专科批，而 2023/2024 仅有本科批，
// 保留专科批会导致大量院校在后两年"消失"，前端表格大片空白
const filteredCount = admissions.filter(r => r.batch === '专科批').length
if (filteredCount > 0) {
  admissions = admissions.filter(r => r.batch !== '专科批')
  console.log(`已过滤 ${filteredCount} 条专科批记录，剩余 ${admissions.length} 条`)
}

// 过滤掉艺术/体育类专业（分数体系和普通类完全不同）
// 标记：展示分数为文化分，或专业名以艺术/体育类关键词开头
function isArtsOrSportsMajor(major) {
  const m = String(major || '')
  if (m.includes('展示分数为文化分')) return true
  if (/^(音乐|美术|艺术|舞蹈|表演|播音|编导|主持|摄影|书法|雕塑|设计学|绘画|体育|武术|运动|社会体育|休闲体育|体能训练)/.test(m)) return true
  return false
}
const artFilterCount = admissions.filter(r => isArtsOrSportsMajor(r.major)).length
if (artFilterCount > 0) {
  admissions = admissions.filter(r => !isArtsOrSportsMajor(r.major))
  console.log(`已过滤 ${artFilterCount} 条艺术/体育类专业记录，剩余 ${admissions.length} 条`)
}

for (const school of PROJECT_985) collectUniversity(school)

const universityRows = [...universities.values()].sort((a, b) => a.school.localeCompare(b.school, 'zh-CN'))
const bySchool = new Map(universityRows.map((item) => [item.school, item]))
const enrichedAdmissions = admissions.map((item) => {
  const u = bySchool.get(item.school) || {}
  return {
    ...item,
    province: first(item.province, u.province),
    city: first(item.city, u.city),
    is_985: Boolean(item.is_985 ?? u.is_985),
    is_211: Boolean(item.is_211 ?? u.is_211),
    is_double_first_class: Boolean(item.is_double_first_class ?? u.is_double_first_class)
  }
})

// 全局去重：同一所学校+专业+位次+年份+科类 只保留第一条
const seenDedup = new Set()
const dedupedAdmissions = enrichedAdmissions.filter((rec) => {
  const key = `${rec.year}_${rec.school}_${rec.major}_${rec.min_rank ?? ''}_${rec.subject}`
  if (seenDedup.has(key)) return false
  seenDedup.add(key)
  return true
})
const removedDupCount = enrichedAdmissions.length - dedupedAdmissions.length
if (removedDupCount > 0) console.log(`Dedup: removed ${removedDupCount} duplicates`)

const datasets = {
  'admissions.json': dedupedAdmissions,
  'score-segments.json': scoreSegments,
  'universities.json': universityRows
}

for (const [name, records] of Object.entries(datasets)) {
  const payload = { generated_at: new Date().toISOString(), total: records.length, records }
  fs.writeFileSync(path.join(outDir, name), JSON.stringify(payload, null, 2), 'utf-8')
  fs.writeFileSync(path.join(publicDir, name), JSON.stringify(payload), 'utf-8')
}

function missingList(field) {
  return universityRows
    .filter((item) => item[field] === '' || item[field] === null || item[field] === undefined)
    .map((item) => item.school)
}

const missing = {
  province: missingList('province').length,
  city: missingList('city').length
}

const missingProject985 = [...PROJECT_985].filter((school) => !bySchool.has(school))

fs.writeFileSync(path.join(outDir, 'mapping-report.json'), JSON.stringify({
  admissions: enrichedAdmissions.length,
  score_segments: scoreSegments.length,
  universities: universityRows.length,
  missing_university_fields: missing,
  missing_universities: {
    province: missingList('province'),
    city: missingList('city')
  },
  static_tag_summary: {
    project_985_total: PROJECT_985.size,
    is_985_true: universityRows.filter((item) => item.is_985).length,
    is_211_true: universityRows.filter((item) => item.is_211).length,
    is_double_first_class_true: universityRows.filter((item) => item.is_double_first_class).length,
    missing_project_985: missingProject985
  },
  unknown_columns: [...unknownColumns].sort(),
  source_summary: sourceSummary
}, null, 2), 'utf-8')

console.log(`Admissions: ${enrichedAdmissions.length}`)
console.log(`Score segments: ${scoreSegments.length}`)
console.log(`Universities: ${universityRows.length}`)
console.log('Missing university fields:', missing)
