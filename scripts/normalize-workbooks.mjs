import fs from 'fs'
import path from 'path'
import xlsx from 'xlsx'

const root = process.cwd()
const rawDataDir = path.join(root, 'data', 'raw')
const outputDir = path.join(root, 'data', 'normalized')

fs.mkdirSync(outputDir, { recursive: true })

const workbookFiles = fs.readdirSync(rawDataDir).filter((file) => {
  return file.endsWith('.xlsx') || file.endsWith('.xls')
})

const allRecords = []

function inferSubject(name) {
  if (name.includes('物理')) return 'physics'
  if (name.includes('历史')) return 'history'
  return 'unknown'
}

function inferYear(name) {
  // 只匹配独立的 20xx（前后不是数字），避免日期前缀如 20250608 的误匹配
  const match = name.match(/(?<!\d)20\d{2}(?!\d)/)
  return match ? Number(match[0]) : null
}

for (const file of workbookFiles) {
  const workbook = xlsx.readFile(path.join(rawDataDir, file))

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName]

    const rows = xlsx.utils.sheet_to_json(sheet, {
      raw: false,
      defval: ''
    })

    rows.forEach((row) => {
      allRecords.push({
        source_file: file,
        source_sheet: sheetName,
        inferred_year: inferYear(file),
        inferred_subject: inferSubject(file),
        raw: row
      })
    })
  }
}

const output = {
  generated_at: new Date().toISOString(),
  total_records: allRecords.length,
  records: allRecords
}

fs.writeFileSync(
  path.join(outputDir, 'raw-records.json'),
  JSON.stringify(output, null, 2),
  'utf-8'
)

console.log(`Normalized ${allRecords.length} rows.`)
