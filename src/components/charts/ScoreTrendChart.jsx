import { useState, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from "recharts";
import { extractSchoolTrendData } from "../../utils/chartData";

export function ScoreTrendChart({ records, schoolName }) {
  const [subject, setSubject] = useState("physics");

  const data = useMemo(() => {
    return extractSchoolTrendData(records, schoolName, subject);
  }, [records, schoolName, subject]);

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
        暂无该院校的历年分数线数据
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
        <h4 style={{ margin: 0, fontSize: "14px" }}>历年分数线趋势</h4>
        <div style={{ display: "flex", gap: "8px" }}>
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
            物理类
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
            历史类
          </button>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e8e0d0" />
          <XAxis 
            dataKey="year" 
            tick={{ fontSize: 12, fill: "#6b6158" }}
            axisLine={{ stroke: "#d8cfbe" }}
          />
          <YAxis 
            yAxisId="left"
            tick={{ fontSize: 11, fill: "#6b6158" }}
            axisLine={{ stroke: "#d8cfbe" }}
            label={{ value: "位次", angle: -90, position: "insideLeft", fontSize: 12, fill: "#6b6158" }}
          />
          <YAxis 
            yAxisId="right" 
            orientation="right"
            tick={{ fontSize: 11, fill: "#6b6158" }}
            axisLine={{ stroke: "#d8cfbe" }}
            label={{ value: "分数", angle: 90, position: "insideRight", fontSize: 12, fill: "#6b6158" }}
          />
          <Tooltip 
            contentStyle={{ 
              background: "#fbf7ee", 
              border: "1px solid #d8cfbe",
              borderRadius: "4px",
              fontSize: "12px"
            }}
          />
          <Legend wrapperStyle={{ fontSize: "12px" }} />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="rank"
            name="录取位次"
            stroke="#537d96"
            strokeWidth={3}
            dot={{ fill: "#537d96", strokeWidth: 2, r: 5 }}
            activeDot={{ r: 7 }}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="score"
            name="录取分数"
            stroke="#8b2c1f"
            strokeWidth={3}
            dot={{ fill: "#8b2c1f", strokeWidth: 2, r: 5 }}
            activeDot={{ r: 7 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
