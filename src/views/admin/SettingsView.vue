<template>
  <div class="page">
    <p class="muted intro">The SmatPay merchant account that receives clients’ credit top-ups.</p>

    <div v-if="loaded" class="status" :class="loaded.configured ? (loaded.plane === 'production' ? 'live' : 'sandbox') : 'off'">
      <strong>{{ loaded.configured ? (loaded.plane === 'production' ? 'Live: real payments' : 'Sandbox: payments are simulated') : 'Not set up: clients can’t top up' }}</strong>
      <span v-if="loaded.updated_at" class="small">Last changed {{ formatDateTime(loaded.updated_at) }}</span>
    </div>
    <p v-if="loaded && !loaded.encryption_ready" class="form-error">
      The API server has no <code>SETTINGS_ENCRYPTION_KEY</code>, so keys can’t be saved here yet. Add it to the API’s <code>.env</code> and restart it.
    </p>
    <p v-if="error" class="form-error">{{ error }}</p>

    <form v-if="loaded" class="card" @submit.prevent="save">
      <header class="card-header"><h2>SmatPay merchant</h2></header>
      <div class="card-body grid">
        <fieldset class="field wide">
          <legend>Mode</legend>
          <div class="modes">
            <label class="mode" :class="{on: form.plane === 'sandbox'}"><input v-model="form.plane" type="radio" value="sandbox" /><span><strong>Sandbox</strong><br /><span class="muted small">Simulated payments, for testing</span></span></label>
            <label class="mode" :class="{on: form.plane === 'production'}"><input v-model="form.plane" type="radio" value="production" /><span><strong>Production</strong><br /><span class="muted small">Real money</span></span></label>
          </div>
        </fieldset>

        <div class="field wide">
          <label for="api_url">SmatPay API address <SourceTag :source="loaded.sources.api_url" /></label>
          <input id="api_url" v-model="form.api_url" class="input" type="url" placeholder="https://…" />
        </div>
        <div class="field">
          <label for="merchant_id">Merchant ID <SourceTag :source="loaded.sources.merchant_id" /></label>
          <input id="merchant_id" v-model="form.merchant_id" class="input mono" />
        </div>
        <div class="field">
          <label for="account_id">Merchant account ID <SourceTag :source="loaded.sources.account_id" /></label>
          <input id="account_id" v-model="form.account_id" class="input mono" inputmode="numeric" />
        </div>

        <div v-for="k in keyFields" :key="k.field" class="field" :class="{dim: k.plane !== form.plane}">
          <label :for="k.field">{{ k.label }} <SourceTag :source="loaded.keys[k.field].source" /></label>
          <input
            :id="k.field" v-model="form[k.field]" class="input mono" type="password" autocomplete="new-password"
            :placeholder="loaded.keys[k.field].set ? `Saved (ends ${loaded.keys[k.field].last4}). Leave blank to keep.` : 'Not set'"
          />
          <button v-if="loaded.keys[k.field].source === 'admin'" class="link-btn" type="button" @click="clearKey(k.field)">Remove saved key</button>
        </div>

        <div class="field wide">
          <label for="profile_number">Payment profile number <SourceTag :source="loaded.sources.profile_number" /></label>
          <div class="row">
            <input id="profile_number" v-model="form.profile_number" class="input mono" inputmode="numeric" placeholder="7 digits" />
            <button class="btn btn-secondary" type="button" :disabled="testing" @click="check">{{ testing ? 'Checking…' : 'Check connection' }}</button>
          </div>
          <span class="muted small">Check connection signs in to SmatPay with the details above (saved or not) and lists the account’s payment profiles.</span>
        </div>

        <div v-if="result" class="wide result" :class="result.ok ? 'good' : 'bad'">
          <template v-if="result.ok">
            <p><strong>Connected to {{ result.merchant.name || 'the merchant' }}</strong> ({{ result.plane }}).
              <span v-if="!result.merchant.approved" class="badge warn">not approved by SmatPay yet</span>
              <span v-else class="badge ok">approved</span>
            </p>
            <p v-if="result.merchant.account_id && result.merchant.account_id !== form.account_id" class="small">
              Its account ID is <code>{{ result.merchant.account_id }}</code>.
              <button class="link-btn" type="button" @click="form.account_id = result.merchant.account_id">Use it</button>
            </p>
            <ul v-if="result.profiles.length" class="profiles">
              <li v-for="p in result.profiles" :key="p.number">
                <span><code>{{ p.number }}</code> {{ p.name }} <span v-if="!p.approved" class="badge warn">not approved</span></span>
                <button v-if="form.profile_number !== p.number" class="btn btn-secondary btn-sm" type="button" @click="form.profile_number = p.number">Use this profile</button>
                <span v-else class="badge ok">selected</span>
              </li>
            </ul>
            <p v-else class="small">This account has no payment profiles yet. Create one in SmatPay.</p>
          </template>
          <p v-else><strong>SmatPay didn’t accept these details.</strong> {{ result.message }}</p>
        </div>
      </div>
      <footer class="card-foot">
        <span v-if="saved" class="ok-text">Saved. Top-ups use the new details straight away.</span>
        <button class="btn btn-primary" type="submit" :disabled="saving">{{ saving ? 'Saving…' : 'Save' }}</button>
      </footer>
    </form>
    <div v-else-if="!error" class="empty"><span class="spinner" style="display:inline-block"></span></div>

    <p class="muted small">Keys are stored encrypted and are never shown again after saving. Anything left empty here uses the server’s <code>.env</code> settings, marked <em>from .env</em>.</p>
  </div>
</template>

<script setup>
import {h, onMounted, reactive, ref} from 'vue';
import {api} from '../../api.js';
import {formatDateTime} from '../../format.js';

const SourceTag = (props) => (props.source === 'environment' ? h('span', {class: 'badge plain env'}, 'from .env') : null);
SourceTag.props = ['source'];

const keyFields = [
  {field: 'sandbox_merchant_key', label: 'Sandbox merchant key', plane: 'sandbox'},
  {field: 'sandbox_api_key', label: 'Sandbox API key', plane: 'sandbox'},
  {field: 'production_merchant_key', label: 'Production merchant key', plane: 'production'},
  {field: 'production_api_key', label: 'Production API key', plane: 'production'},
];
const PLAIN = ['plane', 'api_url', 'merchant_id', 'account_id', 'profile_number'];

const loaded = ref(null);
const form = reactive({});
const error = ref('');
const saving = ref(false);
const saved = ref(false);
const testing = ref(false);
const result = ref(null);

function fill(view) {
  loaded.value = view;
  for (const f of PLAIN) form[f] = view[f] || '';
  for (const k of keyFields) form[k.field] = '';
}

onMounted(async () => {
  try {
    fill(await api.paymentSettings());
  } catch (err) {
    error.value = err.message;
  }
});

/** What changed: plain fields that differ, and keys that were typed in. */
function changes() {
  const out = {};
  for (const f of PLAIN) {
    const now = String(form[f] || '').trim();
    if (now !== String(loaded.value[f] || '')) out[f] = now || null;
  }
  for (const k of keyFields) if (form[k.field].trim()) out[k.field] = form[k.field].trim();
  return out;
}

async function save() {
  error.value = '';
  saved.value = false;
  const body = changes();
  if (!Object.keys(body).length) {
    error.value = 'Nothing has changed.';
    return;
  }
  saving.value = true;
  try {
    fill(await api.savePaymentSettings(body));
    saved.value = true;
  } catch (err) {
    error.value = err.message;
  } finally {
    saving.value = false;
  }
}

async function clearKey(field) {
  error.value = '';
  try {
    fill(await api.savePaymentSettings({[field]: null}));
  } catch (err) {
    error.value = err.message;
  }
}

async function check() {
  testing.value = true;
  result.value = null;
  error.value = '';
  const body = {};
  for (const f of PLAIN) if (String(form[f] || '').trim()) body[f] = String(form[f]).trim();
  for (const k of keyFields) if (form[k.field].trim()) body[k.field] = form[k.field].trim();
  try {
    result.value = await api.testPaymentSettings(body);
  } catch (err) {
    result.value = err.status === 400 && err.code !== 'api_url_must_be_https' ? {ok: false, message: err.extra?.message || err.message} : null;
    if (!result.value) error.value = err.message;
  } finally {
    testing.value = false;
  }
}
</script>

<style scoped>
.page { display: grid; gap: 18px; max-width: 900px; }
.intro { margin: 0; }
.status { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; padding: 14px 18px; border-radius: 12px; }
.status.sandbox { background: var(--warn-soft); color: #92400e; }
.status.live { background: var(--ok-soft); color: #065f46; }
.status.off { background: var(--bad-soft); color: var(--bad); }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px 20px; }
.wide { grid-column: 1 / -1; }
fieldset { border: 0; padding: 0; margin: 0; }
legend { font-size: 13px; font-weight: 600; color: var(--ink-2); margin-bottom: 6px; }
.modes { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.mode { display: flex; gap: 10px; align-items: flex-start; padding: 12px 14px; border: 2px solid var(--line); border-radius: 10px; cursor: pointer; }
.mode.on { border-color: var(--brand); background: var(--brand-soft); }
.mode input { margin-top: 3px; accent-color: var(--brand); }
.input.mono { font-family: var(--mono); font-size: 13px; }
.dim { opacity: 0.55; }
.row { display: flex; gap: 10px; }
.row .input { flex: 1; }
.env { margin-left: 6px; font-size: 11px; background: var(--surface-2); }
.link-btn { justify-self: start; padding: 0; border: 0; background: none; color: var(--brand); font: inherit; font-size: 12.5px; cursor: pointer; }
.result { padding: 14px 16px; border-radius: 10px; display: grid; gap: 8px; }
.result p { margin: 0; }
.result.good { background: var(--ok-soft); }
.result.bad { background: var(--bad-soft); color: var(--bad); }
.profiles { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
.profiles li { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 8px 10px; background: var(--surface); border-radius: 8px; }
.card-foot { display: flex; justify-content: flex-end; align-items: center; gap: 14px; padding: 14px 20px; border-top: 1px solid var(--line); background: var(--surface-2); border-radius: 0 0 var(--radius-lg) var(--radius-lg); }
.ok-text { color: var(--ok); font-size: 14px; }
@media (max-width: 700px) { .grid, .modes { grid-template-columns: 1fr; } .row { flex-direction: column; } }
</style>
