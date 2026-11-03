<template>
  <section class="card billing">
    <header class="card-header">
      <h2>Credits</h2>
      <div class="actions">
        <button class="btn btn-secondary btn-sm" type="button" @click="openTrial">Change trial</button>
        <button class="btn btn-secondary btn-sm" type="button" @click="openAdjust">Add or remove credits</button>
        <button class="btn btn-primary btn-sm" type="button" @click="openTopup">Record top-up</button>
      </div>
    </header>
    <div class="balances">
      <div><span class="label">Available</span><strong class="big">{{ formatNumber(client.available_credits) }}</strong></div>
      <div><span class="label">Paid</span><strong>{{ formatNumber(client.credits) }}</strong></div>
      <div>
        <span class="label">Trial</span>
        <strong>{{ formatNumber(client.trial_credits) }}</strong>
        <span class="muted small">{{ client.trial_until ? (client.trial_active ? `until ${formatDate(client.trial_until)}` : `ended ${formatDate(client.trial_until)}`) : 'none' }}</span>
      </div>
      <div>
        <span class="label">Used, last 30 days</span>
        <strong>{{ usage ? formatNumber(usage.recent.credits_used) : '—' }}</strong>
        <span v-if="usage" class="muted small">{{ formatNumber(usage.all_time.credits_used) }} all time</span>
      </div>
      <div><span class="label">Signed up</span><strong class="via">{{ client.registered_via === 'self' ? 'Themselves' : 'By an admin' }}</strong></div>
    </div>

    <div class="tabs">
      <button v-for="t in TABS" :key="t.id" type="button" :class="{on: tab === t.id}" @click="tab = t.id">{{ t.label }}</button>
    </div>
    <p v-if="topupNotice" class="user-notice">{{ topupNotice }}</p>
    <p v-if="loadError" class="form-error pad">{{ loadError }}</p>
    <div class="table-wrap">
      <table v-if="tab === 'history'" class="table">
        <thead><tr><th>When</th><th>What</th><th class="num">Paid</th><th class="num">Trial</th><th class="num">Balance after</th></tr></thead>
        <tbody>
          <tr v-for="tx in transactions" :key="tx.id">
            <td class="nowrap muted">{{ formatDateTime(tx.created_at) }}</td>
            <td><span class="badge plain">{{ KIND[tx.kind] || tx.kind }}</span> <span class="small">{{ tx.description }}</span></td>
            <td class="num">{{ signed(tx.credits) }}</td>
            <td class="num">{{ signed(tx.trial_credits) }}</td>
            <td class="num">{{ formatNumber(tx.credits_after) }} + {{ formatNumber(tx.trial_credits_after) }}</td>
          </tr>
        </tbody>
      </table>
      <table v-else-if="tab === 'usage'" class="table">
        <thead><tr><th>Check</th><th class="num">Checks, 30 days</th><th class="num">Credits, 30 days</th><th class="num">Checks, all time</th><th class="num">Credits, all time</th><th class="num">Of which trial</th></tr></thead>
        <tbody>
          <tr v-for="row in usageRows" :key="row.check_type">
            <td>{{ checkName(row.check_type) }}</td>
            <td class="num">{{ formatNumber(row.recent.checks) }}</td>
            <td class="num">{{ formatNumber(row.recent.credits_used) }}</td>
            <td class="num">{{ formatNumber(row.all.checks) }}</td>
            <td class="num"><strong>{{ formatNumber(row.all.credits_used) }}</strong></td>
            <td class="num muted">{{ formatNumber(row.all.trial_credits) }}</td>
          </tr>
        </tbody>
      </table>
      <table v-else class="table">
        <thead><tr><th>When</th><th class="num">Credits</th><th>Amount</th><th>Method</th><th>Status</th><th>Reference</th></tr></thead>
        <tbody>
          <tr v-for="tp in topups" :key="tp.id">
            <td class="nowrap muted">{{ formatDateTime(tp.created_at) }}</td>
            <td class="num">{{ formatNumber(tp.credits) }}</td>
            <td class="nowrap">{{ tp.currency }} {{ tp.amount.toFixed(2) }}</td>
            <td>{{ topupMethod(tp.method) }}{{ tp.payment_reference && tp.method === 'MANUAL' ? ` · ${tp.payment_reference}` : '' }}{{ tp.payer_mobile ? ` · ${tp.payer_mobile}` : '' }}</td>
            <td><span class="badge" :class="TONE[tp.status]">{{ tp.status }}</span><div v-if="tp.failure_reason" class="muted small">{{ tp.failure_reason }}</div></td>
            <td><code class="small">{{ tp.reference }}</code></td>
          </tr>
        </tbody>
      </table>
      <p v-if="currentEmpty" class="empty">{{ EMPTY[tab] }}</p>
    </div>

    <ModalDialog v-if="toppingUp" title="Record a top-up" @close="toppingUp = false">
      <p class="muted small" style="margin:0">For a payment taken outside SmatPay, e.g. cash or a bank transfer. The credits are added at once and the top-up shows as paid in the client’s history.</p>
      <p v-if="formError" class="form-error">{{ formError }}</p>
      <form id="topup" class="form" @submit.prevent="recordTopup">
        <div class="field"><label for="tp-credits">Credits</label><input id="tp-credits" v-model.number="topupForm.credits" class="input" type="number" min="1" step="1" placeholder="e.g. 1000" required autofocus /></div>
        <div class="field">
          <label for="tp-amount">Amount received<span v-if="pricing"> ({{ pricing.currency }})</span></label>
          <input id="tp-amount" v-model="topupForm.amount" class="input" type="number" min="0" step="0.01" :placeholder="listPrice === null ? 'List price' : `${listPrice.toFixed(2)} at list price`" />
          <span class="muted small">Leave empty for the list price. Use 0 for free credits.</span>
        </div>
        <div class="field"><label for="tp-ref">Payment reference <span class="muted">(optional)</span></label><input id="tp-ref" v-model="topupForm.reference" class="input" maxlength="128" placeholder="e.g. bank transfer ref or receipt number" /></div>
        <div class="field"><label for="tp-note">Note <span class="muted">(optional)</span></label><input id="tp-note" v-model="topupForm.note" class="input" maxlength="150" placeholder="e.g. Cash paid at the office" /></div>
        <label class="check"><input v-model="topupForm.send_receipt" type="checkbox" :disabled="!client.email" /> Email a receipt{{ client.email ? ` to ${client.email}` : ' (the client has no email)' }}</label>
      </form>
      <template #footer>
        <button class="btn btn-secondary" type="button" @click="toppingUp = false">Cancel</button>
        <button class="btn btn-primary" type="submit" form="topup" :disabled="saving">{{ saving ? 'Saving…' : 'Add credits' }}</button>
      </template>
    </ModalDialog>

    <ModalDialog v-if="adjusting" title="Add or remove credits" @close="adjusting = false">
      <p class="muted small" style="margin:0">Changes paid credits. Use a minus sign to take credits away. The note shows in the client’s history.</p>
      <p v-if="formError" class="form-error">{{ formError }}</p>
      <form id="adjust" class="form" @submit.prevent="adjust">
        <div class="field"><label for="a-credits">Credits</label><input id="a-credits" v-model.number="adjustForm.credits" class="input" type="number" step="1" placeholder="e.g. 500 or -20" required autofocus /></div>
        <div class="field"><label for="a-note">Note</label><input id="a-note" v-model="adjustForm.note" class="input" maxlength="200" placeholder="e.g. Paid by bank transfer, invoice 1042" required /></div>
      </form>
      <template #footer>
        <button class="btn btn-secondary" type="button" @click="adjusting = false">Cancel</button>
        <button class="btn btn-primary" type="submit" form="adjust" :disabled="saving">{{ saving ? 'Saving…' : 'Save' }}</button>
      </template>
    </ModalDialog>

    <ModalDialog v-if="trialing" title="Change the trial" @close="trialing = false">
      <p class="muted small" style="margin:0">Trial credits count until the end of this day. Clear it to end the trial now.</p>
      <p v-if="formError" class="form-error">{{ formError }}</p>
      <form id="trial" class="form" @submit.prevent="saveTrial">
        <div class="field"><label for="t-until">Trial ends</label><input id="t-until" v-model="trialDate" class="input" type="date" /></div>
      </form>
      <template #footer>
        <button class="btn btn-secondary" type="button" @click="trialing = false">Cancel</button>
        <button class="btn btn-primary" type="submit" form="trial" :disabled="saving">{{ saving ? 'Saving…' : 'Save' }}</button>
      </template>
    </ModalDialog>
  </section>
</template>

<script setup>
import {computed, reactive, ref, watch} from 'vue';
import {api} from '../api.js';
import {checkName, formatDate, formatDateTime, formatNumber, topupMethod} from '../format.js';
import ModalDialog from './ModalDialog.vue';

const props = defineProps({client: {type: Object, required: true}});
const emit = defineEmits(['updated']);

const TABS = [{id: 'history', label: 'Credit history'}, {id: 'usage', label: 'Credit usage'}, {id: 'topups', label: 'Top-ups'}];
const KIND = {trial_grant: 'Free trial', trial_expiry: 'Trial ended', topup: 'Top-up', usage: 'Check', refund: 'Refund', adjustment: 'Adjustment'};
const TONE = {paid: 'ok', pending: '', failed: 'bad', expired: 'warn', refunded: 'warn'};
const EMPTY = {history: 'No credit changes yet.', usage: 'No credits spent on checks yet.', topups: 'No top-ups yet.'};

const tab = ref('history');
const transactions = ref([]);
const topups = ref([]);
const loadError = ref('');
const adjusting = ref(false);
const trialing = ref(false);
const saving = ref(false);
const formError = ref('');
const adjustForm = reactive({credits: null, note: ''});
const trialDate = ref('');

const usage = ref(null);
const toppingUp = ref(false);
const topupForm = reactive({credits: null, amount: '', reference: '', note: '', send_receipt: true});
const topupNotice = ref('');
const pricing = ref(null);
const listPrice = computed(() => (pricing.value && Number.isInteger(topupForm.credits) && topupForm.credits > 0
  ? Math.round(topupForm.credits * pricing.value.credit_price * 100) / 100 : null));

/** One row per check, 30-day and all-time figures side by side. */
const usageRows = computed(() => {
  if (!usage.value) return [];
  const none = {checks: 0, credits_used: 0, trial_credits: 0};
  const recent = new Map(usage.value.recent.by_check.map((c) => [c.check_type, c]));
  return usage.value.all_time.by_check.map((all) => ({check_type: all.check_type, all, recent: recent.get(all.check_type) || none}));
});

const currentEmpty = computed(() => ({history: transactions, usage: usageRows, topups})[tab.value].value.length === 0);
const signed = (n) => (n > 0 ? `+${formatNumber(n)}` : n < 0 ? formatNumber(n) : '—');

async function loadAll() {
  const id = props.client.id;
  loadError.value = '';
  try {
    const [t, p, c] = await Promise.all([
      api.clientTransactions(id, {per_page: 50}), api.clientTopups(id, {per_page: 50}), api.clientCreditUsage(id, {days: 30}),
    ]);
    usage.value = c;
    transactions.value = t.transactions;
    topups.value = p.topups;
  } catch (err) {
    loadError.value = `Couldn’t load the credit details: ${err.message}`;
  }
}
watch(() => props.client.id, loadAll, {immediate: true});

async function openTopup() {
  Object.assign(topupForm, {credits: null, amount: '', reference: '', note: '', send_receipt: Boolean(props.client.email)});
  formError.value = '';
  toppingUp.value = true;
  // Only for the list-price hint; the server works the price out itself.
  if (!pricing.value) pricing.value = await api.pricing().catch(() => null);
}

async function recordTopup() {
  saving.value = true;
  formError.value = '';
  try {
    const {client, email_sent} = await api.manualTopup(props.client.id, {
      credits: Number(topupForm.credits),
      amount: topupForm.amount === '' || topupForm.amount === null ? undefined : Number(topupForm.amount),
      reference: topupForm.reference.trim() || undefined,
      note: topupForm.note.trim() || undefined,
      send_receipt: topupForm.send_receipt,
    });
    emit('updated', client);
    topupNotice.value = topupForm.send_receipt && !email_sent ? 'The credits were added, but the receipt email couldn’t be sent.' : '';
    toppingUp.value = false;
    tab.value = 'topups';
    await loadAll();
  } catch (err) {
    formError.value = err.message;
  } finally {
    saving.value = false;
  }
}

function openAdjust() {
  Object.assign(adjustForm, {credits: null, note: ''});
  formError.value = '';
  adjusting.value = true;
}

function openTrial() {
  trialDate.value = props.client.trial_until ? new Date(props.client.trial_until).toISOString().slice(0, 10) : '';
  formError.value = '';
  trialing.value = true;
}

async function adjust() {
  saving.value = true;
  formError.value = '';
  try {
    const {client} = await api.adjustCredits(props.client.id, Number(adjustForm.credits), adjustForm.note.trim());
    emit('updated', client);
    adjusting.value = false;
    await loadAll();
  } catch (err) {
    formError.value = err.message;
  } finally {
    saving.value = false;
  }
}

async function saveTrial() {
  saving.value = true;
  formError.value = '';
  try {
    // The end of the chosen day, in UTC.
    const until = trialDate.value ? `${trialDate.value}T23:59:59Z` : null;
    const {client} = await api.updateClient(props.client.id, {trial_until: until});
    emit('updated', client);
    trialing.value = false;
  } catch (err) {
    formError.value = err.message;
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.actions { display: flex; gap: 8px; flex-wrap: wrap; }
.balances { display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px; padding: 18px 20px; border-bottom: 1px solid var(--line); }
.balances > div { display: grid; gap: 2px; }
.label { font-size: 12px; color: var(--muted); font-weight: 600; }
.balances strong { font-size: 20px; font-variant-numeric: tabular-nums; }
.balances .big { font-size: 28px; color: var(--brand); }
.via { font-size: 15px !important; }
.tabs { display: flex; gap: 4px; padding: 10px 14px; border-bottom: 1px solid var(--line); }
.tabs button:not(.btn) { border: 0; background: transparent; padding: 6px 12px; border-radius: 8px; font: inherit; font-size: 13.5px; font-weight: 600; color: var(--muted); cursor: pointer; }
.user-notice { margin: 0; padding: 10px 16px; font-size: 13.5px; background: var(--warn-soft); color: #92400e; border-bottom: 1px solid var(--line); }
.tabs button.on:not(.btn) { background: var(--brand-soft); color: var(--brand); }
.form { display: grid; gap: 14px; }
.pad { margin: 0; padding: 10px 16px; }
.check { display: flex; align-items: center; gap: 8px; font-size: 14px; }
@media (max-width: 700px) { .balances { grid-template-columns: 1fr 1fr; } }
</style>
