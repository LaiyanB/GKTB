/**
 * missing-schools.mjs
 * 统计各年份院校缺失清单，输出 data/院校缺失清单.csv
 *
 * 用法: node scripts/missing-schools.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import XLSX from 'xlsx';

const RAW_DIR = 'data/raw';
const OUT_FILE = 'data/院校缺失清单.csv';

// 各文件的学校名列映射
const FILE_SCHOOL_MAP = [
  { file: '2021_专业分数线.xlsx',        schoolCol: '学校' },
  { file: '2022_一分一段表.xlsx',         schoolCol: null },    // 无学校信息
  { file: '2022_专业分数线.xlsx',         schoolCol: '院校名称', sheet: '高考分数线_加字段' },
  { file: '2023_一分一段表.xlsx',         schoolCol: null },
  { file: '2023_历史类_本科批_录取分数线.xlsx', schoolCol: '学校' },
  { file: '2023_物理类_本科批_录取分数线.xlsx', schoolCol: '学校' },
  { file: '2024_一分一段表.xlsx',         schoolCol: null },
  { file: '2024_专业录取分数线_本科.xlsx',  schoolCol: '学校' },
];

const headerKeywords = ['年份', '学校', '科类', '专业', '批次', '分数', '最低分', '生源地', '院校'];

// 按年份收集学校集合
const schoolsPerYear = {};

for (const spec of FILE_SCHOOL_MAP) {
  if (!spec.schoolCol) continue; // 一分一段表跳过

  const fp = path.join(RAW_DIR, spec.file);
  const wb = XLSX.readFile(fp);

  for (const sheetName of wb.SheetNames) {
    if (spec.sheet && sheetName !== spec.sheet) continue;

    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    if (rows.length === 0) continue;

    // 定位表头行
    let headerRowIdx = 0;
    for (let i = 0; i < Math.min(3, rows.length); i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;
      const nonEmpty = row.filter(c => String(c).trim() !== '').length;
      if (nonEmpty < 5) continue;
      const rowStr = row.join(' ');
      const matchCount = headerKeywords.filter(k => rowStr.includes(k)).length;
      if (matchCount >= 2) { headerRowIdx = i; break; }
    }

    const header = rows[headerRowIdx].map(h => String(h).trim());
    const schoolIdx = header.indexOf(spec.schoolCol);
    if (schoolIdx === -1) {
      console.warn(`⚠  在 ${spec.file}/${sheetName} 中未找到 "${spec.schoolCol}" 列`);
      continue;
    }

    const dataRows = rows.slice(headerRowIdx + 1);

    // 从文件名提取年份
    const yearMatch = spec.file.match(/^(\d{4})/);
    const year = yearMatch ? yearMatch[1] : 'unknown';

    for (const row of dataRows) {
      const school = String(row[schoolIdx] || '').trim();
      if (!school) continue;
      if (!schoolsPerYear[year]) schoolsPerYear[year] = new Set();
      schoolsPerYear[year].add(school);
    }

    console.log(`  ${spec.file}: ${dataRows.length} 行, ${schoolsPerYear[year].size} 所院校`);
  }
}

const years = Object.keys(schoolsPerYear).sort();
console.log('\n各年份院校数:');
for (const y of years) {
  console.log(`  ${y}: ${schoolsPerYear[y].size} 所`);
}

const allSchools = new Set();
for (const y of years) for (const s of schoolsPerYear[y]) allSchools.add(s);
console.log(`\n去重后共 ${allSchools.size} 所院校`);

// 构建缺失清单
const missingList = [];
for (const school of [...allSchools].sort()) {
  const absentYears = years.filter(y => !schoolsPerYear[y].has(school));
  if (absentYears.length === 0) continue;
  const presentYears = years.filter(y => schoolsPerYear[y].has(school));
  missingList.push({
    school,
    present: presentYears.join('、'),
    absent: absentYears.join('、'),
    missingCount: absentYears.length,
  });
}

// 按缺失年份数降序排列
missingList.sort((a, b) => b.missingCount - a.missingCount || a.school.localeCompare(b.school, 'zh'));

// 写出 CSV（含 BOM）
const csvLines = [
  ['院校名称', '有数据的年份', '缺失的年份', '缺失年数'].join(','),
  ...missingList.map(m => [
    csvQuote(m.school),
    csvQuote(m.present),
    csvQuote(m.absent),
    m.missingCount,
  ].join(',')),
];

fs.writeFileSync(OUT_FILE, '\uFEFF' + csvLines.join('\n'), 'utf-8');
console.log(`\n✅ 已写入: ${OUT_FILE}`);
console.log(`   总 ${missingList.length} 所院校存在缺失数据`);

// 打印统计摘要
const byCount = {};
for (const m of missingList) {
  byCount[m.missingCount] = (byCount[m.missingCount] || 0) + 1;
}
console.log('\n缺失分布:');
for (const k of Object.keys(byCount).sort((a,b)=>b-a)) {
  console.log(`  缺失 ${k} 年: ${byCount[k]} 所`);
}

// 打印缺失最严重的前 20 所
console.log('\n缺失最严重的院校（前20）:');
missingList.filter(m => m.missingCount >= 2).slice(0, 20).forEach(m => {
  console.log(`  缺失 ${m.absent}  → ${m.school}（仅有 ${m.present}）`);
});

function csvQuote(val) {
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}
