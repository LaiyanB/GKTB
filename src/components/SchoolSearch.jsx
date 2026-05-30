import React, { useEffect, useMemo, useRef, useState, useDeferredValue } from 'react'
import { formatNumber, forecastSchool } from '../utils/predict'

const SUBJECT_LABELS = { physics: '物理类', history: '历史类' }

/* ── badges ── */
function SchoolBadges({ school }) {
  const tags = []
  if (school.is_985) tags.push('985')
  if (school.is_211) tags.push('211')
  if (school.is_double_first_class) tags.push('双一流')
  if (!tags.length) return null
  return (
    <div className="sch-badges">
      {tags.map(function (t) { return <span key={t} className="sch-badge">{t}</span> })}
    </div>
  )
}

/* ── animated rank chart (pure SVG) ── */
function SchoolRankChart({ subjectData, subject }) {
  const prediction = useMemo(() => forecastSchool(subjectData, subject), [subjectData, subject])
  const [step, setStep] = useState(0)
  const [showPrediction, setShowPrediction] = useState(false)

  // Staggered reveal: dot → line → dot → line → ... → prediction
  // step 1 = dot[0], step 2 = line[0→1], step 3 = dot[1], step 4 = line[1→2], ...
  useEffect(() => {
    setStep(0)
    setShowPrediction(false)
    if (!prediction) return
    const n = prediction.years.length
    if (n === 0) return
    const totalSteps = n * 2 - 1
    let timers = []
    for (let s = 1; s <= totalSteps; s++) {
      timers.push(setTimeout(() => setStep(s), s * 250))
    }
    timers.push(setTimeout(() => setShowPrediction(true), (totalSteps + 1) * 250 + 300))
    return () => timers.forEach(clearTimeout)
  }, [prediction])

  if (!prediction) {
    return <p className="sch-empty">暂无排位数据，无法生成图表</p>
  }

  const { years, ranks, predictedRank, residuals } = prediction
  if (years.length === 0) {
    return <p className="sch-empty">暂无排位数据，无法生成图表</p>
  }

  /* ── chart geometry ── */
  const VIEW = { W: 600, H: 380, L: 88, R: 40, T: 20, B: 50 }
  const PLOT = { W: VIEW.W - VIEW.L - VIEW.R, H: VIEW.H - VIEW.T - VIEW.B }
  const X_OFFSET = VIEW.L
  const Y_OFFSET = VIEW.T

  const ALL_X = [2021, 2022, 2023, 2024, 2025].map((_, i) =>
    X_OFFSET + (i / 4) * PLOT.W
  )

  const allRanks = [...ranks, predictedRank]
  const rawMin = Math.min(...allRanks)
  const rawMax = Math.max(...allRanks)
  const pad = Math.max(Math.round((rawMax - rawMin) * 0.15), 500)
  const paddedMin = Math.max(0, rawMin - pad)
  const paddedMax = rawMax + pad
  const range = paddedMax - paddedMin || 1

  const toY = (r) => Y_OFFSET + (1 - (r - paddedMin) / range) * PLOT.H

  const YEAR_SLOTS = [2021, 2022, 2023, 2024, 2025]
  const dots = years.map((y, idx) => {
    const rank = ranks[years.indexOf(y)]
    const residual = residuals[years.indexOf(y)]
    const slotIndex = YEAR_SLOTS.indexOf(y)
    // dot[i] visible when step >= i*2 + 1
    const visible = step >= idx * 2 + 1
    return {
      year: y,
      rank,
      residual,
      x: ALL_X[slotIndex >= 0 ? slotIndex : 0],
      y: toY(rank),
      visible,
    }
  })

  const predX = ALL_X[4]
  const predY = toY(predictedRank)

  const yTickCount = 5
  const rawStep = (paddedMax - paddedMin) / yTickCount
  const magnitude = rawStep > 0 ? Math.pow(10, Math.floor(Math.log10(rawStep))) : 1
  const yStep = Math.max(1, Math.round(rawStep / magnitude)) * magnitude
  const yTicks = []
  for (let v = Math.ceil(paddedMin / yStep) * yStep; v <= paddedMax; v += yStep) {
    yTicks.push(v)
  }

  // line segments: segment[i] connects dot[i] → dot[i+1]
  // segment[i] visible when step >= (i+1) * 2
  const segments = []
  for (let i = 0; i < dots.length - 1; i++) {
    segments.push({
      x1: dots[i].x, y1: dots[i].y,
      x2: dots[i + 1].x, y2: dots[i + 1].y,
      visible: step >= (i + 1) * 2,
    })
  }

  /* ── render ── */
  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${VIEW.W} ${VIEW.H}`} className="rank-chart" xmlns="http://www.w3.org/2000/svg">
        {/* axes */}
        <line x1={X_OFFSET} y1={Y_OFFSET} x2={X_OFFSET} y2={Y_OFFSET + PLOT.H} stroke="#d8cfbe" strokeWidth="1" />
        <line x1={X_OFFSET} y1={Y_OFFSET + PLOT.H} x2={X_OFFSET + PLOT.W} y2={Y_OFFSET + PLOT.H} stroke="#d8cfbe" strokeWidth="1" />

        {/* Y grid lines + labels */}
        {yTicks.map((v) => {
          const y = toY(v)
          return (
            <g key={v}>
              <line x1={X_OFFSET} y1={y} x2={X_OFFSET + PLOT.W} y2={y} stroke="#e8e0d4" strokeWidth="1" strokeDasharray="4,4" />
              <text x={X_OFFSET - 8} y={y + 4} textAnchor="end" className="chart-axis-label">{formatNumber(v)}</text>
            </g>
          )
        })}

        {/* X labels */}
        {YEAR_SLOTS.map((year, i) => {
          const x = ALL_X[i]
          const isPred = i === 4
          return (
            <text key={year} x={x} y={Y_OFFSET + PLOT.H + 18} textAnchor="middle" className={'chart-year-label' + (isPred ? ' pred' : '')}>
              {year}{isPred ? ' (预测)' : ''}
            </text>
          )
        })}

        {/* individual line segments: dot[i] → dot[i+1] */}
        {segments.map((seg, i) => (
          <line
            key={'seg-' + i}
            x1={seg.x1} y1={seg.y1}
            x2={seg.x2} y2={seg.y2}
            stroke="#537d96" strokeWidth="2" strokeLinecap="round"
            className={seg.visible ? 'chart-seg visible' : 'chart-seg'}
          />
        ))}

        {/* prediction segment: last historical dot → 2025 prediction */}
        {showPrediction && dots.length > 0 && (
          <line
            x1={dots[dots.length - 1].x} y1={dots[dots.length - 1].y}
            x2={predX} y2={predY}
            stroke="#8b2c1f" strokeWidth="2" strokeDasharray="6,4" strokeLinecap="round"
            className="chart-pred-seg"
          />
        )}

        {/* historical data points */}
        {dots.map((d, i) => (
          <g key={'dot-' + i} className={d.visible ? 'chart-point visible' : 'chart-point'}>
            <circle cx={d.x} cy={d.y} r="6" fill="#537d96" stroke="#fff" strokeWidth="2" />
            <text x={d.x} y={d.y - 12} textAnchor="middle" className="chart-rank-label">
              {formatNumber(d.rank)}
            </text>
          </g>
        ))}

        {/* prediction point (with glow) */}
        {showPrediction && (
          <g className="chart-pred-point">
            <circle cx={predX} cy={predY} r="16" fill="none" stroke="#8b2c1f" strokeWidth="2" className="pred-point-glow" />
            <circle cx={predX} cy={predY} r="12" fill="none" stroke="#8b2c1f" strokeWidth="1.5" opacity="0.3" className="pred-point-glow" />
            <circle cx={predX} cy={predY} r="7" fill="#8b2c1f" stroke="#fff" strokeWidth="2.5" />
            <g className="pred-callout">
              <rect
                x={predX - 52}
                y={predY - 38}
                width="104"
                height="22"
                rx="4"
                fill="#8b2c1f"
              />
              <text x={predX} y={predY - 23} textAnchor="middle" fill="#fff" fontSize="11" fontWeight="600">
                预测 {formatNumber(predictedRank)} 名
              </text>
            </g>
          </g>
        )}

        {/* Y axis title */}
        <text x={14} y={Y_OFFSET + PLOT.H / 2} textAnchor="middle" className="chart-axis-title"
          transform={`rotate(-90, 14, ${Y_OFFSET + PLOT.H / 2})`}>
          最低排位
        </text>
      </svg>

      {/* data reference table below chart */}
      <div className="chart-table-wrap">
        <table className="sch-table">
          <thead>
            <tr>
              <th>年份</th>
              <th>最低分</th>
              <th>最低排位</th>
            </tr>
          </thead>
          <tbody>
            {[2024, 2023, 2022, 2021].map(y => {
              var d = subjectData[String(y)]
              return (
                <tr key={y}>
                  <td>{y}</td>
                  <td>{d && d.min_score ? d.min_score : '-'}</td>
                  <td>{d && d.min_rank ? formatNumber(d.min_rank) : '-'}</td>
                </tr>
              )
            })}
            <tr className="pred-row">
              <td>2025 (预测)</td>
              <td>-</td>
              <td><strong>{formatNumber(predictedRank)}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ── school detail panel ── */
function SchoolDetail({ school, onClose, majors }) {
  var majorList = majors || []

  // Collect available subjects from majors data
  var availableSubjects = useMemo(function () {
    var set = new Set()
    for (var i = 0; i < majorList.length; i++) { set.add(majorList[i].subject) }
    return [...set].sort()
  }, [majorList])

  var [activeSubject, setActiveSubject] = useState(
    availableSubjects.indexOf('physics') !== -1 ? 'physics' : (availableSubjects[0] || 'physics')
  )

  useEffect(function () {
    if (availableSubjects.length > 0) {
      setActiveSubject(availableSubjects.indexOf('physics') !== -1 ? 'physics' : availableSubjects[0])
    }
  }, [availableSubjects.join(',')])

  var filteredMajors = useMemo(function () {
    return majorList.filter(function (m) { return m.subject === activeSubject })
  }, [majorList, activeSubject])

  var years = ['2024', '2023', '2022', '2021']
  var [expandedMajor, setExpandedMajor] = useState(null)

  return (
    <div className="sch-detail">
      <div className="sch-detail-head">
        <div>
          <h4>{school.school}</h4>
          <p className="sch-meta">
            {school.province}{school.city ? ' · ' + school.city : ''}
          </p>
          <SchoolBadges school={school} />
        </div>
      </div>

      {availableSubjects.length > 1 && (
        <div className="sch-tabs">
          {availableSubjects.map(function (subj) {
            return (
              <button
                key={subj}
                className={'sch-tab' + (subj === activeSubject ? ' active' : '')}
                onClick={function () { setActiveSubject(subj) }}
              >
                {SUBJECT_LABELS[subj]}
              </button>
            )
          })}
        </div>
      )}

      {/* 动态排位趋势图 */}
      {school.subjects && school.subjects[activeSubject] && (
        <SchoolRankChart subjectData={school.subjects[activeSubject]} subject={activeSubject} />
      )}

      {filteredMajors.length === 0 && (
        <p className="sch-empty">暂无{SUBJECT_LABELS[activeSubject]}专业数据</p>
      )}

      {filteredMajors.length > 0 && (
        <div className="sch-majors-table-wrap">
          <p className="sch-section-label">各专业历年排位</p>
          <table className="sch-table sch-majors-table">
            <thead>
              <tr>
                <th>专业</th>
                {years.map(function (y) { return <th key={y}>{y} 分数 / 排位</th> })}
                <th>预测排位</th>
                <th>分层</th>
              </tr>
            </thead>
            <tbody>
              {filteredMajors.map(function (m, idx) {
                var majorSubjectData = {}
                Object.keys(m.ranks || {}).forEach(function (y) { majorSubjectData[y] = { min_rank: m.ranks[y] } })
                var isExpanded = expandedMajor === idx
                return (
                  <React.Fragment key={idx}>
                    <tr onClick={function () { setExpandedMajor(isExpanded ? null : idx) }} style={{ cursor: 'pointer' }} className={isExpanded ? 'major-row-expanded' : ''}>
                      <td>{m.major}</td>
                      {years.map(function (y) {
                        var r = m.ranks[y]
                        var s = m.scores && m.scores[y]
                        return <td key={y}>{r ? (s ? s + ' / ' + formatNumber(r) : formatNumber(r)) : (s || '-')}</td>
                      })}
                      <td><strong>{m.predictedRank ? formatNumber(m.predictedRank) : '-'}</strong></td>
                      <td><span className={'badge ' + (m.level || '稳')}>{m.level || '-'}</span></td>
                    </tr>
                    {isExpanded && (
                      <tr className="major-chart-row">
                        <td colSpan={7} style={{ padding: 0 }}>
                          <SchoolRankChart subjectData={majorSubjectData} subject={m.subject} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export { SchoolBadges, SchoolDetail }

// Memoized single result row — avoids re-rendering all rows on each keystroke
var SchoolResultItem = (function () {
  function SchoolResultItem({ school, onSelect, onFavorite, isFavorited }) {
    var favorited = isFavorited ? isFavorited(school.school) : false
    var subjKeys = Object.keys(school.subjects || {})
    var hasPhy = subjKeys.indexOf('physics') !== -1
    var hasHis = subjKeys.indexOf('history') !== -1
    var latestYear = '2024'
    var physicsData = hasPhy && school.subjects.physics[latestYear]
    var historyData = hasHis && school.subjects.history[latestYear]

    return (
      <div className="sch-result-item" onClick={function () { onSelect(school) }}>
        <div className="sch-result-top">
          <strong>{school.school}</strong>
          <div className="sch-result-top-right">
            {onFavorite && (
              <button className={'fav-btn-sm' + (favorited ? ' favorited' : '')} onClick={function (e) { e.stopPropagation(); onFavorite(school) }} title={favorited ? '已加入自选院校' : '加入自选院校'}>{favorited ? '★' : '☆'}</button>
            )}
            <span className="sch-city">{school.province}{school.city ? ' ' + school.city : ''}</span>
          </div>
        </div>
        <div className="sch-result-tags">
          <SchoolBadges school={school} />
        </div>
        <div className="sch-result-lines">
          {hasPhy && physicsData && (
            <span className="sch-line">物理 {physicsData.min_score || '-'}分 / {physicsData.min_rank ? formatNumber(physicsData.min_rank) : '-'}名</span>
          )}
          {hasHis && historyData && (
            <span className="sch-line">历史 {historyData.min_score || '-'}分 / {historyData.min_rank ? formatNumber(historyData.min_rank) : '-'}名</span>
          )}
        </div>
      </div>
    )
  }
  return SchoolResultItem
})()

export default function SchoolSearch({ onSelectSchool, onFavorite, isFavorited }) {
  var [schools, setSchools] = useState([])
  var [query, setQuery] = useState('')
  var inputRef = useRef(null)
  var [loaded, setLoaded] = useState(false)

  // Pre-built search index: lowercase name strings for O(1) char access
  var lowerNames = useRef([])

  useEffect(function () {
    var alive = true
    async function load() {
      try {
        var res = await fetch('/data/school-summary.json')
        if (!res.ok) throw new Error('school-summary not found')
        var payload = await res.json()
        var list = Array.isArray(payload.records) ? payload.records : []
        if (alive) {
          setSchools(list)
          lowerNames.current = list.map(function (s) { return s.school.toLowerCase() })
        }
      } catch (_) { /* silent */ }
      if (alive) setLoaded(true)
    }
    load()
    return function () { alive = false }
  }, [])

  // React 18 concurrent: defer the expensive filtering so input stays responsive
  var deferredQuery = useDeferredValue(query)

  var results = useMemo(function () {
    var q = deferredQuery.trim().toLowerCase()
    if (!q) return []
    var names = lowerNames.current
    var out = []
    for (var i = 0; i < names.length && out.length < 10; i++) {
      if (names[i].indexOf(q) !== -1) out.push(schools[i])
    }
    return out
  }, [deferredQuery, schools])

  function handleSelect(school) {
    setQuery('')
    if (onSelectSchool) onSelectSchool(school)
  }

  return (
    <div className="panel sch-panel">
      <div className="panel-title"><span>03</span><h2>搜索院校</h2></div>
      <div className="sch-search-wrap">
        <input
          ref={inputRef}
          className="sch-input"
          type="text"
          placeholder="输入院校名称…"
          value={query}
          onChange={function (e) { setQuery(e.target.value) }}
        />

        {!loaded && <p className="sch-loading">加载中…</p>}

        {loaded && deferredQuery && results.length === 0 && (
          <p className="sch-empty">未找到匹配院校</p>
        )}

        {results.length > 0 && (
          <div className="sch-results">
            {results.map(function (s) {
              return <SchoolResultItem key={s.school} school={s} onSelect={handleSelect} onFavorite={onFavorite} isFavorited={isFavorited} />
            })}
          </div>
        )}
      </div>
    </div>
  )
}