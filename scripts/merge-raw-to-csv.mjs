/**
 * merge-raw-to-csv.mjs
 * 将 data/raw/ 下所有 Excel 合并为一个 CSV 文件
 * 输出到 data/combined.csv
 *
 * 用法: node scripts/merge-raw-to-csv.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import XLSX from 'xlsx';

const RAW_DIR = 'data/raw';
const OUT_FILE = 'data/combined.csv';

const allHeadersSet = new Set();
const sheetInfos = []; // { file, header, dataRows }

// 表头关键词（用于定位真正的表头行）
const headerKeywords = ['年份', '学校', '科类', '专业', '批次', '分数', '最低分', '生源地', '院校'];

const files = fs.readdirSync(RAW_DIR).filter(f => f.endsWith('.xlsx'));
console.log(`找到 ${files.length} 个 Excel 文件\n`);

// 第1遍：收集所有文件的 header，确定全局列集合
for (const f of files) {
  const fp = path.join(RAW_DIR, f);
  const wb = XLSX.readFile(fp);

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    if (rows.length === 0) continue;

    // 智能定位表头行
    let headerRowIdx = 0;
    for (let i = 0; i < Math.min(3, rows.length); i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;
      const nonEmpty = row.filter(c => String(c).trim() !== '').length;
      if (nonEmpty < 5) continue;
      const rowStr = row.join(' ');
      const matchCount = headerKeywords.filter(k => rowStr.includes(k)).length;
      if (matchCount >= 2) {
        headerRowIdx = i;
        break;
      }
    }

    const header = rows[headerRowIdx].map(h => String(h).trim());
    const dataRows = rows.slice(headerRowIdx + 1);

    console.log(`  ${f} / ${sheetName}: ${dataRows.length} 行 × ${header.length} 列`);

    for (const h of header) {
      if (h) allHeadersSet.add(h);
    }

    sheetInfos.push({ file: f, header, data: dataRows });
  }
}

const allHeaders = Array.from(allHeadersSet);
console.log(`\n合并后共 ${allHeaders.length} 列`);

// 第2遍：写出 CSV（BOM + 表头 + 所有数据行）
const outLines = [allHeaders.map(csvQuote).join(',')];

for (const { file, header, data } of sheetInfos) {
  for (const row of data) {
    const rowMap = {};
    for (let i = 0; i < header.length; i++) {
      rowMap[header[i]] = row[i] !== undefined ? row[i] : '';
    }
    const csvRow = allHeaders.map(h => csvQuote(rowMap[h] ?? ''));
    outLines.push(csvRow.join(','));
  }
}

fs.writeFileSync(OUT_FILE, '\uFEFF' + outLines.join('\n'), 'utf-8');
const totalRows = outLines.length - 1;
const sizeKB = (fs.statSync(OUT_FILE).size / 1024).toFixed(0);
console.log(`\n✅ 已写入: ${OUT_FILE}  (${sizeKB} KB, ${totalRows} 行)`);

function csvQuote(val) {
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}
