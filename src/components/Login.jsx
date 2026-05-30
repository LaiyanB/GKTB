import { useState } from 'react'
import { supabase } from '../supabase'

export default function Login({ onLogin }) {
  const [tab, setTab] = useState('otp')        // 'otp' | 'password'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState('email')    // 'email' | 'code' | 'set-password'
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [newPassword, setNewPassword] = useState('')

  /* ========= 验证码登录 ========= */

  async function handleSendCode(e) {
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
      setMessage('✅ 验证码已发送，请检查邮箱')
      setStep('code')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyCode(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: code.trim(),
        type: 'email',
      })
      if (error) throw error
      if (!data.session) throw new Error('验证失败')
      // 验证成功，询问是否设置密码
      setStep('set-password')
      setMessage('✅ 登录成功！可选设置密码，下次可直接密码登录')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSetPassword(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      onLogin()
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
    setCode('')
    setNewPassword('')
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
            className={'login-tab' + (tab === 'otp' ? ' active' : '')}
            onClick={function () { setTab('otp'); resetOtp() }}
          >验证码登录</button>
          <button
            className={'login-tab' + (tab === 'password' ? ' active' : '')}
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
              首次使用？切换到「验证码登录」设置密码
            </p>
          </form>
        ) : step === 'email' ? (
          /* ====== 验证码 — 输入邮箱 ====== */
          <form onSubmit={handleSendCode}>
            {error && <p className="login-error">{error}</p>}

            <label>邮箱</label>
            <input type="email" placeholder="请输入邮箱地址" value={email}
              onChange={function (e) { setEmail(e.target.value) }} required />

            <button type="submit" disabled={loading}>
              {loading ? '发送中…' : '发送验证码'}
            </button>

            <p className="login-hint">6 位验证码将发送到您的邮箱</p>
          </form>
        ) : step === 'code' ? (
          /* ====== 验证码 — 输入验证码 ====== */
          <form onSubmit={handleVerifyCode}>
            {error && <p className="login-error">{error}</p>}
            {message && <p className="login-success">{message}</p>}

            <label>验证码</label>
            <input type="text" inputMode="numeric" placeholder="请输入 6 位验证码"
              value={code} onChange={function (e) { setCode(e.target.value) }}
              maxLength={6} required />

            <button type="submit" disabled={loading}>
              {loading ? '验证中…' : '验证并登录'}
            </button>

            <p className="login-hint">
              未收到？
              <button className="link-btn" onClick={resetOtp}>更换邮箱</button>
              {' · '}
              <button className="link-btn" onClick={handleSendCode}>重新发送</button>
            </p>
          </form>
        ) : (
          /* ====== 验证码 — 设置密码（可选） ====== */
          <form onSubmit={handleSetPassword}>
            {message && <p className="login-success">{message}</p>}

            <label>设置密码（可选）</label>
            <input type="password" placeholder="至少 6 位密码" value={newPassword}
              onChange={function (e) { setNewPassword(e.target.value) }}
              minLength={6} />

            <button type="submit" disabled={loading}>
              {loading ? '保存中…' : '保存密码并进入'}
            </button>

            <p className="login-hint">
              <button className="link-btn" onClick={onLogin}>
                跳过，直接进入
              </button>
              {' · 下次可用密码登录'}
            </p>
          </form>
        )}
      </section>
    </main>
  )
}
