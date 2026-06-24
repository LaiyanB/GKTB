/**
 * 广东新高考"3+1+2"选科 — 再选科目解析与过滤工具
 *
 * 选科要求字符串示例：
 *   "首选物理，再选不限"
 *   "首选历史，再选化学"
 *   "首选物理，再选化学/生物(2选1)"
 *   "首选物理，再选化学/生物2选1"
 *   "首选物理，再选化学、生物(2科必选)"
 *   "首选物理，再选化学、生物2科必选"
 */

export const ELECTIVE_OPTIONS = ['化学', '生物', '政治', '地理']

// UI 标签 → 数据中的用词映射
var LABEL_TO_DATA = { '政治': '思想政治' }

function toDataLabel(label) {
  return LABEL_TO_DATA[label] || label
}

/**
 * 解析"再选科目"要求字符串
 * @param {string} raw - 完整选科要求，如 "首选物理，再选化学/生物(2选1)"
 * @returns {{ type: 'any'|'required'|'atLeastOne'|'all', subjects: string[] }}
 *   - 'any'：不限，无限制
 *   - 'required'：须选指定单科（如仅化学）
 *   - 'atLeastOne'：至少选其中一门（如化学/生物 2选1）
 *   - 'all'：全部必选（如化学、生物 2科必选）
 */
export function parseRequirement(raw) {
  if (!raw) return { type: 'any', subjects: [] }

  // 提取 "再选" 后面的部分
  var m = raw.match(/再选(.+)$/)
  if (!m) return { type: 'any', subjects: [] }

  var part = m[1].trim()

  // 不限
  if (part === '不限') return { type: 'any', subjects: [] }

  // 去掉尾部的 (2选1) / 2选1 / (2科必选) / 2科必选
  var cleaned = part.replace(/[（(]?2[科门]必选[）)]?$/, '').replace(/[（(]?2选1[）)]?$/, '')

  // 判断原始类型
  var isAll = /必选/.test(part)
  var isAnyOne = /2选1|\//.test(part)

  // 按 "、" 或 "/" 或 "," 分割
  var subjects = cleaned.split(/[、，,／/]/).map(function (s) { return s.trim() }).filter(Boolean)

  if (subjects.length === 0) return { type: 'any', subjects: [] }

  if (isAll) return { type: 'all', subjects: subjects }
  if (isAnyOne || subjects.length > 1) return { type: 'atLeastOne', subjects: subjects }
  return { type: 'required', subjects: subjects }
}

/**
 * 判断用户选择的再选科目是否满足该专业组的选科要求
 * @param {string} requirement - 选科要求文本
 * @param {string[]} userElectives - 用户已选的再选科目数组（如 ['化学', '生物']）
 * @returns {boolean}
 */
export function matchesElectives(requirement, rawUserElectives) {
  // 用户还没选 → 不过滤
  if (!rawUserElectives || rawUserElectives.length === 0) return true

  // 将 UI 标签映射为数据中的用词
  var userElectives = rawUserElectives.map(toDataLabel)

  var parsed = parseRequirement(requirement)

  if (parsed.type === 'any') return true

  var userSet = new Set(userElectives)

  if (parsed.type === 'required') {
    return userSet.has(parsed.subjects[0])
  }

  if (parsed.type === 'atLeastOne') {
    return parsed.subjects.some(function (s) { return userSet.has(s) })
  }

  if (parsed.type === 'all') {
    return parsed.subjects.every(function (s) { return userSet.has(s) })
  }

  return true
}
