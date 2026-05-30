import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

export function useOfflineAdmissions() {
  const [records, setRecords] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true

    async function load() {
      try {
        const { data, error } = await supabase
          .from('schools')
          .select('*')
          .order('id', { ascending: true })

        if (error) throw error

        const rows = Array.isArray(data) ? data : []

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
