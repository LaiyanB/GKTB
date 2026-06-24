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
export function computeTrend(yearRanks, dataYears) {
  var years = (dataYears && dataYears.length >= 2)
    ? dataYears.slice().sort(function (a, b) { return b - a })
    : Object.keys(yearRanks).map(Number).sort(function (a, b) { return b - a })
  if (years.length < 2) return { direction: 'flat', diff: 0, label: '数据不足' }

  var latest = Number(yearRanks[years[0]])
  var prev = Number(yearRanks[years[1]])
  if (!latest || !prev) return { direction: 'flat', diff: 0, label: '→ 基本稳定' }
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

  const ranks = availableYears.map((year) => record.ranks[year])
  const weights = normalizeWeights(baselineWeights, ranks.length)
  const baseline = ranks.reduce((sum, current, index) => sum + current * weights[index], 0)

  let trend = 0
  const trendPairs = Math.min(ranks.length - 1, trendWeights.length)
  for (let index = 0; index < trendPairs; index += 1) {
    trend += (ranks[index] - ranks[index + 1]) * trendWeights[index]
  }

  const predictedRank = Math.max(1, Math.round(baseline + trend * 0.2))

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
  const diffRate = (Number(userRank || 0) - predictedRank) / Math.max(predictedRank, 1)
  const minP = 0.05, maxP = 0.95, k = 3.0
  const prob = minP + (maxP - minP) / (1 + Math.exp(k * diffRate))
  const probability = Math.round(prob * 100)

  if (diffRate <= -0.25) return { level: '保', risk: '较低', diffRate, probability }
  if (diffRate <= 0.25) return { level: '稳', risk: '中等', diffRate, probability }
  return { level: '冲', risk: '偏高', diffRate, probability }
}

export function trendLabel(rateChange) {
  if (rateChange < -0.002) return '明显升温'
  if (rateChange < 0) return '小幅升温'
  if (rateChange > 0.002) return '明显降温'
  if (rateChange > 0) return '小幅降温'
  return '基本稳定'
}

export function forecastSchool(subjectData, subject) {
  const years = ['2024','2023','2022','2021']
    .filter(y => subjectData[y] && Number(subjectData[y].min_rank) > 0)
    .map(Number)
    .sort((a,b) => a - b)

  if (years.length === 0) return null

  const ranks = {}
  years.forEach(y => { ranks[y] = subjectData[String(y)].min_rank })

  const record = { subject, ranks }

  const forecast = forecastRecord(record)
  const predictedRank = forecast.predictedRank

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
