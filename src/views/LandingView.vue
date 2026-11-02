<template>
  <div class="landing">
    <header class="nav">
      <div class="wrap nav-inner">
        <RouterLink to="/" class="logo">
          <img src="/favicon.svg" alt="" width="28" height="28" />
          <span>Smatid <b>KYC</b></span>
        </RouterLink>
        <nav class="nav-links" aria-label="Main">
          <a href="#checks">Checks</a>
          <a href="#how">How it works</a>
          <a href="#pricing">Pricing</a>
          <RouterLink to="/docs/introduction">Documentation</RouterLink>
        </nav>
        <RouterLink to="/login" class="nav-signin">Sign in</RouterLink>
        <RouterLink to="/register" class="btn btn-primary btn-sm nav-cta">Start free trial</RouterLink>
      </div>
    </header>

    <section class="hero">
      <div class="wrap hero-inner">
        <div class="hero-copy">
          <p class="eyebrow">Know your customer, through one API</p>
          <h1>Check companies and screen people before you onboard them.</h1>
          <p class="lead">
            Smatid KYC confirms a company against the Zimbabwe company register and screens people and
            companies against global sanctions and politically exposed person (PEP) lists. You send one
            request and get a clear answer back.
          </p>
          <div class="hero-actions">
            <RouterLink to="/register" class="btn btn-primary btn-lg">Start free trial</RouterLink>
            <RouterLink to="/docs/introduction" class="btn btn-ghost btn-lg hero-secondary">Documentation →</RouterLink>
          </div>
        </div>

        <div class="code-card" aria-label="Example sanctions check">
          <div class="code-tabs">
            <span class="dot"></span><span class="dot"></span><span class="dot"></span>
            <span class="code-title">POST /api/kyc/sanctions</span>
          </div>
          <pre><code><span class="c-key">curl</span> -X POST {{ apiHost }}/api/kyc/sanctions \
  -H <span class="c-str">"Authorization: Bearer kyc_…"</span> \
  -d <span class="c-str">'{"type": "person",
       "first_name": "Jane", "last_name": "Moyo",
       "birth_date": "1984-06-02",
       "nationality": "zw"}'</span></code></pre>
          <div class="code-divider">Response</div>
          <pre><code>{
  <span class="c-key">"hit"</span>: <span class="c-bool">false</span>,
  <span class="c-key">"sanctioned"</span>: <span class="c-bool">false</span>,
  <span class="c-key">"pep"</span>: <span class="c-bool">false</span>,
  <span class="c-key">"matches"</span>: [],
  <span class="c-key">"checked_at"</span>: <span class="c-str">"2026-11-02T09:41:12Z"</span>
}</code></pre>
        </div>
      </div>
    </section>

    <section id="checks" class="section">
      <div class="wrap">
        <div class="section-head">
          <h2>The checks</h2>
          <p>Each check is a separate endpoint, so you can use only the ones you need.</p>
        </div>
        <div class="checks">
          <article v-for="check in checks" :key="check.name" class="check" :class="{soon: !check.live}">
            <div class="check-top">
              <span class="check-icon" aria-hidden="true" v-html="check.icon"></span>
              <span class="badge" :class="check.live ? 'ok' : 'plain'">{{ check.live ? 'Live' : 'Coming soon' }}</span>
            </div>
            <h3>{{ check.name }}</h3>
            <p>{{ check.text }}</p>
            <code v-if="check.endpoint" class="endpoint">{{ check.endpoint }}</code>
          </article>
        </div>
      </div>
    </section>

    <section id="how" class="section section-alt">
      <div class="wrap">
        <div class="section-head">
          <h2>How it works</h2>
        </div>
        <ol class="steps">
          <li>
            <span class="step-n">1</span>
            <h3>Get an access token</h3>
            <p>We set up your account and email you a private access token. Only a fingerprint of it is stored on our side.</p>
          </li>
          <li>
            <span class="step-n">2</span>
            <h3>Send a check</h3>
            <p>Call an endpoint over HTTPS with your token. Answers usually take a second or two.</p>
          </li>
          <li>
            <span class="step-n">3</span>
            <h3>Act on the answer</h3>
            <p>The answer is clear: verified or not, a hit or no hit, with the matched record and its source so your team can review it.</p>
          </li>
        </ol>
      </div>
    </section>

    <section id="api" class="section">
      <div class="wrap api">
        <div>
          <div class="section-head left">
            <h2>A small API</h2>
            <p>JSON in, JSON out. Every request carries your token in the <code>Authorization</code> header.</p>
          </div>
          <ul class="api-list">
            <li><code>GET /api/kyc/company/:number</code><span>Look up a company registration number on the CIPZ register.</span></li>
            <li><code>POST /api/kyc/sanctions</code><span>Screen a person or a company against sanctions and PEP lists.</span></li>
            <li><code>POST /api/kyc/liveness</code><span>Get a link for the person to prove they’re live; results come back by webhook.</span></li>
          </ul>
          <p class="muted small">
            A birth date and nationality for people, or a registration number for companies, cut down false matches a lot.
          </p>
          <RouterLink to="/docs/quickstart" class="btn btn-primary">Read the documentation →</RouterLink>
        </div>
        <div class="code-card light">
          <div class="code-tabs">
            <span class="code-title">GET /api/kyc/company/38043A0242025</span>
          </div>
          <pre><code>{
  <span class="c-key">"found"</span>: <span class="c-bool">true</span>,
  <span class="c-key">"name"</span>: <span class="c-str">"EXPRESS SMATPAY (PRIVATE) LIMITED"</span>,
  <span class="c-key">"number"</span>: <span class="c-str">"38043A0242025"</span>,
  <span class="c-key">"status"</span>: <span class="c-str">"Verified"</span>,
  <span class="c-key">"verified"</span>: <span class="c-bool">true</span>,
  <span class="c-key">"source"</span>: <span class="c-str">"CIPZ"</span>
}</code></pre>
        </div>
      </div>
    </section>

    <section id="pricing" class="section section-alt">
      <div class="wrap">
        <div class="section-head">
          <h2>Simple, pay-as-you-go pricing</h2>
          <p>Buy credits with EcoCash, InnBucks, O’mari or card through SmatPay, and spend them on checks. Paid credits never expire.</p>
        </div>
        <div v-if="pricing" class="pricing">
          <div class="price-card">
            <h3>What a check costs</h3>
            <ul class="price-list">
              <li v-for="c in pricing.checks" :key="c.key"><span>{{ c.name }}</span><strong>{{ c.credit_cost }} {{ c.credit_cost === 1 ? 'credit' : 'credits' }}</strong></li>
            </ul>
            <p class="muted small">Only completed checks are charged.</p>
          </div>
          <div class="price-card">
            <h3>Credit packs</h3>
            <ul class="price-list">
              <li v-for="p in pricing.packages" :key="p.credits"><span>{{ p.credits.toLocaleString() }} credits</span><strong>{{ pricing.currency }} {{ p.amount.toFixed(2) }}</strong></li>
            </ul>
            <p class="muted small">{{ pricing.currency }} {{ pricing.credit_price.toFixed(2) }} per credit, or buy any amount.</p>
          </div>
          <div class="price-card trial">
            <h3>Free trial</h3>
            <p class="trial-big">{{ pricing.trial.credits }} credits</p>
            <p>for {{ pricing.trial.days }} days to try every check. No card needed.</p>
            <RouterLink to="/register" class="btn btn-primary">Start free trial</RouterLink>
          </div>
        </div>
      </div>
    </section>

    <section id="contact" class="section cta">
      <div class="wrap cta-inner">
        <div>
          <h2>Ready to run checks?</h2>
          <p>Create an account, get your API token and run your first check in minutes.</p>
        </div>
        <div class="cta-actions">
          <RouterLink to="/register" class="btn btn-lg cta-btn">Start free trial</RouterLink>
          <a v-if="contactEmail" :href="`mailto:${contactEmail}?subject=Smatid%20KYC`" class="cta-mail">or email {{ contactEmail }}</a>
        </div>
      </div>
    </section>

    <footer class="footer">
      <div class="wrap footer-inner">
        <span>© {{ year }} Smatid</span>
        <span class="footer-links">
          <RouterLink to="/docs/introduction">Documentation</RouterLink>
          <RouterLink to="/login">Sign in</RouterLink>
          <RouterLink to="/admin">Admin</RouterLink>
        </span>
      </div>
    </footer>
  </div>
</template>

<script setup>
import {onMounted, ref} from 'vue';

const pricing = ref(null);
onMounted(async () => {
  try {
    const res = await fetch(`${(import.meta.env.VITE_API_URL || '').replace(/\/$/, '')}/api/public/pricing`);
    if (res.ok) pricing.value = await res.json();
  } catch {
    // The pricing section just stays empty.
  }
});
const contactEmail = import.meta.env.VITE_CONTACT_EMAIL || '';
const apiHost = (import.meta.env.VITE_API_URL || 'https://dev-api.smatid.com').replace(/\/$/, '');
const year = new Date().getFullYear();

const icon = (path) =>
  `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;

const checks = [
  {
    name: 'Company registration',
    text: 'Confirm that a company exists on the CIPZ register, and get its registered name, address and status.',
    endpoint: 'GET /api/kyc/company/:number',
    live: true,
    icon: icon('<path d="M3 21h18M5 21V7l7-4 7 4v14M9 9h1m4 0h1M9 13h1m4 0h1M9 17h1m4 0h1"/>'),
  },
  {
    name: 'Sanctions & PEP screening',
    text: 'Screen people and companies against global sanctions lists and politically exposed persons, using OpenSanctions data.',
    endpoint: 'POST /api/kyc/sanctions',
    live: true,
    icon: icon('<path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6l8-3z"/><path d="M9 12l2 2 4-4"/>'),
  },
  {
    name: 'National ID extraction',
    text: 'Read the name, ID number and date of birth from a photo of a national ID card.',
    live: false,
    icon: icon('<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2"/><path d="M6 16c.6-1.4 1.7-2 3-2s2.4.6 3 2M14 10h4M14 13h3"/>'),
  },
  {
    name: 'Passport extraction',
    text: 'Read the details and machine-readable zone from a passport photo page.',
    live: false,
    icon: icon('<rect x="5" y="3" width="14" height="18" rx="2"/><circle cx="12" cy="10" r="3"/><path d="M9 17h6"/>'),
  },
  {
    name: 'Photo match',
    text: 'Compare a selfie with the photo on an ID document to confirm it’s the same person.',
    live: false,
    icon: icon('<circle cx="12" cy="9" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>'),
  },
  {
    name: 'Liveness',
    text: 'Send the person a link to a hosted page that checks a real person is in front of the camera, not a photo or a screen.',
    endpoint: 'POST /api/kyc/liveness',
    live: true,
    icon: icon('<path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2"/><circle cx="12" cy="12" r="3"/>'),
  },
];
</script>

<style scoped>
.landing { background: var(--surface); }
.wrap { max-width: 1120px; margin: 0 auto; padding: 0 24px; }

.nav {
  position: sticky;
  top: 0;
  z-index: 10;
  background: rgb(11 19 36 / 0.92);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid rgb(255 255 255 / 0.06);
}
.nav-inner { display: flex; align-items: center; gap: 28px; height: 64px; }
.logo { display: flex; align-items: center; gap: 10px; color: #fff; font-size: 17px; font-weight: 600; }
.logo:hover { text-decoration: none; }
.logo b { color: #93b4ff; font-weight: 700; }
.nav-links { display: flex; gap: 24px; margin-left: auto; }
.nav-links a { color: #cbd5e1; font-size: 14px; font-weight: 500; }
.nav-links a:hover { color: #fff; text-decoration: none; }
.nav-signin { color: #e2e8f0; font-size: 14px; font-weight: 600; }
.nav-signin:hover { color: #fff; text-decoration: none; }

.pricing { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
.price-card { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius-lg); padding: 24px; display: grid; gap: 12px; align-content: start; }
.price-card h3 { font-size: 17px; }
.price-card p { margin: 0; }
.price-list { list-style: none; margin: 0; padding: 0; display: grid; }
.price-list li { display: flex; justify-content: space-between; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--line); font-size: 14.5px; }
.price-list li:last-child { border-bottom: 0; }
.price-card.trial { background: linear-gradient(160deg, #eef3ff, #fff); border-color: #c7d6ff; }
.trial-big { font-size: 32px; font-weight: 700; color: var(--brand); }
.price-card .btn { justify-self: start; }
.cta-actions { display: grid; gap: 10px; justify-items: center; }
.cta-mail { color: #dbe6ff; font-size: 14px; }

.hero {
  background:
    radial-gradient(900px 500px at 85% -10%, rgb(29 78 216 / 0.45), transparent 60%),
    radial-gradient(700px 400px at -10% 110%, rgb(13 148 136 / 0.25), transparent 60%),
    var(--night);
  color: #fff;
  padding: 88px 0 96px;
}
.hero-inner { display: grid; grid-template-columns: 1.05fr 1fr; gap: 56px; align-items: center; }
.eyebrow { color: #93b4ff; font-weight: 600; font-size: 14px; margin: 0 0 16px; letter-spacing: 0.02em; }
.hero h1 { font-size: clamp(32px, 4.4vw, 50px); font-weight: 700; letter-spacing: -0.025em; }
.lead { color: #cbd5e1; font-size: 17px; margin: 22px 0 32px; max-width: 34em; }
.hero-actions { display: flex; flex-wrap: wrap; gap: 12px; }
.hero-secondary { color: #e2e8f0; }
.hero-secondary:hover { background: rgb(255 255 255 / 0.08) !important; }

.code-card {
  background: var(--night-2);
  border: 1px solid rgb(255 255 255 / 0.08);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  min-width: 0;
}
.code-card pre { margin: 0; padding: 18px 20px; overflow-x: auto; color: #e2e8f0; font-size: 13px; line-height: 1.7; }
.code-tabs { display: flex; align-items: center; gap: 6px; padding: 12px 16px; border-bottom: 1px solid rgb(255 255 255 / 0.06); }
.dot { width: 10px; height: 10px; border-radius: 50%; background: #334155; }
.code-title { margin-left: 8px; font-family: var(--mono); font-size: 12px; color: #94a3b8; }
.code-divider {
  padding: 6px 20px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #64748b;
  border-top: 1px solid rgb(255 255 255 / 0.06);
  border-bottom: 1px solid rgb(255 255 255 / 0.06);
}
.c-key { color: #93b4ff; }
.c-str { color: #5eead4; }
.c-bool { color: #fbbf24; }

.section { padding: 88px 0; }
.section-alt { background: var(--bg); border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
.section-head { text-align: center; max-width: 620px; margin: 0 auto 44px; }
.section-head.left { text-align: left; margin: 0 0 28px; }
.section-head h2 { font-size: clamp(26px, 3vw, 34px); font-weight: 700; }
.section-head p { color: var(--muted); font-size: 16px; margin: 12px 0 0; }

.checks { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
.check {
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  padding: 22px;
  background: var(--surface);
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.check:hover { border-color: var(--line-strong); box-shadow: var(--shadow); }
.check-top { display: flex; align-items: center; justify-content: space-between; }
.check-icon {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: 10px;
  background: var(--brand-soft);
  color: var(--brand);
}
.check.soon .check-icon { background: var(--surface-2); color: var(--muted); }
.check h3 { font-size: 17px; font-weight: 600; margin-top: 6px; }
.check p { margin: 0; color: var(--ink-2); font-size: 14px; flex: 1; }
.endpoint {
  align-self: flex-start;
  padding: 4px 8px;
  border-radius: 6px;
  background: var(--surface-2);
  color: var(--ink-2);
  font-size: 12px;
}

.steps { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
.steps li { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius-lg); padding: 24px; }
.step-n {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--brand);
  color: #fff;
  font-weight: 700;
  font-size: 14px;
  margin-bottom: 16px;
}
.steps h3 { font-size: 17px; font-weight: 600; margin-bottom: 8px; }
.steps p { margin: 0; color: var(--ink-2); font-size: 14px; }

.api { display: grid; grid-template-columns: 1fr 1fr; gap: 56px; align-items: center; }
.api-list { list-style: none; padding: 0; margin: 0 0 20px; display: grid; gap: 14px; }
.api-list li { display: grid; gap: 4px; padding: 14px 16px; border: 1px solid var(--line); border-radius: var(--radius); }
.api-list code { color: var(--brand); font-weight: 500; }
.api-list span { color: var(--ink-2); font-size: 14px; }

.cta { background: var(--brand); color: #fff; padding: 64px 0; }
.cta-inner { display: flex; align-items: center; justify-content: space-between; gap: 24px; flex-wrap: wrap; }
.cta h2 { font-size: 28px; font-weight: 700; }
.cta p { margin: 8px 0 0; color: #dbe6ff; }
.cta-btn { background: #fff; color: var(--brand); }
.cta-btn:hover { background: #eef3ff; }
.cta-note { font-weight: 600; color: #fff !important; }

.footer { background: var(--night); color: #94a3b8; font-size: 14px; }
.footer-inner { display: flex; justify-content: space-between; padding: 24px; }
.footer a { color: #cbd5e1; }
.footer-links { display: flex; gap: 20px; }

@media (max-width: 900px) {
  .hero { padding: 56px 0 64px; }
  .hero-inner, .api { grid-template-columns: 1fr; gap: 36px; }
  .checks, .steps { grid-template-columns: 1fr 1fr; }
  .nav-links { display: none; }
  .nav-signin { margin-left: auto; }
  .pricing { grid-template-columns: 1fr; }
  .section { padding: 64px 0; }
}
@media (max-width: 600px) {
  .wrap { padding: 0 16px; }
  .checks, .steps { grid-template-columns: 1fr; }
  .footer-inner { padding: 20px 16px; }
}
</style>
