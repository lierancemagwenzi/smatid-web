<template>
  <section class="card billing">
    <header class="card-header">
      <h2>Credits</h2>
      <div class="actions">
        <button class="btn btn-secondary btn-sm" type="button" @click="openTrial">Change trial</button>
        <button class="btn btn-primary btn-sm" type="button" @click="openAdjust">Add or remove credits</button>
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
      <div><span class="label">Signed up</span><strong class="via">{{ client.registered_via === 'self' ? 'Themselves' : 'By an admin' }}</strong></div>
    </div>

    <div class="tabs">
      <button v-for="t in TABS" :key="t.id" type="button" :class="{on: tab === t.id}" @click="tab = t.id">{{ t.label }}</button>
    </div>
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
      <table v-else-if="tab === 'topups'" class="table">
        <thead><tr><th>When</th><th class="num">Credits</th><th>Amount</th><th>Method</th><th>Status</th><th>Reference</th></tr></thead>
        <tbody>
          <tr v-for="tp in topups" :key="tp.id">
            <td class="nowrap muted">{{ formatDateTime(tp.created_at) }}</td>
            <td class="num">{{ formatNumber(tp.credits) }}</td>
            <td class="nowrap">{{ tp.currency }} {{ tp.amount.toFixed(2) }}</td>
            <td>{{ tp.method }}{{ tp.payer_mobile ? ` · ${tp.payer_mobile}` : '' }}</td>
            <td><span class="badge" :class="TONE[tp.status]">{{ tp.status }}</span><div v-if="tp.failure_reason" class="muted small">{{ tp.failure_reason }}</div></td>
            <td><code class="small">{{ tp.reference }}</code></td>
          </tr>
        </tbody>
      </table>
      <table v-else class="table">
        <thead><tr><th>Name</th><th>Role</th><th>Status</th><th>Last signed in</th></tr></thead>
        <tbody>
          <tr v-for="u in users" :key="u.id">
            <td><strong>{{ u.name }}</strong><div class="muted small">{{ u.email }}</div></td>
            <td>{{ u.role === 'owner' ? 'Owner' : 'Member' }}</td>
            <td><span class="badge" :class="u.invited ? 'warn' : u.email_verified ? 'ok' : 'warn'">{{ u.invited ? 'Invited' : u.email_verified ? 'Active' : 'Email not confirmed' }}</span></td>
            <td class="muted nowrap">{{ formatDateTime(u.last_login_at) }}</td>
          </tr>
        </tbody>
      </table>
      <p v-if="currentEmpty" class="empty">{{ EMPTY[tab] }}</p>
    </div>

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
import {formatDate, formatDateTime, formatNumber} from '../format.js';
import ModalDialog from './ModalDialog.vue';

const props = defineProps({client: {type: Object, required: true}});
const emit = defineEmits(['updated']);

const TABS = [{id: 'history', label: 'Credit history'}, {id: 'topups', label: 'Top-ups'}, {id: 'users', label: 'Portal users'}];
const KIND = {trial_grant: 'Free trial', trial_expiry: 'Trial ended', topup: 'Top-up', usage: 'Check', refund: 'Refund', adjustment: 'Adjustment'};
const TONE = {paid: 'ok', pending: '', failed: 'bad', expired: 'warn', refunded: 'warn'};
const EMPTY = {history: 'No credit changes yet.', topups: 'No top-ups yet.', users: 'No portal users. Clients created before the portal have none.'};

const tab = ref('history');
const transactions = ref([]);
const topups = ref([]);
const users = ref([]);
const adjusting = ref(false);
const trialing = ref(false);
const saving = ref(false);
const formError = ref('');
const adjustForm = reactive({credits: null, note: ''});
const trialDate = ref('');

const currentEmpty = computed(() => ({history: transactions, topups, users})[tab.value].value.length === 0);
const signed = (n) => (n > 0 ? `+${formatNumber(n)}` : n < 0 ? formatNumber(n) : '—');

async function loadAll() {
  const id = props.client.id;
  const [t, p, u] = await Promise.all([api.clientTransactions(id, {per_page: 50}), api.clientTopups(id, {per_page: 50}), api.clientUsers(id)]);
  transactions.value = t.transactions;
  topups.value = p.topups;
  users.value = u.users;
}
watch(() => props.client.id, loadAll, {immediate: true});

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
.balances { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; padding: 18px 20px; border-bottom: 1px solid var(--line); }
.balances > div { display: grid; gap: 2px; }
.label { font-size: 12px; color: var(--muted); font-weight: 600; }
.balances strong { font-size: 20px; font-variant-numeric: tabular-nums; }
.balances .big { font-size: 28px; color: var(--brand); }
.via { font-size: 15px !important; }
.tabs { display: flex; gap: 4px; padding: 10px 14px; border-bottom: 1px solid var(--line); }
.tabs button { border: 0; background: transparent; padding: 6px 12px; border-radius: 8px; font: inherit; font-size: 13.5px; font-weight: 600; color: var(--muted); cursor: pointer; }
.tabs button.on { background: var(--brand-soft); color: var(--brand); }
.form { display: grid; gap: 14px; }
@media (max-width: 700px) { .balances { grid-template-columns: 1fr 1fr; } }
</style>
