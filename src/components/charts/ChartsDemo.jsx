import { useState, useMemo } from "react";
import { ScoreTrendChart } from "./ScoreTrendChart";
import { MajorScoreChart } from "./MajorScoreChart";
import { getSchoolList } from "../../utils/chartData";

export function ChartsDemo({ records }) {
  const schools = useMemo(() => getSchoolList(records), [records]);
  const [selectedSchool, setSelectedSchool] = useState(schools[0] || "");

  return (
    <div className="charts-page">
      <div className="charts-header">
        <div>
          <h2>数据可视化分析</h2>
          <p className="charts-subtitle">历年分数线趋势与专业分数分布图表</p>
        </div>
      </div>

      <div className="charts-controls">
        <label style={{ fontSize: "13px", color: "#6b6158", marginRight: "12px" }}>
          选择院校：
        </label>
        <select
          value={selectedSchool}
          onChange={(e) => setSelectedSchool(e.target.value)}
          style={{
            padding: "8px 12px",
            border: "1px solid #d8cfbe",
            background: "#fffaf1",
            borderRadius: "4px",
            fontSize: "14px",
            minWidth: "280px"
          }}
        >
          {schools.map(school => (
            <option key={school} value={school}>{school}</option>
          ))}
        </select>
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <ScoreTrendChart records={records} schoolName={selectedSchool} />
        </div>
        <div className="chart-card">
          <MajorScoreChart records={records} schoolName={selectedSchool} />
        </div>
      </div>
    </div>
  );
}
