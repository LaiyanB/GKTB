// 清洗专业名：去掉括号中的课程代码、办学地点、招生类型、住宿费、
// 专业含列表、外语要求、学费、分校信息等冗余内容
// 保留有意义的后缀如 （八年制）（师范）（创新班）
export function simplifyMajor(raw) {
  if (!raw) return ''
  var s = String(raw)

  // 修复常见格式缺陷
  s = s.replace(/专业办学地点/g, '专业；办学地点')
  s = s.replace(/专业住宿费/g, '专业；住宿费')

  // 判断括号内容是否为行政信息的辅助函数
  function isBureaucratic(parenContent) {
    return /含.{0,20}专业|住宿费|办学地点|外语语种|学费|不招|特征要求|成绩要求|备注：|全英文|辅修|ACCA|分流|培养.*人才|授课|马来西亚|林吉特|协同培养|联合培养|中外合作/.test(parenContent)
  }

  // 迭代剥离含行政信息的括号（最多5轮，处理嵌套）
  var changed = true
  for (var round = 0; round < 6 && changed; round++) {
    changed = false
    // 匹配最内层括号
    s = s.replace(/（([^（）]*)）/g, function (match, content) {
      if (isBureaucratic(content)) {
        changed = true
        return ''
      }
      return match
    })
  }

  // 处理无括号或残留的行内关键词
  s = s.replace(/[（(]非定向[）)]/g, '')
  s = s.replace(/[（(]定向[）)]/g, '')
  s = s.replace(/[（(]地方专项[）)]/g, '')

  // 课程代码类：（090301.动物科学+090701.草业科学）
  s = s.replace(/（\d{3,6}\.[^）]+(?:[+＋][^）]*)?）/g, '')
  // 金额类
  s = s.replace(/（\d+[元美][^）]{0,30}）/g, '')
  // 残余含校区/分校/学院的括号
  s = s.replace(/（[^）]*(?:分校|校区|学院)[^）]*）/g, '')
  // 残余含住宿费/学费的括号
  s = s.replace(/（[^）]*(?:住宿费|学费)[^）]*）/g, '')

  // 收尾
  s = s.replace(/（）/g, '')
  s = s.replace(/\(\)/g, '')
  s = s.replace(/[；;]+/g, '；')
  s = s.replace(/^[；;]+|[；;]+$/g, '')
  s = s.replace(/\s+/g, '')
  s = s.replace(/[（(]\s*[）)]/g, '')

  return s.trim()
}

export function adaptAdmissions(rawRows) {
  if (!Array.isArray(rawRows) || rawRows.length === 0) return []

  const groups = new Map()

  for (const row of rawRows) {
    if (!row || !row.year || !row.subject || !row.school || !row.min_rank) continue
    if (row.subject !== 'physics' && row.subject !== 'history') continue

    const key = [row.subject, row.school, simplifyMajor(row.major || '')].join('::')

    if (!groups.has(key)) {
      groups.set(key, {
        id: key,
        subject: row.subject,
        school: row.school,
        rawSchool: row.raw_school || row.school,
        group: row.major_group || '未标注专业组',
        major: simplifyMajor(row.major || '') || '未标注专业',
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
