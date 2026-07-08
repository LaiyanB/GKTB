import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../supabase'

/* ========= 错误信息本地化 ========= */
function localizeError(err) {
  if (!err) return '未知错误，请重试'
  const raw = String(err.message || err || '').trim()
  const lower = raw.toLowerCase()
  if (lower.includes('failed to fetch') || lower.includes('networkerror') || lower.includes('network request failed')) {
    return '网络异常，请检查网络后重试'
  }
  if (lower.includes('timeout') || lower.includes('aborted')) {
    return '请求超时，请稍后重试'
  }
  if (lower.includes('email rate limit') || lower.includes('rate limit exceeded') || lower.includes('over_email_send_rate_limit')) {
    return '发送过于频繁，请稍后再试'
  }
  if (lower.includes('email not confirmed') || lower.includes('email_not_confirmed')) {
    return '邮箱未验证，请先在邮箱中点击验证链接'
  }
  if (lower.includes('sms rate limit') || lower.includes('over_sms_send_rate_limit')) {
    return '短信发送过于频繁，请稍后再试'
  }
  if (lower.includes('phone') && (lower.includes('not confirmed') || lower.includes('not_confirmed'))) {
    return '手机号未验证，请先完成短信验证'
  }
  if (lower.includes('otp') && (lower.includes('expired') || lower.includes('invalid'))) {
    return '验证码无效或已过期，请重新获取'
  }
  if (lower.includes('token') && lower.includes('expired')) {
    return '验证码已过期，请重新获取'
  }
  if (lower.includes('invalid login') || lower.includes('invalid credentials')) {
    return '邮箱或密码错误'
  }
  if (lower.includes('user already registered') || lower.includes('already been registered')) {
    return '该邮箱已注册，请直接登录或使用忘记密码'
  }
  if (lower.includes('email') && lower.includes('invalid')) {
    return '邮箱格式不正确'
  }
  if (lower.includes('phone') && (lower.includes('invalid') || lower.includes('format'))) {
    return '手机号格式不正确'
  }
  if (lower.includes('password') && (lower.includes('short') || lower.includes('at least'))) {
    return '密码长度不足（至少 6 位）'
  }
  if (lower.includes('signup disabled')) {
    return '注册已关闭，请联系管理员'
  }
  if (lower.includes('user banned') || lower.includes('banned')) {
    return '账号已被封禁，请联系管理员'
  }
  if (lower.includes('recovery') && lower.includes('expired')) {
    return '重置链接已过期，请重新发起'
  }
  if (lower.includes('error sending') && lower.includes('email')) {
    return '邮件发送失败，请稍后重试或联系管理员'
  }
  if (lower.includes('error sending') && lower.includes('sms')) {
    return '短信发送失败，请稍后重试或检查手机号'
  }
  if (lower.includes('sms') && lower.includes('disabled')) {
    return '短信服务未开通，请使用邮箱登录'
  }
  if (lower.includes('phone') && (lower.includes('disabled') || lower.includes('unsupported'))) {
    return '手机号登录未开通，请使用邮箱登录'
  }
  return raw ? `操作失败：${raw}` : '操作失败，请重试'
}

/* ========= 校验工具 ========= */
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
const PHONE_RE = /^1[3-9]\d{9}$/
const AGREEMENT_KEY = 'gd-admissions-agreement-accepted-v1'

function isValidEmail(s) { return EMAIL_RE.test(String(s).trim()) }
function isValidPhone(p) { return PHONE_RE.test(String(p).trim()) }

/* ========= 倒计时 hook ========= */
function useCountdown(initial = 0) {
  const [seconds, setSeconds] = useState(initial)
  const timerRef = useRef(null)
  useEffect(function () {
    if (seconds <= 0) {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
      return
    }
    timerRef.current = setInterval(function () {
      setSeconds(function (s) { return s > 0 ? s - 1 : 0 })
    }, 1000)
    return function () { if (timerRef.current) clearInterval(timerRef.current) }
  }, [seconds])
  return { seconds, start: useCallback(function (s) { setSeconds(s) }, []), stop: useCallback(function () { setSeconds(0) }, []) }
}

/* ========= Esc 关闭 hook ========= */
function useEscapeClose(active, onClose) {
  useEffect(function () {
    if (!active) return
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return function () { window.removeEventListener('keydown', onKey) }
  }, [active, onClose])
}

export default function Login({ onLogin }) {
  const [tab, setTab] = useState('otp')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [phoneCode, setPhoneCode] = useState('')
  const [step, setStep] = useState('email')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  // 找回密码弹窗
  const [showReset, setShowReset] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetMsg, setResetMsg] = useState('')
  const [resetErr, setResetErr] = useState('')
  const [resetLoading, setResetLoading] = useState(false)

  // 协议 modal
  const [showAgreement, setShowAgreement] = useState(false)
  const [agreementType, setAgreementType] = useState('terms') // 'terms' | 'privacy'

  // 倒计时
  const emailCountdown = useCountdown(0)
  const phoneCountdown = useCountdown(0)

  // Esc 关闭弹窗
  useEscapeClose(showReset, function () { setShowReset(false) })
  useEscapeClose(showAgreement, function () { setShowAgreement(false) })

  // 自动 focus 第一个输入框
  const firstInputRef = useRef(null)
  useEffect(function () {
    if (firstInputRef.current) firstInputRef.current.focus()
  }, [tab, step])

  /* ========= 邮箱登录（OTP 验证码） ========= */

  async function handleSendOtp(e) {
    e?.preventDefault?.()
    setError(''); setMessage('')
    if (!email || !isValidEmail(email)) {
      setError('请输入有效的邮箱地址'); return
    }
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      })
      if (error) throw error
      setMessage('✅ 验证码已发送，请检查邮箱（包含垃圾邮件）')
      setStep('sent')
      emailCountdown.start(60)
    } catch (err) {
      setError(localizeError(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyOtp(e) {
    e?.preventDefault?.()
    setError('')
    if (!otpCode || otpCode.length < 6) { setError('请输入 6 位验证码'); return }
    setLoading(true)
    try {
      const { error } = await supabase.auth.verifyOtp({ email, token: otpCode, type: 'email' })
      if (error) throw error
      onLogin()
    } catch (err) {
      setError(localizeError(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleResendOtp() {
    if (emailCountdown.seconds > 0) return
    setError(''); setMessage(''); setOtpCode('')
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email, options: { shouldCreateUser: true },
      })
      if (error) throw error
      setMessage('✅ 验证码已重新发送')
      emailCountdown.start(60)
    } catch (err) {
      setError(localizeError(err))
    } finally {
      setLoading(false)
    }
  }

  /* ========= 密码登录 ========= */

  async function handlePasswordLogin(e) {
    e?.preventDefault?.()
    setError('')
    if (!email || !isValidEmail(email)) {
      setError('请输入有效的邮箱地址'); return
    }
    if (!password) { setError('请输入密码'); return }
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      onLogin()
    } catch (err) {
      setError(localizeError(err))
    } finally {
      setLoading(false)
    }
  }

  /* ========= 找回密码 ========= */

  async function handleResetPassword(e) {
    e?.preventDefault?.()
    setResetErr(''); setResetMsg('')
    if (!resetEmail || !isValidEmail(resetEmail)) {
      setResetErr('请输入有效的邮箱地址'); return
    }
    setResetLoading(true)
    try {
      const redirectTo = window.location.origin + window.location.pathname
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, { redirectTo })
      if (error) throw error
      setResetMsg('✅ 重置链接已发送，请检查邮箱（包含垃圾邮件）')
    } catch (err) {
      setResetErr(localizeError(err))
    } finally {
      setResetLoading(false)
    }
  }

  function openReset() {
    setShowReset(true)
    setResetEmail(email || '')
    setResetErr(''); setResetMsg('')
  }

  function closeReset() {
    setShowReset(false)
    // 成功后回到登录页：清除密码字段避免误用
    if (resetMsg) setPassword('')
  }

  /* ========= 手机号登录 ========= */

  async function handleSendPhoneOtp(e) {
    e?.preventDefault?.()
    setError(''); setMessage('')
    if (!isValidPhone(phone)) { setError('请输入有效的 11 位手机号'); return }
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOtp({ phone })
      if (error) throw error
      setMessage('✅ 验证码已发送，请检查手机短信')
      setStep('phone-sent')
      phoneCountdown.start(60)
    } catch (err) {
      setError(localizeError(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyPhoneOtp(e) {
    e?.preventDefault?.()
    setError('')
    if (!phoneCode || phoneCode.length < 4) { setError('请输入短信验证码'); return }
    setLoading(true)
    try {
      const { error } = await supabase.auth.verifyOtp({ phone, token: phoneCode, type: 'sms' })
      if (error) throw error
      onLogin()
    } catch (err) {
      setError(localizeError(err))
    } finally {
      setLoading(false)
    }
  }

  /* ========= 协议 / 隐私 ========= */

  function openAgreement(type) {
    setAgreementType(type)
    setShowAgreement(true)
  }

  function acceptAgreement() {
    try { localStorage.setItem(AGREEMENT_KEY, '1') } catch (e) {}
    setShowAgreement(false)
  }

  /* ========= 通用 ========= */

  function resetOtp() {
    setStep('email'); setOtpCode(''); setPhoneCode('')
    setError(''); setMessage('')
    emailCountdown.stop()
  }

  function switchTab(next) {
    setTab(next); resetOtp()
  }

  // 实时校验提示
  const emailHint = email && !isValidEmail(email) ? '邮箱格式不正确' : ''
  const phoneHint = phone && phone.length >= 11 && !isValidPhone(phone) ? '手机号格式不正确' : ''

  // a11y: id 关联
  const errorId = 'login-error-region'

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="seal">粤</div>
        <p className="eyebrow">Guangdong Application Guide</p>
        <h1>广东省高考志愿填报指南</h1>
        <p className="login-copy">面向广东考生与家长的志愿筛选、风险分层和草案管理工具。</p>

        {/* 切换标签 */}
        <div className="login-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'otp'}
            className={tab === 'otp' ? 'login-tab active' : 'login-tab'}
            onClick={function () { switchTab('otp') }}
          >邮箱登录</button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'password'}
            className={tab === 'password' ? 'login-tab active' : 'login-tab'}
            onClick={function () { switchTab('password') }}
          >密码登录</button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'phone'}
            className={tab === 'phone' ? 'login-tab active' : 'login-tab'}
            onClick={function () { switchTab('phone') }}
          >手机登录</button>
        </div>

        {/* 屏幕阅读器用的 live region，集中广播错误 */}
        <div id={errorId} aria-live="polite" className="sr-only">
          {error || message}
        </div>

        {tab === 'password' ? (
          /* ====== 密码登录 ====== */
          <form onSubmit={handlePasswordLogin} noValidate>
            <label htmlFor="login-email">邮箱</label>
            <input id="login-email" ref={tab === 'password' ? firstInputRef : null}
              type="email" placeholder="请输入邮箱地址" value={email}
              onChange={function (e) { setEmail(e.target.value); if (error) setError('') }}
              aria-invalid={!!emailHint || (error && /邮箱/.test(error))}
              aria-describedby={emailHint ? 'email-hint' : undefined}
              onInvalid={function (e) { e.preventDefault(); setError('请输入有效的邮箱地址') }} required />
            {emailHint && <p id="email-hint" className="login-hint warn">{emailHint}</p>}

            <label htmlFor="login-password">密码</label>
            <input id="login-password" type="password" placeholder="请输入密码（至少 6 位）" value={password}
              onChange={function (e) { setPassword(e.target.value); if (error) setError('') }}
              onInvalid={function (e) { e.preventDefault(); setError('请输入密码') }} required />

            {error && <p className="login-error" role="alert">{error}</p>}

            <button type="submit" disabled={loading} className="login-submit-btn">
              {loading ? <><span className="spinner" aria-hidden="true" /> 登录中…</> : '登录'}
            </button>

            <p className="login-hint">
              <button type="button" className="link-btn" onClick={openReset}>忘记密码？</button>
              <span className="dot">·</span>
              首次使用？通过「邮箱登录」自动创建账号
            </p>
          </form>
        ) : tab === 'phone' ? (
          /* ====== 手机登录 ====== */
          step === 'phone-sent' ? (
            <form onSubmit={handleVerifyPhoneOtp} noValidate>
              {message && <p className="login-success">{message}</p>}
              <p className="login-sent-text">验证码已发送至手机 <strong>{phone}</strong></p>

              <label htmlFor="phone-code">短信验证码</label>
              <input id="phone-code" ref={firstInputRef} type="text" inputMode="numeric" pattern="[0-9]*" maxLength="6"
                placeholder="请输入短信验证码" value={phoneCode}
                onChange={function (e) { setPhoneCode(e.target.value.replace(/\D/g, '')); if (error) setError('') }}
                onInvalid={function (e) { e.preventDefault(); setError('请输入短信验证码') }} required autoFocus />

              {error && <p className="login-error" role="alert">{error}</p>}

              <button type="submit" disabled={loading || phoneCode.length < 4} className="login-submit-btn">
                {loading ? <><span className="spinner" aria-hidden="true" /> 验证中…</> : '验证登录'}
              </button>
              <p className="login-hint">
                <button type="button" className="link-btn" onClick={resetOtp}>更换手机号</button>
                <span className="dot">·</span>
                {phoneCountdown.seconds > 0
                  ? <span className="countdown">{phoneCountdown.seconds} 秒后可重新发送</span>
                  : <button type="button" className="link-btn" onClick={handleSendPhoneOtp} disabled={loading}>重新发送</button>}
              </p>
            </form>
          ) : (
            <form onSubmit={handleSendPhoneOtp} noValidate>
              <label htmlFor="login-phone">手机号</label>
              <input id="login-phone" ref={firstInputRef} type="tel" inputMode="numeric" pattern="1[3-9][0-9]{9}"
                maxLength="11" placeholder="请输入 11 位手机号" value={phone}
                onChange={function (e) { setPhone(e.target.value.replace(/\D/g, '')); if (error) setError('') }}
                aria-invalid={!!phoneHint || (error && /手机号/.test(error))}
                aria-describedby={phoneHint ? 'phone-hint' : undefined}
                onInvalid={function (e) { e.preventDefault(); setError('请输入有效的 11 位手机号') }} required />
              {phoneHint && <p id="phone-hint" className="login-hint warn">{phoneHint}</p>}

              {error && <p className="login-error" role="alert">{error}</p>}

              <button type="submit" disabled={loading || phoneCountdown.seconds > 0} className="login-submit-btn">
                {loading
                  ? <><span className="spinner" aria-hidden="true" /> 发送中…</>
                  : phoneCountdown.seconds > 0
                    ? <>{phoneCountdown.seconds} 秒后可重新发送</>
                    : '获取短信验证码'}
              </button>
              <p className="login-hint">支持中国大陆 11 位手机号，未注册将自动创建账号</p>
            </form>
          )
        ) : step === 'email' ? (
          /* ====== 邮箱登录 — 输入邮箱 ====== */
          <form onSubmit={handleSendOtp} noValidate>
            <label htmlFor="login-otp-email">邮箱</label>
            <input id="login-otp-email" ref={firstInputRef} type="email" placeholder="请输入邮箱地址" value={email}
              onChange={function (e) { setEmail(e.target.value); if (error) setError('') }}
              aria-invalid={!!emailHint || (error && /邮箱/.test(error))}
              aria-describedby={emailHint ? 'otp-email-hint' : undefined}
              onInvalid={function (e) { e.preventDefault(); setError('请输入有效的邮箱地址') }} required />
            {emailHint && <p id="otp-email-hint" className="login-hint warn">{emailHint}</p>}

            {error && <p className="login-error" role="alert">{error}</p>}

            <button type="submit" disabled={loading || emailCountdown.seconds > 0} className="login-submit-btn">
              {loading
                ? <><span className="spinner" aria-hidden="true" /> 发送中…</>
                : emailCountdown.seconds > 0
                  ? <>{emailCountdown.seconds} 秒后可重新发送</>
                  : '获取验证码'}
            </button>
            <p className="login-hint">验证码将发送到您的邮箱（未注册将自动创建账号）</p>
          </form>
        ) : (
          /* ====== 邮箱登录 — 输入验证码 ====== */
          <form onSubmit={handleVerifyOtp} noValidate>
            {message && <p className="login-success">{message}</p>}

            <p className="login-sent-text">验证码已发送至 <strong>{email}</strong></p>

            <label htmlFor="otp-code">验证码</label>
            <input id="otp-code" ref={firstInputRef} type="text" inputMode="numeric" pattern="[0-9]*" maxLength="6"
              placeholder="请输入 6 位验证码" value={otpCode}
              onChange={function (e) { setOtpCode(e.target.value.replace(/\D/g, '')); if (error) setError('') }}
              onInvalid={function (e) { e.preventDefault(); setError('请输入 6 位数字验证码') }} required autoFocus />

            {error && <p className="login-error" role="alert">{error}</p>}

            <button type="submit" disabled={loading || otpCode.length !== 6} className="login-submit-btn">
              {loading ? <><span className="spinner" aria-hidden="true" /> 验证中…</> : '验证登录'}
            </button>

            <p className="login-hint">
              未收到？
              <button type="button" className="link-btn" onClick={resetOtp}>更换邮箱</button>
              <span className="dot">·</span>
              {emailCountdown.seconds > 0
                ? <span className="countdown">{emailCountdown.seconds} 秒后可重新发送</span>
                : <button type="button" className="link-btn" onClick={handleResendOtp} disabled={loading}>重新发送</button>}
            </p>
          </form>
        )}

        {/* 协议 / 隐私政策 */}
        <p className="login-agreement">
          登录即代表您已阅读并同意
          <button type="button" className="link-btn" onClick={function () { openAgreement('terms') }}>《用户协议》</button>
          和
          <button type="button" className="link-btn" onClick={function () { openAgreement('privacy') }}>《隐私政策》</button>
        </p>
      </section>

      {/* 忘记密码弹窗 */}
      {showReset && (
        <div className="modal-backdrop" onClick={closeReset}>
          <div className="modal" onClick={function (e) { e.stopPropagation() }} role="dialog" aria-modal="true" aria-labelledby="reset-title">
            <h3 id="reset-title">找回密码</h3>
            <p className="modal-hint">输入注册邮箱，我们将发送重置链接给您</p>
            {resetErr && <p className="login-error" role="alert">{resetErr}</p>}
            {resetMsg && (
              <>
                <p className="login-success">{resetMsg}</p>
                <p className="modal-hint" style={{ marginTop: 8 }}>请到邮箱中点击链接重置密码，然后回到登录页用新密码登录。</p>
              </>
            )}
            <form onSubmit={handleResetPassword} noValidate>
              <label htmlFor="reset-email">邮箱</label>
              <input id="reset-email" type="email" placeholder="请输入注册时使用的邮箱" value={resetEmail}
                onChange={function (e) { setResetEmail(e.target.value); if (resetErr) setResetErr('') }}
                onInvalid={function (e) { e.preventDefault(); setResetErr('请输入有效的邮箱地址') }} required autoFocus={!resetMsg} />
              <div className="modal-actions">
                {resetMsg ? (
                  <button type="button" className="login-submit-btn" onClick={closeReset}>返回登录</button>
                ) : (
                  <>
                    <button type="button" className="ghost-btn" onClick={closeReset}>取消</button>
                    <button type="submit" disabled={resetLoading} className="login-submit-btn">
                      {resetLoading ? <><span className="spinner" aria-hidden="true" /> 发送中…</> : '发送重置链接'}
                    </button>
                  </>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 协议弹窗 */}
      {showAgreement && (
        <div className="modal-backdrop" onClick={function () { setShowAgreement(false) }}>
          <div className="modal" onClick={function (e) { e.stopPropagation() }} role="dialog" aria-modal="true" aria-labelledby="agreement-title">
            <h3 id="agreement-title">{agreementType === 'terms' ? '用户协议' : '隐私政策'}</h3>
            <div className="modal-body">
              {agreementType === 'terms' ? (
                <>
                  <p>欢迎使用「广东省高考志愿填报指南」（以下简称"本服务"）。使用本服务即表示您同意以下条款：</p>
                  <p><strong>1. 服务内容</strong>：本服务基于历年录取数据提供志愿筛选与风险评估参考，结果仅供参考，不构成任何录取承诺。</p>
                  <p><strong>2. 数据来源</strong>：所有数据均来自广东省教育考试院公开资料及院校招生章程，数据可能存在滞后，请以官方公告为准。</p>
                  <p><strong>3. 用户行为</strong>：您应妥善保管账号与密码，因密码泄露导致的损失由您自行承担。</p>
                  <p><strong>4. 免责声明</strong>：本服务对因使用本工具产生的任何报考决策后果不承担责任。</p>
                </>
              ) : (
                <>
                  <p>我们非常重视您的隐私。本协议说明我们如何收集、使用和保护您的个人信息：</p>
                  <p><strong>1. 收集信息</strong>：仅在注册时收集您提供的邮箱或手机号，用于身份验证和收藏同步。</p>
                  <p><strong>2. 使用方式</strong>：所收集信息仅用于为您提供志愿填报相关服务，不会用于商业广告或转售给第三方。</p>
                  <p><strong>3. 数据存储</strong>：账号与收藏数据存储于 Supabase 云服务（境外服务器），采用业界标准的加密传输与访问控制。</p>
                  <p><strong>4. 您的权利</strong>：您可随时通过注销账号要求删除所有个人数据。</p>
                </>
              )}
            </div>
            <div className="modal-actions">
              <button type="button" className="ghost-btn" onClick={function () { setShowAgreement(false) }}>关闭</button>
              <button type="button" className="login-submit-btn" onClick={acceptAgreement}>我已阅读并同意</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
