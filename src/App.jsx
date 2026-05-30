import { useEffect, useMemo, useRef, useState } from 'react'

import { records as mockRecords, subjectLabels } from './data'
import { classifyRecord, forecastRecord, formatNumber } from './utils/predict'
import { adaptAdmissions, simplifyMajor } from './utils/adaptAdmissions'
import { useOfflineAdmissions } from './hooks/useOfflineAdmissions'
import { useScoreSegments } from './hooks/useScoreSegments'
import Login from './components/Login'
import Sidebar from './components/Sidebar'
import ResultColumn from './components/ResultColumn'
import FavoritesPage from './components/FavoritesPage'
import SchoolSearch, { SchoolDetail } from './components/SchoolSearch'
import { supabase } from './supabase'

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false)
  const [subject, setSubject] = useState('physics')
  const [score, setScore] = useState('580')
  const [rank, setRank] = useState('56000')
  const [city, setCity] = useState('不限')
  const [major, setMajor] = useState('不限')
  const [publicOnly, setPublicOnly] = useState(false)
  const [noCoop, setNoCoop] = useState(true)
  const [only985, setOnly985] = useState(false)
  const [only211, setOnly211] = useState(false)
  const [onlyDoubleFirstClass, setOnlyDoubleFirstClass] = useState(false)
  const [favorites, setFavorites] = useState([])
  const [showFavorites, setShowFavorites] = useState(false)
  const [exiting, setExiting] = useState(false)
  const [showSidebar, setShowSidebar] = useState(false)
  const [detailSchool, setDetailSchool] = useState(null)
  const [schoolMap, setSchoolMap] = useState({})
  const detailRef = useRef(null)

  useEffect(function () {
    if (detailSchool && detailRef.current) {
      detailRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [detailSchool])

  useEffect(function checkSession() {
    supabase.auth.getSession().then(function (result) {
      if (result.data.session) setLoggedIn(true)
    })

    var { data: listener } = supabase.auth.onAuthStateChange(function (event, session) {
      setLoggedIn(!!session)
    })

    return function () {
      if (listener && listener.subscription) listener.subscription.unsubscribe()
    }
  }, [])

  const offline = useOfflineAdmissions()
  const { lookupRank, status: segStatus } = useScoreSegments()

  useEffect(function autoFillRank() {
    if (segStatus === 'ready' && lookupRank) {
      var rankFromScore = lookupRank(subject, score)
      if (rankFromScore !== null) {
        setRank(String(rankFromScore))
      }
    }
  }, [subject, score, lookupRank, segStatus])

  useEffect(function loadSchoolMap() {
    fetch('/data/school-summary.json')
      .then(function (r) { return r.json() })
      .then(function (data) {
        var map = {}
        var list = Array.isArray(data.records) ? data.records : []
        list.forEach(function (s) { map[s.school] = s })
        setSchoolMap(map)
      })
      .catch(function () {})
  }, [])

  const sourceRecords = useMemo(() => {
    const adapted = adaptAdmissions(offline.records)
    return adapted.length > 0 ? adapted : mockRecords
  }, [offline.records])

  const rows = useMemo(() => {
    return sourceRecords
      .filter((item) => item.subject === subject)
      .filter((item) => city === '不限' || item.city === city)
      .filter((item) => major === '不限' || item.direction === major || item.major.includes(major))
      .filter((item) => !publicOnly || item.type === '公办')
      .filter((item) => !noCoop || !item.coop)
      .filter((item) => !only985 || item.is985)
      .filter((item) => !only211 || item.is211)
      .filter((item) => !onlyDoubleFirstClass || item.isDoubleFirstClass)
      .map((item) => ({ ...item, ...forecastRecord(item) }))
      .map((item) => ({ ...item, ...classifyRecord(rank, item.predictedRank) }))
      .sort((a, b) => a.predictedRank - b.predictedRank)
  }, [sourceRecords, subject, city, major, publicOnly, noCoop, only985, only211, onlyDoubleFirstClass, rank])

  // 按学校去重：同一所学校保留预测排位最好的那条（predictedRank 最小）
  const deduped = useMemo(function () {
    var seen = new Set()
    return rows.filter(function (item) {
      if (seen.has(item.school)) return false
      seen.add(item.school)
      return true
    })
  }, [rows])

  const grouped = {
    冲: deduped.filter((item) => item.level === '冲'),
    稳: deduped.filter((item) => item.level === '稳'),
    保: deduped.filter((item) => item.level === '保')
  }

  function toggleFavorite(item) {
    setFavorites(function (current) {
      var exists = current.some(function (entry) { return entry.school === item.school })
      if (exists) return current.filter(function (entry) { return entry.school !== item.school })
      return [...current, item]
    })
  }

  function removeFavorite(schoolName) {
    setFavorites((current) => current.filter(function (item) { return item.school !== schoolName }))
  }

  function reorderFavorites(fromIndex, toIndex) {
    setFavorites(function (current) {
      var copy = current.slice()
      var item = copy.splice(fromIndex, 1)[0]
      copy.splice(toIndex, 0, item)
      return copy
    })
  }

  function sortFavorites() {
    setFavorites(function (current) {
      var levelOrder = { '冲': 0, '稳': 1, '保': 2 }
      var copy = current.slice()
      copy.sort(function (a, b) {
        var la = levelOrder[a.level] ?? 9
        var lb = levelOrder[b.level] ?? 9
        if (la !== lb) return la - lb
        return (a.predictedRank || 999999) - (b.predictedRank || 999999)
      })
      return copy
    })
  }

  function clearFavorites() {
    setFavorites([])
  }

  var favoritedSet = useMemo(function () {
    return new Set(favorites.map(function (f) { return f.school }))
  }, [favorites])

  function isFavorited(schoolName) {
    return favoritedSet.has(schoolName)
  }

  function handleSelectSchool(schoolName) {
    var school = schoolMap[schoolName]
    if (school) setDetailSchool({ ...school, _name: schoolName })
  }

  // 当前查看院校的各专业历年数据（按专业组+专业分组）
  var detailMajors = useMemo(function () {
    if (!detailSchool || !detailSchool._name) return []
    var name = detailSchool._name
    var groups = new Map()
    for (var i = 0; i < sourceRecords.length; i++) {
      var r = sourceRecords[i]
      if (r.school !== name) continue
      var key = (r.subject || '') + '::' + simplifyMajor(r.major || '')
      if (!groups.has(key)) {
        groups.set(key, {
          subject: r.subject,
          group: r.group,
          major: r.major,
          direction: r.direction,
          ranks: { ...(r.ranks || {}) },
          scores: { ...(r.scores || {}) },
          predictedRank: r.predictedRank,
          predictedRate: r.predictedRate,
          level: r.level
        })
      } else {
        var existing = groups.get(key)
        if (r.ranks) {
          Object.keys(r.ranks).forEach(function (y) {
            if (!(y in existing.ranks) || r.ranks[y] < existing.ranks[y]) {
              existing.ranks[y] = r.ranks[y]
              if (r.scores && r.scores[y] != null) existing.scores[y] = r.scores[y]
            }
          })
        }
      }
    }
    return [...groups.values()].sort(function (a, b) {
      if (a.subject !== b.subject) return a.subject === 'physics' ? -1 : 1
      return (a.predictedRank || 999999) - (b.predictedRank || 999999)
    })
  }, [detailSchool, sourceRecords])

  if (!loggedIn) return <Login onLogin={() => setLoggedIn(true)} />

  return (
    <div className="app-shell">
      <Sidebar
        favorites={favorites}
        onRemoveFavorite={removeFavorite}
        onOpenFavorites={function () { setShowFavorites(true) }}
        onSelectSchool={handleSelectSchool}
        subject={subject}
        setSubject={setSubject}
        score={score}
        setScore={setScore}
        rank={rank}
        setRank={setRank}
        city={city}
        setCity={setCity}
        major={major}
        setMajor={setMajor}
        publicOnly={publicOnly}
        setPublicOnly={setPublicOnly}
        noCoop={noCoop}
        setNoCoop={setNoCoop}
        only985={only985}
        setOnly985={setOnly985}
        only211={only211}
        setOnly211={setOnly211}
        onlyDoubleFirstClass={onlyDoubleFirstClass}
        setOnlyDoubleFirstClass={setOnlyDoubleFirstClass}
        showSidebar={showSidebar}
        onCloseSidebar={function () { setShowSidebar(false) }}
      />

      <main className="workspace">
        <button className="hamburger-btn" onClick={function () { setShowSidebar(function (v) { return !v }) }} aria-label="展开筛选面板">
          ☰
        </button>
        <button
          className={'workspace-back' + (showFavorites || detailSchool ? ' visible' : '') + (exiting ? ' exiting' : '')}
          onClick={function () {
            setExiting(true)
            setTimeout(function () {
              setShowFavorites(false)
              setDetailSchool(null)
              setExiting(false)
            }, 160)
          }}
          title="返回"
          disabled={!(showFavorites || detailSchool) || exiting}
        >←</button>

        <div key={showFavorites ? 'fav' : (detailSchool ? 'detail' : 'main')} className={'workspace-content' + (exiting ? ' exiting' : '')}>
          {showFavorites ? (
            <FavoritesPage
              favorites={favorites}
              onRemove={removeFavorite}
              onReorder={reorderFavorites}
              onClear={clearFavorites}
              onSort={sortFavorites}
              onSelectSchool={handleSelectSchool}
              onFavorite={toggleFavorite}
              isFavorited={isFavorited}
            />
          ) : (
            <>
              <SchoolSearch onSelectSchool={function (schoolObj) { setDetailSchool({ ...schoolObj, _name: schoolObj.school }) }} onFavorite={toggleFavorite} isFavorited={isFavorited} />

              {detailSchool ? (
                <section className="detail-card" ref={detailRef}>
                  <div className="detail-card-head">
                    <h2>院校详情</h2>
                  </div>
                  <SchoolDetail school={detailSchool} majors={detailMajors} onClose={function () { setDetailSchool(null) }} />
                </section>
              ) : (
                <>
                  <header className="hero-card">
                    <div>
                      <p className="eyebrow">Offline Admissions Dataset</p>
                      <h2>冲稳保推荐工作台</h2>
                      <p>
                        {offline.status === 'ready'
                          ? `当前已接入离线 admissions.json，共加载 ${offline.records.length} 条原始记录。`
                          : '当前仍在使用 mock 数据。生成 admissions.json 后会自动切换为真实离线数据。'}
                      </p>
                    </div>

                    <div className="hero-metrics">
                      <div><span>科类</span><strong>{subjectLabels[subject]}</strong></div>
                      <div><span>排位</span><strong>{formatNumber(rank)}</strong></div>
                      <div><span>结果</span><strong>{rows.length}</strong></div>
                    </div>
                  </header>

                  <section className="model-card">
                    <p className="eyebrow">Weighted Residual Forecasting</p>
                    <h2>同科类排位占比 + 加权残差预测</h2>
                    <p>历年最低排位先除以当年同科类考生人数，得到排位占比。再用最近一年为主的加权平均作为基准，叠加保守趋势修正。数据不足四年时，系统会自动按可用年份重算权重。</p>
                    <div className="model-steps">
                      <span>基准 0.78 / 0.14 / 0.06 / 0.02</span>
                      <span>趋势 0.80 / 0.15 / 0.05</span>
                      <span>修正系数 0.20</span>
                      <span>冲稳保界限 5%</span>
                    </div>
                  </section>

                  <section className="result-grid">
                    <ResultColumn title="冲" items={grouped.冲} onSelectSchool={handleSelectSchool} onFavorite={toggleFavorite} isFavorited={isFavorited} />
                    <ResultColumn title="稳" items={grouped.稳} onSelectSchool={handleSelectSchool} onFavorite={toggleFavorite} isFavorited={isFavorited} />
                    <ResultColumn title="保" items={grouped.保} onSelectSchool={handleSelectSchool} onFavorite={toggleFavorite} isFavorited={isFavorited} />
                  </section>
                </>
              )}
            </>
          )}
        </div>

      </main>
    </div>
  )
}
