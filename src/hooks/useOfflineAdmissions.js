import { useEffect, useState } from 'react'

export function useOfflineAdmissions() {
  const [records, setRecords] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true

    async function load() {
      try {
        const response = await fetch('/data/admissions.json')

        if (!response.ok) {
          throw new Error(`offline data not found: ${response.status}`)
        }

        const payload = await response.json()
        const rows = Array.isArray(payload.records) ? payload.records : []

        if (alive) {
          setRecords(rows)
          setStatus(rows.length > 0 ? 'ready' : 'empty')
        }
      } catch (err) {
        if (alive) {
          setError(err instanceof Error ? err.message : String(err))
          setStatus('fallback')
        }
      }
    }

    load()

    return () => {
      alive = false
    }
  }, [])

  return { records, status, error }
}
