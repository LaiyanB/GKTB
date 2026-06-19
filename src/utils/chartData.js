/**
 * 图表数据转换工具函数
 */

// 提取院校历年分数线数据
export function extractSchoolTrendData(records, schoolName, subject = "physics") {
  const schoolRecords = records.filter(
    r => r.school === schoolName && r.subject === subject
  );
  
  const years = ["2021", "2022", "2023", "2024"];
  return years.map(year => {
    const yearRecords = schoolRecords.filter(r => r.ranks && r.ranks[year]);
    const avgRank = yearRecords.length > 0
      ? Math.round(yearRecords.reduce((sum, r) => sum + (r.ranks[year] || 0), 0) / yearRecords.length)
      : null;
    const avgScore = yearRecords.length > 0
      ? Math.round(yearRecords.reduce((sum, r) => sum + (r.scores?.[year] || 0), 0) / yearRecords.length)
      : null;
    
    return {
      year: parseInt(year),
      rank: avgRank,
      score: avgScore,
      majorCount: yearRecords.length
    };
  }).filter(d => d.rank !== null);
}

// 提取专业分数分布数据
export function extractMajorScoreData(records, schoolName, year = 2024, subject = "physics") {
  const yearStr = String(year);
  return records
    .filter(r => 
      r.school === schoolName && 
      r.subject === subject && 
      r.ranks && r.ranks[yearStr]
    )
    .map(r => ({
      major: r.major,
      group: r.group,
      rank: r.ranks[yearStr],
      score: r.scores?.[yearStr] || null,
      direction: r.direction
    }))
    .sort((a, b) => b.rank - a.rank);
}

// 获取所有院校列表
export function getSchoolList(records) {
  const schools = [...new Set(records.map(r => r.school))];
  return schools.sort().filter(s => s && s.trim());
}

// 获取可用年份
export function getAvailableYears(records, schoolName) {
  const schoolRecords = records.filter(r => r.school === schoolName);
  const years = new Set();
  schoolRecords.forEach(r => {
    if (r.ranks) {
      Object.keys(r.ranks).forEach(y => years.add(parseInt(y)));
    }
  });
  return [...years].sort();
}

// 格式化数字
export function formatChartNumber(num) {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + "w";
  }
  return num?.toLocaleString() || "-";
}
