import { useEffect, useState } from 'react'

/**
 * 使用 DecompressionStream 解压 gzip 数据
 * 如果浏览器不支持，回退到原始 fetch
 */
async function fetchAndDecompress(url) {
  // 先尝试 gzip 版本
  const gzUrl = url + '.gz'
  try {
    const response = await fetch(gzUrl)
    if (!response.ok) throw new Error('gz not found')
    
    const contentType = response.headers.get('content-type') || ''
    
    // 如果服务器返回了内容编码（支持 gzip 回源），直接当 JSON 解析
    if (response.headers.get('content-encoding') === 'gzip' && !contentType.includes('gzip')) {
      return await response.json()
    }
    
    // 否则手动解压
    const body = await response.arrayBuffer()
    const ds = new DecompressionStream('gzip')
    const decompressedStream = new Response(body).body.pipeThrough(ds)
    const reader = decompressedStream.getReader()
    const chunks = []
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
    }
    const totalLength = chunks.reduce((sum, c) => sum + c.byteLength, 0)
    const allBytes = new Uint8Array(totalLength)
    let offset = 0
    for (const chunk of chunks) {
      allBytes.set(chunk, offset)
      offset += chunk.byteLength
    }
    const decoder = new TextDecoder('utf-8')
    return JSON.parse(decoder.decode(allBytes))
  } catch {
    // 降级到原始 JSON
    const response = await fetch(url)
    if (!response.ok) throw new Error(`offline data not found: ${response.status}`)
    return await response.json()
  }
}

export function useOfflineAdmissions() {
  const [records, setRecords] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true

    async function load() {
      try {
        const payload = await fetchAndDecompress('/data/admissions.json')
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
