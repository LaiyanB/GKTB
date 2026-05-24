import fs from 'fs'
import path from 'path'
import xlsx from 'xlsx'

const root = process.cwd()
const rawDataDir = path.join(root, 'data', 'raw')
const files = fs.readdirSync(rawDataDir)

const workbookFiles = files.filter((file) => {
  return file.endsWith('.xlsx') || file.endsWith('.xls')
})

if (workbookFiles.length === 0) {
  console.log('No workbook files found in data/raw.')
  process.exit(0)
}

console.log('\n=== Workbook Inspection ===\n')

for (const file of workbookFiles) {
  const absolute = path.join(rawDataDir, file)
  const workbook = xlsx.readFile(absolute)

  console.log(`\n# ${file}`)
  console.log(`Sheets: ${workbook.SheetNames.join(', ')}`)

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName]
    const rows = xlsx.utils.sheet_to_json(sheet, {
      header: 1,
      raw: false,
      defval: ''
    })

    const preview = rows.slice(0, 5)

    console.log(`\n## Sheet: ${sheetName}`)
    console.log('Preview:')

    preview.forEach((row, index) => {
      console.log(index, JSON.stringify(row))
    })
  }
}
