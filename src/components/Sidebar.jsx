import { candidateCounts, cityOptions, majorOptions, subjectLabels } from '../data'
import { formatNumber } from '../utils/predict'
import SchoolSearch from './SchoolSearch'

export default function Sidebar(props) {
  return (
    <aside className="sidebar">
      <div className="title-block">
        <div className="seal small">粤</div>
        <p className="eyebrow">Application Console</p>
        <h1>广东省高考志愿填报指南</h1>
        <p>先把筛选、预测解释和志愿草案流程做扎实。</p>
      </div>

      <section className="panel">
        <div className="panel-title"><span>01</span><h2>考生信息</h2></div>
        <label>科类</label>
        <select value={props.subject} onChange={(event) => props.setSubject(event.target.value)}>
          <option value="physics">物理类</option>
          <option value="history">历史类</option>
        </select>
        <label>高考分数</label>
        <input value={props.score} onChange={(event) => props.setScore(event.target.value)} />
        <label>全省排位</label>
        <input value={props.rank} onChange={(event) => props.setRank(event.target.value)} />
        <div className="mini-metric">
          <span>2025 {subjectLabels[props.subject]}人数</span>
          <strong>{formatNumber(candidateCounts[props.subject][2025])}</strong>
        </div>
      </section>

      <section className="panel">
        <div className="panel-title"><span>02</span><h2>筛选条件</h2></div>
        <label>城市</label>
        <select value={props.city} onChange={(event) => props.setCity(event.target.value)}>
          {cityOptions.map((item) => <option key={item}>{item}</option>)}
        </select>
        <label>专业方向</label>
        <select value={props.major} onChange={(event) => props.setMajor(event.target.value)}>
          {majorOptions.map((item) => <option key={item}>{item}</option>)}
        </select>
        <div className="checks">
          <label><input type="checkbox" checked={props.publicOnly} onChange={(event) => props.setPublicOnly(event.target.checked)} /> 只看公办</label>
          <label><input type="checkbox" checked={props.noCoop} onChange={(event) => props.setNoCoop(event.target.checked)} /> 排除中外合作</label>
          <label><input type="checkbox" checked={props.only985} onChange={(event) => props.setOnly985(event.target.checked)} /> 只看 985</label>
          <label><input type="checkbox" checked={props.only211} onChange={(event) => props.setOnly211(event.target.checked)} /> 只看 211</label>
          <label><input type="checkbox" checked={props.onlyDoubleFirstClass} onChange={(event) => props.setOnlyDoubleFirstClass(event.target.checked)} /> 只看双一流</label>
        </div>
      </section>
      <SchoolSearch onSelectSchool={props.onSelectSchool} />
    </aside>
  )
}
