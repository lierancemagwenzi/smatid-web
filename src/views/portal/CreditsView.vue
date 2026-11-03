<template>
  <div class="page">
    <div class="balances">
      <div class="card bal main">
        <span class="label">Available now</span>
        <span class="value">{{ formatNumber(portal.client?.available_credits) }}</span>
        <span class="note">credits</span>
      </div>
      <div class="card bal">
        <span class="label">Paid credits</span>
        <span class="value small-v">{{ formatNumber(portal.client?.credits) }}</span>
        <span class="note">never expire</span>
      </div>
      <div class="card bal">
        <span class="label">Trial credits</span>
        <span class="value small-v">{{ formatNumber(portal.client?.trial_credits) }}</span>
        <span class="note">{{ portal.client?.trial_active ? `until ${formatDate(portal.client.trial_until)}` : portal.client?.trial_until ? `trial ended ${formatDate(portal.client.trial_until)}` : 'no trial' }}</span>
      </div>
    </div>

    <!-- 1. Choose, 2. Pay -->
    <section v-if="!active" class="card">
      <header class="card-header"><h2>Top up</h2><span v-if="options?.sandbox" class="badge warn">Sandbox: payments are simulated</span></header>
      <div v-if="!options" class="card-body"><span class="spinner"></span></div>
      <div v-else-if="!options.available" class="card-body">
        <p class="muted">Top-ups aren’t available right now. Please try again later, or contact Smatid.</p>
      </div>
      <form v-else class="card-body topup" @submit.prevent="pay">
        <div>
          <h3>1. How many credits?</h3>
          <div class="packs">
            <button
              v-for="p in options.packages" :key="p.credits" type="button" class="pack"
              :class="{on: !custom && credits === p.credits}" @click="choosePack(p.credits)"
            >
              <span class="pack-credits">{{ formatNumber(p.credits) }}</span>
              <span class="pack-label">credits</span>
              <span class="pack-price">{{ money(p.amount) }}</span>
            </button>
            <button type="button" class="pack" :class="{on: custom}" @click="custom = true">
              <span class="pack-credits">Other</span>
              <span class="pack-label">amount</span>
            </button>
          </div>
          <div v-if="custom" class="field custom">
            <label for="credits">Credits ({{ formatNumber(options.min_credits) }} to {{ formatNumber(options.max_credits) }})</label>
            <input id="credits" v-model.number="credits" class="input" type="number" :min="options.min_credits" :max="options.max_credits" step="1" />
          </div>
          <p class="muted small">{{ money(options.credit_price) }} per credit.</p>
        </div>

        <div>
          <h3>2. How do you want to pay?</h3>
          <div class="methods">
            <label v-for="m in options.methods" :key="m.id" class="method" :class="{on: method === m.id}">
              <input v-model="method" type="radio" name="method" :value="m.id" />
              <span class="method-name">{{ m.label }}</span>
              <span class="method-how">{{ HOW[m.kind] }}</span>
            </label>
          </div>
          <div v-if="needsMobile" class="field">
            <label for="mobile">{{ chosen.label }} number</label>
            <input id="mobile" v-model="mobile" class="input" type="tel" inputmode="tel" placeholder="e.g. 0771234567" autocomplete="tel" />
          </div>
        </div>

        <div class="summary">
          <div>
            <span class="muted small">You’ll pay</span>
            <strong class="total">{{ validCredits ? money(price) : '—' }}</strong>
            <span class="muted small">for {{ validCredits ? formatNumber(credits) : '…' }} credits</span>
          </div>
          <button class="btn btn-primary btn-lg" type="submit" :disabled="busy || !validCredits || !method">{{ busy ? 'Starting payment…' : 'Pay with SmatPay' }}</button>
        </div>
        <p v-if="error" class="form-error" role="alert">{{ error }}</p>
      </form>
    </section>

    <!-- 3. Finish paying, and wait for it -->
    <section v-else class="card pay-card">
      <template v-if="active.status === 'pending'">
        <div class="pay-head">
          <span class="spinner"></span>
          <div>
            <h2>Waiting for your payment</h2>
            <p class="muted small">{{ formatNumber(active.credits) }} credits · {{ money(active.amount) }} · reference {{ active.reference }}</p>
          </div>
        </div>
        <div class="pay-step">
          <template v-if="activeMethod.kind === 'prompt'">
            <p class="big">Check your phone ({{ active.payer_mobile }}).</p>
            <p>Approve the {{ activeMethod.label }} prompt for <strong>{{ money(active.amount) }}</strong> with your PIN. If no prompt comes up in a minute, dial your wallet’s menu to approve pending payments.</p>
          </template>
          <template v-else-if="activeMethod.kind === 'code' && active.payment_code">
            <p>Open the InnBucks app and pay with this code:</p>
            <p class="code">{{ active.payment_code }}</p>
          </template>
          <template v-else-if="active.payment_url">
            <p>Pay by card on SmatPay’s secure page. It opens in a new tab; come back here when you’re done.</p>
            <a :href="active.payment_url" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-lg">Open the payment page</a>
          </template>
          <p v-else>Follow the instructions from {{ activeMethod.label }} to finish paying.</p>
        </div>
        <p class="muted small">This page updates by itself as soon as the payment comes through. It can take a minute.</p>
        <button class="btn btn-ghost btn-sm" type="button" @click="active = null">Start again</button>
      </template>

      <template v-else-if="active.status === 'paid'">
        <div class="done ok">
          <div class="icon">✓</div>
          <h2>Payment received</h2>
          <p>{{ formatNumber(active.credits) }} credits were added. You now have <strong>{{ formatNumber(portal.client?.available_credits) }}</strong> credits.</p>
          <button class="btn btn-primary" type="button" @click="active = null">Done</button>
        </div>
      </template>

      <template v-else>
        <div class="done bad">
          <div class="icon">!</div>
          <h2>The payment didn’t go through</h2>
          <p>{{ active.failure_reason || 'It was declined, cancelled or not finished in time.' }} You haven’t been charged for anything that failed.</p>
          <button class="btn btn-primary" type="button" @click="active = null">Try again</button>
        </div>
      </template>
    </section>

    <section id="history" class="card">
      <header class="card-header">
        <h2>History</h2>
        <div class="tabs">
          <button type="button" :class="{on: tab === 'credits'}" @click="tab = 'credits'">Credits</button>
          <button type="button" :class="{on: tab === 'topups'}" @click="tab = 'topups'">Top-ups</button>
        </div>
      </header>
      <div class="table-wrap">
        <table v-if="tab === 'credits'" class="table">
          <thead><tr><th>When</th><th>What</th><th class="num">Change</th><th class="num">Balance after</th></tr></thead>
          <tbody>
            <tr v-for="tx in transactions" :key="tx.id">
              <td class="nowrap muted">{{ formatDateTime(tx.created_at) }}</td>
              <td><span class="badge plain" :class="KIND[tx.kind]?.tone">{{ KIND[tx.kind]?.label || tx.kind }}</span> <span class="small">{{ tx.description }}</span></td>
              <td class="num nowrap" :class="change(tx) > 0 ? 'plus' : 'minus'">{{ change(tx) > 0 ? '+' : '' }}{{ formatNumber(change(tx)) }}</td>
              <td class="num nowrap">{{ formatNumber(tx.credits_after + tx.trial_credits_after) }}</td>
            </tr>
          </tbody>
        </table>
        <table v-else class="table">
          <thead><tr><th>When</th><th>Credits</th><th>Amount</th><th>Paid with</th><th>Status</th><th>Reference</th></tr></thead>
          <tbody>
            <tr v-for="tp in topups" :key="tp.id">
              <td class="nowrap muted">{{ formatDateTime(tp.created_at) }}</td>
              <td class="num">{{ formatNumber(tp.credits) }}</td>
              <td class="nowrap">{{ tp.currency }} {{ tp.amount.toFixed(2) }}</td>
              <td>{{ methodLabel(tp.method) }}</td>
              <td><span class="badge" :class="STATUS[tp.status]?.tone">{{ STATUS[tp.status]?.label || tp.status }}</span></td>
              <td><code class="small">{{ tp.reference }}</code></td>
            </tr>
          </tbody>
        </table>
        <p v-if="tab === 'credits' && !transactions.length" class="empty">No credit changes yet.</p>
        <p v-if="tab === 'topups' && !topups.length" class="empty">No top-ups yet.</p>
      </div>
    </section>
  </div>
</template>

<script setup>
import {computed, onBeforeUnmount, onMounted, ref, watch} from 'vue';
import {portalApi} from '../../portal/api.js';
import {portal, portalUpdate} from '../../portal/session.js';
import {formatDate, formatDateTime, formatNumber, topupMethod} from '../../format.js';

const HOW = {prompt: 'Approve a prompt on your phone', code: 'Pay a code in the app', card: 'Card, on a secure page'};
const KIND = {
  trial_grant: {label: 'Free trial', tone: 'info'},
  trial_expiry: {label: 'Trial ended', tone: ''},
  topup: {label: 'Top-up', tone: 'ok'},
  usage: {label: 'Check', tone: ''},
  refund: {label: 'Refund', tone: 'ok'},
  adjustment: {label: 'Adjustment', tone: 'warn'},
};
const STATUS = {
  pending: {label: 'Waiting', tone: ''},
  paid: {label: 'Paid', tone: 'ok'},
  failed: {label: 'Failed', tone: 'bad'},
  expired: {label: 'Not paid', tone: 'warn'},
  refunded: {label: 'Refunded', tone: 'warn'},
};

const options = ref(null);
const credits = ref(0);
const custom = ref(false);
const method = ref('');
const mobile = ref('');
const busy = ref(false);
const error = ref('');
const active = ref(null);
const tab = ref('credits');
const transactions = ref([]);
const topups = ref([]);
let timer = null;

const chosen = computed(() => (options.value ? options.value.methods.find((m) => m.id === method.value) : null) || {});
const needsMobile = computed(() => Boolean(chosen.value.needs_mobile));
const activeMethod = computed(() => (options.value && active.value ? options.value.methods.find((m) => m.id === active.value.method) : null) || {label: '', kind: ''});
const validCredits = computed(() => options.value && Number.isInteger(credits.value) && credits.value >= options.value.min_credits && credits.value <= options.value.max_credits);
const price = computed(() => (options.value ? Math.round(credits.value * options.value.credit_price * 100) / 100 : 0));

const money = (amount) => `${options.value ? options.value.currency : ''} ${Number(amount || 0).toFixed(2)}`.trim();
const methodLabel = (id) => (options.value && options.value.methods.find((m) => m.id === id)?.label) || topupMethod(id);
const change = (tx) => tx.credits + tx.trial_credits;

function choosePack(n) {
  custom.value = false;
  credits.value = n;
}

async function loadHistory() {
  const [t, p] = await Promise.all([portalApi.transactions({per_page: 50}), portalApi.topups({per_page: 50})]);
  transactions.value = t.transactions;
  topups.value = p.topups;
}

async function refreshBalance() {
  try {
    portalUpdate(await portalApi.me());
  } catch {
    // Shown next time.
  }
}

async function pay() {
  error.value = '';
  if (needsMobile.value && !mobile.value.trim()) {
    error.value = `Enter your ${chosen.value.label} number.`;
    return;
  }
  busy.value = true;
  try {
    const {topup} = await portalApi.createTopup({credits: credits.value, method: method.value, mobile: mobile.value.trim() || undefined});
    active.value = topup;
    if (topup.payment_url && activeMethod.value.kind === 'card') window.open(topup.payment_url, '_blank', 'noopener');
    loadHistory().catch(() => {});
  } catch (err) {
    error.value = err.message;
  } finally {
    busy.value = false;
  }
}

// While a payment is waiting, ask every 4 seconds. The server also checks with SmatPay by itself.
watch(active, (now) => {
  clearInterval(timer);
  if (!now || now.status !== 'pending') return;
  timer = setInterval(async () => {
    try {
      const res = await portalApi.topup(now.id);
      if (res.topup.status !== 'pending') {
        active.value = res.topup;
        await refreshBalance();
        loadHistory().catch(() => {});
      }
    } catch {
      // Try again next time.
    }
  }, 4000);
});
onBeforeUnmount(() => clearInterval(timer));

onMounted(async () => {
  refreshBalance();
  try {
    options.value = await portalApi.topupOptions();
    if (options.value.packages.length) credits.value = options.value.packages[Math.min(1, options.value.packages.length - 1)].credits;
    else custom.value = true;
  } catch (err) {
    error.value = err.message;
  }
  loadHistory().catch(() => {});
});
</script>

<style scoped>
.page { display: grid; gap: 20px; }
.balances { display: grid; grid-template-columns: 1.3fr 1fr 1fr; gap: 14px; }
.bal { padding: 18px 20px; display: grid; gap: 2px; }
.bal.main { background: linear-gradient(135deg, #eef3ff, #fff); border-color: #c7d6ff; }
.label { font-size: 13px; color: var(--muted); font-weight: 600; }
.value { font-size: 34px; font-weight: 700; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
.small-v { font-size: 26px; }
.note { font-size: 12.5px; color: var(--muted); }

.topup { display: grid; gap: 26px; }
h3 { font-size: 15px; font-weight: 600; margin-bottom: 12px; }
.packs { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 10px; margin-bottom: 10px; }
.pack { display: grid; gap: 2px; padding: 14px; border: 2px solid var(--line); border-radius: 12px; background: var(--surface); text-align: left; cursor: pointer; font: inherit; }
.pack:hover { border-color: var(--line-strong); }
.pack.on { border-color: var(--brand); background: var(--brand-soft); }
.pack-credits { font-size: 20px; font-weight: 700; }
.pack-label { font-size: 12px; color: var(--muted); }
.pack-price { font-size: 14px; font-weight: 600; margin-top: 6px; color: var(--brand); }
.custom { max-width: 280px; margin-bottom: 8px; }
.methods { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 10px; margin-bottom: 14px; }
.method { position: relative; display: grid; gap: 2px; padding: 12px 14px 12px 40px; border: 2px solid var(--line); border-radius: 12px; cursor: pointer; }
.method.on { border-color: var(--brand); background: var(--brand-soft); }
.method input { position: absolute; left: 14px; top: 15px; accent-color: var(--brand); }
.method-name { font-weight: 600; }
.method-how { font-size: 12.5px; color: var(--muted); }
.methods + .field { max-width: 320px; }
.summary { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; padding: 16px 18px; border-radius: 12px; background: var(--surface-2); }
.summary > div { display: grid; }
.total { font-size: 26px; }

.pay-card { padding: 24px; display: grid; gap: 16px; }
.pay-head { display: flex; gap: 14px; align-items: center; }
.pay-head h2 { font-size: 18px; }
.pay-head p { margin: 2px 0 0; }
.pay-step { padding: 18px; border-radius: 12px; background: var(--surface-2); display: grid; gap: 10px; justify-items: start; }
.pay-step p { margin: 0; }
.big { font-size: 18px; font-weight: 600; }
.code { font-family: var(--mono); font-size: 30px; font-weight: 700; letter-spacing: 0.12em; padding: 10px 16px; border-radius: 10px; background: var(--surface); border: 1px dashed var(--line-strong); }
.done { display: grid; justify-items: center; text-align: center; gap: 10px; padding: 12px; }
.done p { margin: 0; max-width: 460px; }
.icon { width: 60px; height: 60px; border-radius: 50%; display: grid; place-items: center; color: #fff; font-size: 28px; font-weight: 700; }
.ok .icon { background: var(--ok); }
.bad .icon { background: var(--bad); }

.tabs { display: flex; gap: 4px; }
.tabs button { border: 0; background: transparent; padding: 6px 12px; border-radius: 8px; font: inherit; font-size: 13.5px; font-weight: 600; color: var(--muted); cursor: pointer; }
.tabs button.on { background: var(--brand-soft); color: var(--brand); }
.plus { color: var(--ok); font-weight: 600; }
.minus { color: var(--ink-2); }
@media (max-width: 800px) { .balances { grid-template-columns: 1fr; } }
</style>
