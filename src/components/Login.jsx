export default function Login({ onLogin }) {
  return (
    <main className="login-page">
      <section className="login-card">
        <div className="seal">粤</div>
        <p className="eyebrow">Guangdong Application Guide</p>
        <h1>广东省高考志愿填报指南</h1>
        <p className="login-copy">面向广东考生与家长的志愿筛选、风险分层和草案管理工具。</p>
        <label>手机号</label>
        <input placeholder="请输入手机号" />
        <label>验证码</label>
        <input placeholder="原型阶段任意输入" />
        <button onClick={onLogin}>进入志愿工作台</button>
      </section>
    </main>
  )
}
