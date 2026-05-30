/**
 * 快速分析：专科 vs 本科数据分布
 * 逻辑：2021/2022 含专科，2023/2024 仅本科
 * 所以"仅出现在 2021/2022"的学校 ≈ 专科院校
 */
import fs from 'fs';

const adm = JSON.parse(fs.readFileSync('data/normalized/admissions.json', 'utf-8'));
const records = adm.records;

// 每个学校出现在哪些年份
const schoolYears = {};
for (const r of records) {
  if (!schoolYears[r.school]) schoolYears[r.school] = new Set();
  schoolYears[r.school].add(String(r.year));
}

// 分类
let only_2122 = 0;
let has_2324 = 0;
let all_four = 0;

for (const [school, years] of Object.entries(schoolYears)) {
  const has2324 = years.has('2023') || years.has('2024');
  const has2122 = years.has('2021') || years.has('2022');

  if (has2324) {
    has_2324++;
    if (years.has('2021') && years.has('2022') && years.has('2023') && years.has('2024')) all_four++;
  } else if (has2122) {
    only_2122++;
  }
}

console.log('=== 院校按年份覆盖分类 ===');
console.log('总去重院校数:', Object.keys(schoolYears).length);
console.log('');
console.log('仅在 2021/2022 出现（≈专科院校）:', only_2122);
console.log('在 2023/2024 出现（≈本科院校）:', has_2324);
console.log('  其中四年齐全:', all_four);
console.log('');

// 按记录数
let rec_2122_only = 0;
let rec_2324 = 0;
let rec_2122_shared = 0; // 学校也出现在2324的记录

for (const r of records) {
  const y = String(r.year);
  if (y === '2023' || y === '2024') {
    rec_2324++;
  } else if (y === '2021' || y === '2022') {
    const alsoHas2324 = schoolYears[r.school].has('2023') || schoolYears[r.school].has('2024');
    if (alsoHas2324) {
      rec_2122_shared++;
    } else {
      rec_2122_only++;
    }
  }
}

console.log('=== 按记录数 ===');
console.log('总记录数:', records.length);
console.log('');
console.log('2023/2024（本科）记录:', rec_2324, `(${(rec_2324/records.length*100).toFixed(1)}%)`);
console.log('2021/2022 中专院校记录（学校仅出现在2122）:', rec_2122_only, `(${(rec_2122_only/records.length*100).toFixed(1)}%)`);
console.log('2021/2022 中本科院校记录（学校也出现在2324）:', rec_2122_shared, `(${(rec_2122_shared/records.length*100).toFixed(1)}%)`);

// 如果去掉纯专科院校，还剩多少记录
const remaining = rec_2324 + rec_2122_shared;
console.log('');
console.log('=== 如果去掉专科（去掉仅2122出现的学校）===');
console.log('剩余记录数:', remaining, `(${(remaining/records.length*100).toFixed(1)}%)`);

// 再去看看 2021/2022 有没有批次字段可以区分
console.log('');
console.log('=== 2021年数据前3条字段探查 ===');
const sample2021 = records.filter(r => String(r.year) === '2021').slice(0, 3);
console.log(JSON.stringify(sample2021[0], null, 2));
