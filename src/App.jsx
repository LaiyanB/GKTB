import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, SlidersHorizontal, BarChart3, ClipboardList, Lightbulb } from 'lucide-react'

import { records as mockRecords, subjectLabels } from './data'
import { classifyRecord, forecastRecord, formatNumber } from './utils/predict'
import { matchesElectives } from './utils/electives'
import { adaptAdmissions } from './utils/adaptAdmissions'
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
  const [major, setMajor] = useState('')
  const [publicOnly, setPublicOnly] = useState(false)
  const [noCoop, setNoCoop] = useState(true)
  const [only985, setOnly985] = useState(false)
  const [only211, setOnly211] = useState(false)
  const [onlyDoubleFirstClass, setOnlyDoubleFirstClass] = useState(false)
  const [electives, setElectives] = useState([])
  const [favorites, setFavorites] = useState([])
  const [user, setUser] = useState(null)
  const [showFavorites, setShowFavorites] = useState(false)
  const [exiting, setExiting] = useState(false)
  const [showSidebar, setShowSidebar] = useState(false)
  const [detailSchool, setDetailSchool] = useState(null)
  const [schoolMap, setSchoolMap] = useState({})
  const [activeTab, setActiveTab] = useState('冲')
  const detailRef = useRef(null)
  const resultGridRef = useRef(null)
  const rankManuallyEdited = useRef(false)
  const prevRank = useRef(rank)

  // 从 Supabase 加载当前用户的收藏
  async function loadUserFavorites() {
    try {
      var { data, error } = await supabase.auth.getUser()
      if (error || !data.user) return
      setUser(data.user)
      var fav = await supabase.from('favorites').select('*').eq('user_id', data.user.id)
      if (fav.data && fav.data.length > 0) {
        setFavorites(fav.data)
      } else {
        // 尝试从 localStorage 恢复
        try {
          var saved = localStorage.getItem('favorites')
          if (saved) {
            var parsed = JSON.parse(saved)
            if (Array.isArray(parsed) && parsed.length > 0) {
              setFavorites(parsed)
              syncFavoritesToSupabase(data.user.id, parsed)
            }
          }
        } catch (e) {
          console.warn('localStorage 收藏数据读取失败，已忽略', e)
          localStorage.removeItem('favorites')
        }
      }
    } catch (e) {
      console.error('加载收藏失败', e)
    }
  }

  async function syncFavoritesToSupabase(uid, items) {
    // 删除旧的，插入新的
    await supabase.from('favorites').delete().eq('user_id', uid)
    if (items.length > 0) {
      var rows = items.map(function (f) { return {
        user_id: uid,
        school: f.school,
        major: f.major || null,
        level: f.level || null,
        note: f.note || null
      }})
      await supabase.from('favorites').insert(rows)
    }
  }

  // 收藏变动时保存到 localStorage + Supabase
  useEffect(function () {
    localStorage.setItem('favorites', JSON.stringify(favorites))
    if (user) {
      syncFavoritesToSupabase(user.id, favorites)
    }
  }, [favorites, user])

  useEffect(function () {
    if (detailSchool && detailRef.current) {
      detailRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [detailSchool])

  useEffect(function checkSession() {
    supabase.auth.getSession().then(function (result) {
      if (result.data.session) { setLoggedIn(true); loadUserFavorites() }
    })

    var { data: listener } = supabase.auth.onAuthStateChange(function (event, session) {
      setLoggedIn(!!session)
      if (session) loadUserFavorites()
    })

    return function () {
      if (listener && listener.subscription) listener.subscription.unsubscribe()
    }
  }, [])

  const offline = useOfflineAdmissions()
  const { lookupRank, status: segStatus } = useScoreSegments()

  useEffect(function autoFillRank() {
    rankManuallyEdited.current = false
    if (segStatus === 'ready' && lookupRank) {
      var rankFromScore = lookupRank(subject, score)
      if (rankFromScore !== null) {
        setRank(String(rankFromScore))
      }
    }
  }, [subject, score, lookupRank, segStatus])

  useEffect(function scrollToResultsOnRankChange() {
    if (prevRank.current !== rank && window.innerWidth <= 640 && resultGridRef.current) {
      resultGridRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    prevRank.current = rank
  }, [rank])

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
      .filter((item) => !major || item.direction.includes(major) || item.major.includes(major))
      .filter((item) => matchesElectives(item.requirement, electives))
      .filter((item) => !publicOnly || item.type === '公办')
      .filter((item) => !noCoop || !item.coop)
      .filter((item) => !only985 || item.is985)
      .filter((item) => !only211 || item.is211)
      .filter((item) => !onlyDoubleFirstClass || item.isDoubleFirstClass)
      .map((item) => ({ ...item, ...forecastRecord(item) }))
      .map((item) => ({ ...item, ...classifyRecord(rank, item.predictedRank) }))
      .sort((a, b) => a.predictedRank - b.predictedRank)
  }, [sourceRecords, subject, city, major, electives, publicOnly, noCoop, only985, only211, onlyDoubleFirstClass, rank])

  // 按学校去重：同一所学校优先保留数据年份最多的记录，年份相同时保留预测排位最好的
  const deduped = useMemo(function () {
    var best = new Map()
    rows.forEach(function (item) {
      var existing = best.get(item.school)
      if (!existing) {
        best.set(item.school, item)
        return
      }
      var existingYears = (existing.dataYears || []).length
      var currentYears = (item.dataYears || []).length
      if (currentYears > existingYears) {
        best.set(item.school, item)
      } else if (currentYears === existingYears && item.predictedRank < existing.predictedRank) {
        best.set(item.school, item)
      }
    })
    return [...best.values()].sort(function (a, b) {
      return a.predictedRank - b.predictedRank
    })
  }, [rows])

  const grouped = {
    冲: deduped.filter((item) => item.level === '冲'),
    稳: deduped.filter((item) => item.level === '稳'),
    保: deduped.filter((item) => item.level === '保')
  }

  function toggleFavorite(item) {
    setFavorites(function (current) {
      var exists = current.some(function (entry) { return entry.school === item.school && entry.major === item.major })
      if (exists) return current.filter(function (entry) { return !(entry.school === item.school && entry.major === item.major) })
      return [...current, { school: item.school, major: item.major || '', level: item.level, note: item.note }]
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
    var out = []
    for (var i = 0; i < sourceRecords.length; i++) {
      var r = sourceRecords[i]
      if (r.school !== name) continue
      var f = forecastRecord(r)
      var c = classifyRecord(rank, f.predictedRank)
      out.push({
        subject: r.subject,
        group: r.group,
        major: r.major,
        direction: r.direction,
        ranks: { ...(r.ranks || {}) },
        scores: { ...(r.scores || {}) },
        predictedRank: f.predictedRank,
        predictedRate: f.predictedRate,
        level: c.level
      })
    }
    return out.sort(function (a, b) {
      if (a.subject !== b.subject) return a.subject === 'physics' ? -1 : 1
      return (a.predictedRank || 999999) - (b.predictedRank || 999999)
    })
  }, [detailSchool, sourceRecords, rank])

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
        onRankManualEdit={function () { rankManuallyEdited.current = true }}
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
        electives={electives}
        setElectives={setElectives}
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
                  {/* 引导卡片 */}
                  <section className="guide-card">
                    <div className="guide-card-icon"><Lightbulb size={22} /></div>
                    <div className="guide-card-body">
                      <p className="eyebrow">Quick Start</p>
                      <h2>开始使用 — 四步搞定志愿方案</h2>
                      <p>填写考生信息 → 筛选目标院校 → 查看冲稳保推荐 → 生成志愿草案</p>
                    </div>
                    <div className="guide-steps">
                      <div className="guide-step">
                        <div className="guide-step-icon"><Search size={18} /></div>
                        <div className="guide-step-text">
                          <strong>填写信息</strong>
                          <span>科类、分数、排位</span>
                        </div>
                      </div>
                      <div className="guide-step-arrow">→</div>
                      <div className="guide-step">
                        <div className="guide-step-icon"><SlidersHorizontal size={18} /></div>
                        <div className="guide-step-text">
                          <strong>筛选院校</strong>
                          <span>城市、专业、标签</span>
                        </div>
                      </div>
                      <div className="guide-step-arrow">→</div>
                      <div className="guide-step">
                        <div className="guide-step-icon"><BarChart3 size={18} /></div>
                        <div className="guide-step-text">
                          <strong>冲稳保分析</strong>
                          <span>自动计算推荐</span>
                        </div>
                      </div>
                      <div className="guide-step-arrow">→</div>
                      <div className="guide-step">
                        <div className="guide-step-icon"><ClipboardList size={18} /></div>
                        <div className="guide-step-text">
                          <strong>生成草案</strong>
                          <span>收藏 · 排序 · 导出</span>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* 示例预览 */}
                  <section className="preview-card">
                    <p className="eyebrow">Example Preview</p>
                    <h2>推荐结果预览</h2>
                    <p>下方为系统根据您的排位自动推荐的冲稳保院校样式示意：</p>
                    <div className="preview-grid">
                      <div className="preview-col">
                        <div className="preview-col-head">
                          <span className="badge 冲">冲</span>
                          <span className="preview-col-label">略有挑战</span>
                        </div>
                        <div className="preview-item" onClick={function () { handleSelectSchool('华南理工大学') }}>
                          <div className="preview-item-top">
                            <span className="preview-school">华南理工大学</span>
                            <span className="preview-tag">211</span>
                          </div>
                          <p className="preview-major">计算机科学与技术 · 广州市</p>
                          <div className="preview-metrics">
                            <span>预测排位 <strong>32,000</strong></span>
                            <span>排位占比 4.2%</span>
                          </div>
                        </div>
                      </div>
                      <div className="preview-col">
                        <div className="preview-col-head">
                          <span className="badge 稳">稳</span>
                          <span className="preview-col-label">比较稳妥</span>
                        </div>
                        <div className="preview-item" onClick={function () { handleSelectSchool('广东工业大学') }}>
                          <div className="preview-item-top">
                            <span className="preview-school">广东工业大学</span>
                            <span className="preview-tag">公办</span>
                          </div>
                          <p className="preview-major">软件工程 · 广州市</p>
                          <div className="preview-metrics">
                            <span>预测排位 <strong>48,000</strong></span>
                            <span>排位占比 3.1%</span>
                          </div>
                        </div>
                      </div>
                      <div className="preview-col">
                        <div className="preview-col-head">
                          <span className="badge 保">保</span>
                          <span className="preview-col-label">稳妥保底</span>
                        </div>
                        <div className="preview-item" onClick={function () { handleSelectSchool('广州大学') }}>
                          <div className="preview-item-top">
                            <span className="preview-school">广州大学</span>
                            <span className="preview-tag">公办</span>
                          </div>
                          <p className="preview-major">电子信息工程 · 广州市</p>
                          <div className="preview-metrics">
                            <span>预测排位 <strong>62,000</strong></span>
                            <span>排位占比 2.3%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="result-grid" ref={resultGridRef}>
                    {/* 手机端标签页导航 */}
                    <div className="mobile-tabs">
                      <button 
                        className={`mobile-tab ${activeTab === '冲' ? 'active' : ''}`}
                        onClick={() => setActiveTab('冲')}
                      >
                        <span className="badge 冲">冲</span>
                        <span className="mobile-tab-count">{grouped.冲.length}</span>
                      </button>
                      <button 
                        className={`mobile-tab ${activeTab === '稳' ? 'active' : ''}`}
                        onClick={() => setActiveTab('稳')}
                      >
                        <span className="badge 稳">稳</span>
                        <span className="mobile-tab-count">{grouped.稳.length}</span>
                      </button>
                      <button 
                        className={`mobile-tab ${activeTab === '保' ? 'active' : ''}`}
                        onClick={() => setActiveTab('保')}
                      >
                        <span className="badge 保">保</span>
                        <span className="mobile-tab-count">{grouped.保.length}</span>
                      </button>
                    </div>
                    
                    {/* 桌面端三列布局 */}
                    <div className="desktop-columns">
                      <ResultColumn title="冲" items={grouped.冲} onSelectSchool={handleSelectSchool} onFavorite={toggleFavorite} isFavorited={isFavorited} />
                      <ResultColumn title="稳" items={grouped.稳} onSelectSchool={handleSelectSchool} onFavorite={toggleFavorite} isFavorited={isFavorited} />
                      <ResultColumn title="保" items={grouped.保} onSelectSchool={handleSelectSchool} onFavorite={toggleFavorite} isFavorited={isFavorited} />
                    </div>
                    
                    {/* 手机端单列布局 */}
                    <div className="mobile-column">
                      {activeTab === '冲' && <ResultColumn title="冲" items={grouped.冲} onSelectSchool={handleSelectSchool} onFavorite={toggleFavorite} isFavorited={isFavorited} />}
                      {activeTab === '稳' && <ResultColumn title="稳" items={grouped.稳} onSelectSchool={handleSelectSchool} onFavorite={toggleFavorite} isFavorited={isFavorited} />}
                      {activeTab === '保' && <ResultColumn title="保" items={grouped.保} onSelectSchool={handleSelectSchool} onFavorite={toggleFavorite} isFavorited={isFavorited} />}
                    </div>
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
