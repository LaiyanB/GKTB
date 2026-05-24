export function adaptAdmissions(rawRows) {
  if (!Array.isArray(rawRows) || rawRows.length === 0) return []

  const groups = new Map()

  for (const row of rawRows) {
    if (!row || !row.year || !row.subject || !row.school || !row.min_rank) continue
    if (row.subject !== 'physics' && row.subject !== 'history') continue

    const key = [row.subject, row.school, row.major_group || '', row.major || ''].join('::')

    if (!groups.has(key)) {
      groups.set(key, {
        id: key,
        subject: row.subject,
        school: row.school,
        rawSchool: row.raw_school || row.school,
        group: row.major_group || '未标注专业组',
        major: row.major || '未标注专业',
        direction: row.direction || '其他',
        province: row.province || '',
        city: row.city || '待补充',
        type: row.school_type || '待补充',
        coop: String(row.school_type || '').includes('中外') || String(row.admission_type || '').includes('中外'),
        is985: Boolean(row.is_985),
        is211: Boolean(row.is_211),
        isDoubleFirstClass: Boolean(row.is_double_first_class),
        ranks: {},
        scores: {},
        planCounts: {},
        note: '来自离线 Excel 数据。部分字段仍会继续清洗。'
      })
    }

    const item = groups.get(key)
    item.ranks[row.year] = row.min_rank
    if (row.min_score) item.scores[row.year] = row.min_score
    if (row.plan_count) item.planCounts[row.year] = row.plan_count
  }

  return [...groups.values()]
    .filter((item) => Object.keys(item.ranks).length > 0)
}
