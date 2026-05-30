import { useState } from 'react'
import { supabase } from '../supabase'

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('signin')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (mode === 'signup') {
        var result = await supabase.auth.signUp({ email, password })
        if (result.error) throw result.error
        setError('✅ 注册成功！请检查邮箱中的确认链接后登录。')
        setMode('signin')
      } else {
        var result = await supabase.auth.signInWithPassword({ email, password })
        if (result.error) throw result.error
        onLogin()
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="seal">粤</div>
        <p className="eyebrow">Guangdong Application Guide</p>
        <h1>广东省高考志愿填报指南</h1>
        <p className="login-copy">面向广东考生与家长的志愿筛选、风险分层和草案管理工具。</p>

        <form onSubmit={handleSubmit}>
          {error && <p className="login-error">{error}</p>}

          <label>邮箱</label>
          <input
            type="email"
            placeholder="请输入邮箱地址"
            value={email}
            onChange={function (e) { setEmail(e.target.value) }}
            required
          />

          <label>密码</label>
          <input
            type="password"
            placeholder={mode === 'signup' ? '至少 6 位密码' : '请输入密码'}
            value={password}
            onChange={function (e) { setPassword(e.target.value) }}
            minLength={6}
            required
          />

          <button type="submit" disabled={loading}>
            {loading ? '处理中…' : (mode === 'signup' ? '注册并进入' : '进入志愿工作台')}
          </button>
        </form>

        <p className="login-switch">
          {mode === 'signin' ? (
            <>还没有账号？<button className="link-btn" onClick={function () { setMode('signup'); setError('') }}>注册</button></>
          ) : (
            <>已有账号？<button className="link-btn" onClick={function () { setMode('signin'); setError('') }}>登录</button></>
          )}
        </p>
      </section>
    </main>
  )
}
