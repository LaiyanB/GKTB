import { useState } from 'react'
import { supabase } from '../supabase'

export default function Login({ onLogin }) {
  const [tab, setTab] = useState('otp')        // 'otp' | 'password'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [step, setStep] = useState('email')    // 'email' | 'sent'
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  /* ========= 邮箱登录（魔法链接） ========= */

  async function handleSendLink(e) {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      })
      if (error) throw error
      setMessage('✅ 登录链接已发送，请检查邮箱')
      setStep('sent')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleResendLink() {
    setError('')
    setMessage('')
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      })
      if (error) throw error
      setMessage('✅ 登录链接已重新发送')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  /* ========= 密码登录 ========= */

  async function handlePasswordLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      onLogin()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  /* ========= 通用 ========= */

  function resetOtp() {
    setStep('email')
    setError('')
    setMessage('')
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="seal">粤</div>
        <p className="eyebrow">Guangdong Application Guide</p>
        <h1>广东省高考志愿填报指南</h1>
        <p className="login-copy">面向广东考生与家长的志愿筛选、风险分层和草案管理工具。</p>

        {/* 切换标签 */}
        <div className="login-tabs">
          <button
            type="button"
            className={tab === 'otp' ? 'login-tab active' : 'login-tab'}
            onClick={function () { setTab('otp'); resetOtp() }}
          >邮箱登录</button>
          <button
            type="button"
            className={tab === 'password' ? 'login-tab active' : 'login-tab'}
            onClick={function () { setTab('password'); resetOtp() }}
          >密码登录</button>
        </div>

        {tab === 'password' ? (
          /* ====== 密码登录 ====== */
          <form onSubmit={handlePasswordLogin}>
            {error && <p className="login-error">{error}</p>}

            <label>邮箱</label>
            <input type="email" placeholder="请输入邮箱地址" value={email}
              onChange={function (e) { setEmail(e.target.value) }} required />

            <label>密码</label>
            <input type="password" placeholder="请输入密码" value={password}
              onChange={function (e) { setPassword(e.target.value) }} required />

            <button type="submit" disabled={loading}>
              {loading ? '登录中…' : '登录'}
            </button>

            <p className="login-hint">
              首次使用？通过「邮箱登录」创建账号
            </p>
          </form>
        ) : step === 'email' ? (
          /* ====== 邮箱登录 — 输入邮箱 ====== */
          <form onSubmit={handleSendLink}>
            {error && <p className="login-error">{error}</p>}

            <label>邮箱</label>
            <input type="email" placeholder="请输入邮箱地址" value={email}
              onChange={function (e) { setEmail(e.target.value) }} required />

            <button type="submit" disabled={loading}>
              {loading ? '发送中…' : '发送登录链接'}
            </button>

            <p className="login-hint">登录链接将发送到您的邮箱，点击即可登录</p>
          </form>
        ) : (
          /* ====== 邮箱登录 — 链接已发送 ====== */
          <div className="login-sent">
            {error && <p className="login-error">{error}</p>}
            {message && <p className="login-success">{message}</p>}

            <p className="login-sent-text">请检查您的邮箱，点击邮件中的链接即可自动完成登录。</p>

            <p className="login-hint">
              未收到？
              <button className="link-btn" onClick={resetOtp}>更换邮箱</button>
              {' · '}
              <button className="link-btn" onClick={handleResendLink}>
                {loading ? '发送中…' : '重新发送'}
              </button>
            </p>
          </div>
        )}
      </section>
    </main>
  )
}
