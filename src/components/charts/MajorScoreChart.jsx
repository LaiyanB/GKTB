import { useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from "recharts";
import { extractMajorScoreData, getAvailableYears } from "../../utils/chartData";

export function MajorScoreChart({ records, schoolName }) {
  const [year, setYear] = useState(2024);
  const [subject, setSubject] = useState("physics");

  const availableYears = useMemo(() => {
    return getAvailableYears(records, schoolName);
  }, [records, schoolName]);

  const data = useMemo(() => {
    return extractMajorScoreData(records, schoolName, year, subject);
  }, [records, schoolName, year, subject]);

  const colors = ["#537d96", "#5d8aa3", "#6797b0", "#71a4bd", "#7bb1ca", "#85bed7"];

  if (data.length === 0) {
    return (
      <div style={{ 
        padding: "40px 20px", 
        textAlign: "center", 
        color: "#6b6158",
        background: "#fffaf1",
        border: "1px dashed #d8cfbe",
        borderRadius: "4px"
      }}>
        暂无该年份的专业分数数据
      </div>
    );
  }

  return (
    <div>
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center",
        marginBottom: "12px" 
      }}>
        <h4 style={{ margin: 0, fontSize: "14px" }}>专业录取位次分布</h4>
        <div style={{ display: "flex", gap: "8px" }}>
          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            style={{
              padding: "4px 8px",
              border: "1px solid #d8cfbe",
              background: "#fffaf1",
              borderRadius: "3px",
              fontSize: "12px"
            }}
          >
            {availableYears.map(y => (
              <option key={y} value={y}>{y}年</option>
            ))}
          </select>
          <button
            onClick={() => setSubject("physics")}
            style={{
              padding: "4px 12px",
              border: "1px solid #d8cfbe",
              background: subject === "physics" ? "#537d96" : "transparent",
              color: subject === "physics" ? "#fff" : "#4a433c",
              borderRadius: "3px",
              fontSize: "12px",
              cursor: "pointer"
            }}
          >
            物理
          </button>
          <button
            onClick={() => setSubject("history")}
            style={{
              padding: "4px 12px",
              border: "1px solid #d8cfbe",
              background: subject === "history" ? "#537d96" : "transparent",
              color: subject === "history" ? "#fff" : "#4a433c",
              borderRadius: "3px",
              fontSize: "12px",
              cursor: "pointer"
            }}
          >
            历史
          </button>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={Math.max(280, data.length * 35)}>
        <BarChart 
          data={data} 
          layout="vertical"
          margin={{ top: 5, right: 30, left: 150, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e8e0d0" />
          <XAxis 
            type="number"
            tick={{ fontSize: 11, fill: "#6b6158" }}
            axisLine={{ stroke: "#d8cfbe" }}
          />
          <YAxis 
            type="category"
            dataKey="major"
            tick={{ fontSize: 11, fill: "#4a433c" }}
            axisLine={{ stroke: "#d8cfbe" }}
            width={145}
          />
          <Tooltip 
            contentStyle={{ 
              background: "#fbf7ee", 
              border: "1px solid #d8cfbe",
              borderRadius: "4px",
              fontSize: "12px"
            }}
            formatter={(value) => [value?.toLocaleString(), "录取位次"]}
          />
          <Bar 
            dataKey="rank" 
            name="录取位次"
            radius={[0, 4, 4, 0]}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
