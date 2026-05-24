import { useEffect, useState } from 'react'

/**
 * 一分一段表 hook — 加载 score-segments.json 并提供按科类和分数查排位的功能。
 */
export function useScoreSegments() {
  const [segments, setSegments] = useState([])
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    let alive = true

    async function load() {
      try {
        const res = await fetch('/data/score-segments.json')
        if (!res.ok) throw new Error('score-segments not found: ' + res.status)
        const payload = await res.json()
        const list = Array.isArray(payload.records) ? payload.records : []
        if (alive) {
          setSegments(list)
          setStatus(list.length > 0 ? 'ready' : 'empty')
        }
      } catch (err) {
        if (alive) {
          setStatus('fallback')
        }
      }
    }

    load()
    return () => { alive = false }
  }, [])

  /**
   * 根据科类和分数查找最新年份的累计排位。
   * @param {string} subject - 'physics' | 'history'
   * @param {string|number} score
   * @returns {number|null}
   */
  function lookupRank(subject, score) {
    if (!segments.length || !score) return null

    const numericScore = Number(score)
    if (isNaN(numericScore)) return null

    const subjectRecords = segments.filter(function (r) { return r.subject === subject })
    if (!subjectRecords.length) return null

    var latestYear = 0
    for (var i = 0; i < subjectRecords.length; i++) {
      if (subjectRecords[i].year > latestYear) latestYear = subjectRecords[i].year
    }

    var yearRecords = subjectRecords.filter(function (r) { return r.year === latestYear })
    yearRecords.sort(function (a, b) { return b.score - a.score })

    for (var i = 0; i < yearRecords.length; i++) {
      if (yearRecords[i].score === numericScore) return yearRecords[i].cumulative
    }

    if (numericScore > yearRecords[0].score) return yearRecords[0].cumulative
    if (numericScore < yearRecords[yearRecords.length - 1].score) return yearRecords[yearRecords.length - 1].cumulative

    for (var i = 0; i < yearRecords.length; i++) {
      if (yearRecords[i].score <= numericScore) return yearRecords[i].cumulative
    }

    return null
  }

  return { lookupRank, status }
}
