import { candidateCounts } from '../data'

export function formatNumber(value) {
  return Number(value || 0).toLocaleString('zh-CN')
}

export function formatPercent(value) {
  return `${(Number(value || 0) * 100).toFixed(2)}%`
}

/**
 * 排位趋势方向
 * 正值（排位数变大）= 竞争减弱 ↑；负值（排位数变小）= 竞争加剧 ↓
 */
export function computeTrend(yearRanks) {
  var years = Object.keys(yearRanks).map(Number).sort().reverse()
  if (years.length < 2) return { direction: 'flat', diff: 0, label: '数据不足' }

  var latest = yearRanks[years[0]]
  var prev = yearRanks[years[1]]
  var diff = latest - prev
  var pct = diff / prev

  if (pct > 0.02) return { direction: 'up', diff: Math.abs(diff), label: '↑ 排位上升 ' + formatNumber(Math.abs(diff)) }
  if (pct < -0.02) return { direction: 'down', diff: Math.abs(diff), label: '↓ 排位下降 ' + formatNumber(Math.abs(diff)) }
  return { direction: 'flat', diff: 0, label: '→ 基本稳定' }
}

function rankRate(rank, subject, year) {
  const count = candidateCounts[subject]?.[year]
  return count ? rank / count : 0
}

function normalizeWeights(weights, length) {
  const selected = weights.slice(0, length)
  const total = selected.reduce((sum, item) => sum + item, 0)
  return selected.map((item) => item / total)
}

export function forecastRecord(record) {
  const baselineWeights = [0.78, 0.14, 0.06, 0.02]
  const trendWeights = [0.8, 0.15, 0.05]
  const availableYears = [2024, 2023, 2022, 2021].filter((year) => Number(record.ranks?.[year]) > 0)

  if (availableYears.length === 0) {
    return {
      predictedRate: 0,
      predictedRank: 999999,
      latestRate: 0,
      rateChange: 0,
      dataYears: []
    }
  }

  // 直接用历年排位做加权基准 + 保守趋势修正（位次法）
  // 相比排位占比法，位次法更直观，且不受 2025 年考生总数变化影响
  const ranks = availableYears.map((year) => record.ranks[year])
  const weights = normalizeWeights(baselineWeights, ranks.length)
  const baseline = ranks.reduce((sum, current, index) => sum + current * weights[index], 0)

  // 趋势：正值表示排位逐年下滑（数字变大，竞争减弱）
  let trend = 0
  const trendPairs = Math.min(ranks.length - 1, trendWeights.length)
  for (let index = 0; index < trendPairs; index += 1) {
    trend += (ranks[index] - ranks[index + 1]) * trendWeights[index]
  }

  // 用 0.2 系数削弱趋势影响，再截断到历史最差值以内
  const rawPredicted = Math.round(baseline + trend * 0.2)
  const maxRank = Math.max(...ranks)
  const predictedRank = Math.max(1, Math.min(rawPredicted, maxRank))

  // 保留 rateChange 用于趋势标签（用排位占比计算，保持标签阈值兼容）
  const rateForYear = (year) => {
    const count = candidateCounts[record.subject]?.[year]
    return count ? record.ranks[year] / count : 0
  }
  const predictedRate = candidateCounts[record.subject]?.[2025]
    ? predictedRank / candidateCounts[record.subject][2025]
    : 0
  const latestRate = rateForYear(availableYears[0])
  const rateChange = availableYears.length > 1
    ? rateForYear(availableYears[0]) - rateForYear(availableYears[1])
    : 0

  return {
    predictedRate,
    predictedRank,
    latestRate,
    rateChange,
    dataYears: availableYears
  }
}

export function classifyRecord(userRank, predictedRank) {
  const diffRate = (Number(userRank || 0) - predictedRank) / predictedRank
  if (diffRate <= -0.05) return { level: '保', risk: '较低', diffRate }
  if (diffRate <= 0.05) return { level: '稳', risk: '中等', diffRate }
  if (diffRate <= 0.15) return { level: '冲', risk: '偏高', diffRate }
  return { level: '险', risk: '很高', diffRate }
}

export function trendLabel(rateChange) {
  if (rateChange < -0.002) return '明显升温'
  if (rateChange < 0) return '小幅升温'
  if (rateChange > 0.002) return '明显降温'
  if (rateChange > 0) return '小幅降温'
  return '基本稳定'
}

/**
 * Convert school detail data (from school-summary.json) into prediction result.
 * @param {Record<string, {min_score:number, min_rank:number}>} subjectData
 * @param {string} subject - "physics" | "history"
 * @returns {{ years: number[], ranks: number[], predictedRank: number, residuals: number[] } | null}
 */
export function forecastSchool(subjectData, subject) {
  const years = ['2024','2023','2022','2021']
    .filter(y => subjectData[y] && Number(subjectData[y].min_rank) > 0)
    .map(Number)
    .sort((a,b) => a - b)

  if (years.length === 0) return null

  // Build a fake record that forecastRecord can digest
  const ranks = {}
  years.forEach(y => { ranks[y] = subjectData[String(y)].min_rank })

  const record = { subject, ranks }

  const forecast = forecastRecord(record)
  const predictedRank = forecast.predictedRank

  // Compute per-year residual: residual = actual - predicted
  const residuals = years.map(y => ranks[y] - predictedRank)

  return {
    years,
    ranks: years.map(y => ranks[y]),
    predictedRank,
    predictedLabel: formatNumber(predictedRank),
    dataYears: forecast.dataYears,
    residuals,
    latestRate: forecast.latestRate,
    predictedRate: forecast.predictedRate,
    rateChange: forecast.rateChange,
  }
}
