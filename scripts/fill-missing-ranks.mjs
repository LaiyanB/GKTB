/**
 * fill-missing-ranks.mjs
 * 用一分一段表回填 admissions.json 中 min_rank 为 null 的记录
 * 超出分段表范围的：物理≥700→27，历史≥670→31
 */

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const admissionsPath = path.join(root, 'data', 'normalized', 'admissions.json');
const segmentsPath = path.join(root, 'data', 'normalized', 'score-segments.json');

const admissions = JSON.parse(fs.readFileSync(admissionsPath, 'utf-8'));
const segments = JSON.parse(fs.readFileSync(segmentsPath, 'utf-8'));

// 构建查表：year_subject_score → cumulative
const lookup = new Map();
for (const r of segments.records) {
  // 跳过被 num() 错误解析的区间值（如 "700-750" → 700750）
  if (r.score > 750) continue;
  lookup.set(`${r.year}_${r.subject}_${r.score}`, r.cumulative);
}

// 顶部兜底值（从一分一段表原始区间提取）
const TOP_FALLBACK = {
  physics: 27,   // "700-750" 累计27人
  history: 31,   // "670-750" 累计31人
};

const TOP_THRESHOLD = {
  physics: 700,
  history: 670,
};

let filled = 0;
let exact = 0;
let fallback = 0;

for (const rec of admissions.records) {
  if (rec.min_score == null || rec.min_rank != null) continue;

  // 所有年份都走一分一段表回填
  const exactKey = `${rec.year}_${rec.subject}_${rec.min_score}`;
  let rank = lookup.get(exactKey);

  if (rank != null) {
    rec.min_rank = rank;
    filled++;
    exact++;
    continue;
  }

  // 超出分段表顶部 → 用兜底值
  const threshold = TOP_THRESHOLD[rec.subject];
  const fallbackRank = TOP_FALLBACK[rec.subject];
  if (threshold != null && rec.min_score >= threshold) {
    rec.min_rank = fallbackRank;
    filled++;
    fallback++;
    continue;
  }
}

const stillMissing = admissions.records.filter(r => r.min_score != null && r.min_rank == null)
const stillMissingByYear = {}
stillMissing.forEach(r => { stillMissingByYear[r.year] = (stillMissingByYear[r.year] || 0) + 1 })
console.log(`Filled ${filled} missing ranks (${exact} exact, ${fallback} fallback)`);
console.log(`Still missing: ${stillMissing.length} (by year: ${JSON.stringify(stillMissingByYear)})`);

fs.writeFileSync(admissionsPath, JSON.stringify(admissions, null, 2), 'utf-8');
console.log(`Written: ${admissionsPath}`);
