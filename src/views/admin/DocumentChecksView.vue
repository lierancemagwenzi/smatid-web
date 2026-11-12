<template>
  <div>
    <p class="muted intro">
      Every document clients proofread, with what was found. The files themselves aren’t kept. When you learn whether a document
      was genuine or doctored (from the issuer, or the applicant), label it: the tamper classifier is trained on labelled checks,
      and only weighs in on verdicts once it beats the rules on real ones.
    </p>
    <p v-if="error" class="form-error">{{ error }}</p>

    <section class="card model">
      <div class="card-header">
        <h2>Tamper classifier</h2>
        <span class="badge" :class="status.model?.usable ? 'ok' : 'warn'">{{ status.model ? (status.model.usable ? `Version ${status.model.version} in use` : `Version ${status.model.version}, not in use`) : 'No model yet' }}</span>
      </div>
      <div class="card-body stats">
        <div><strong>{{ status.checks ?? '—' }}</strong><span class="muted small">documents checked</span></div>
        <div><strong>{{ status.labelled ?? '—' }}</strong><span class="muted small">labelled</span></div>
        <div><strong>{{ status.doctored ?? '—' }}</strong><span class="muted small">labelled doctored</span></div>
        <template v-if="status.model">
          <div><strong>{{ pct(status.model.metrics?.model?.accuracy) }}</strong><span class="muted small">model accuracy</span></div>
          <div><strong>{{ pct(status.model.metrics?.rules?.accuracy) }}</strong><span class="muted small">rules accuracy</span></div>
          <div><strong>{{ status.model.samples?.real ?? 0 }} / {{ status.model.samples?.synthetic ?? 0 }}</strong><span class="muted small">real / generated trained on</span></div>
        </template>
      </div>
      <div class="card-body foot">
        <span class="muted small">
          <template v-if="status.model">
            Trained {{ when(status.model.trained_at) }}, tested on
            {{ {held_out: 'held-back real documents', held_out_with_synthetic: 'held-back documents including generated ones', training_set: 'its own training documents'}[status.model.metrics?.tested_on] }}.
            <template v-if="!status.model.usable"> Its probability shows in reports, but verdicts stay the rules’ until it beats them on real labelled documents.</template>
          </template>
          <template v-else>No model yet. Run <code>npm run docmodel:train</code> on the server.</template>
          Retrain with <code>npm run docmodel:train</code> after labelling.
        </span>
        <button class="btn btn-secondary btn-sm" type="button" :disabled="reloading" @click="reload">{{ reloading ? 'Reloading…' : 'Reload model' }}</button>
      </div>
    </section>

    <div class="toolbar">
      <div class="filters">
        <select v-model="filters.labelled" class="select" aria-label="Labelled">
          <option value="">All documents</option>
          <option value="0">Needs a label</option>
          <option value="1">Labelled</option>
        </select>
        <select v-model="filters.verdict" class="select" aria-label="Verdict">
          <option value="">Any verdict</option>
          <option value="suspicious">Suspicious</option>
          <option value="review">Review</option>
          <option value="clean">Clean</option>
        </select>
      </div>
      <span class="muted small">{{ total }} {{ total === 1 ? 'document' : 'documents' }}</span>
    </div>

    <section class="card">
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr><th>When</th><th>Client</th><th>File</th><th>Type</th><th>Verdict</th><th>Main finding</th><th>Model</th><th>Label</th></tr>
          </thead>
          <tbody>
            <tr v-for="c in checks" :key="c.check_id" class="clickable" @click="open(c)">
              <td class="nowrap">{{ when(c.created_at) }}</td>
              <td>{{ c.client?.name || '—' }}</td>
              <td>{{ c.filename || c.reference || '—' }}<div class="muted small">{{ c.pages }} {{ c.pages === 1 ? 'page' : 'pages' }}</div></td>
              <td class="small">{{ TYPES[c.doc_type] || c.doc_type }}</td>
              <td><span class="badge" :class="tone(c.verdict)">{{ c.verdict }}</span> <span class="muted small">{{ c.score }}</span></td>
              <td class="small">{{ c.top[0] || '—' }}</td>
              <td class="small">{{ c.model ? `${Math.round(c.model.tampered_probability * 100)}%` : '—' }}</td>
              <td><span v-if="c.label" class="badge" :class="c.label.verdict === 'doctored' ? 'bad' : 'ok'">{{ c.label.verdict }}</span><span v-else class="muted small">—</span></td>
            </tr>
          </tbody>
        </table>
        <p v-if="!loading && !checks.length" class="empty">No documents here.</p>
        <div v-if="loading" class="empty"><span class="spinner" style="display:inline-block"></span></div>
      </div>
      <div v-if="total > perPage" class="pager">
        <button class="btn btn-ghost btn-sm" type="button" :disabled="page <= 1" @click="page--">← Newer</button>
        <span class="muted small">Page {{ page }} of {{ Math.ceil(total / perPage) }}</span>
        <button class="btn btn-ghost btn-sm" type="button" :disabled="page * perPage >= total" @click="page++">Older →</button>
      </div>
    </section>

    <ModalDialog v-if="current" :title="`Document check ${current.check_id}`" width="900px" @close="current = null">
      <div class="detail">
        <div class="head">
          <span class="badge" :class="tone(current.verdict)">{{ current.verdict }}</span>
          <strong>{{ current.score }}</strong>
          <span class="muted small">{{ current.filename || '—' }} · {{ TYPES[current.document?.type] }} · {{ current.client?.name }} · {{ when(current.created_at) }}</span>
        </div>
        <p v-if="current.model" class="small">
          Classifier v{{ current.model.version }}: <strong>{{ Math.round(current.model.tampered_probability * 100) }}%</strong> likely changed
          <span class="muted">({{ current.model.active ? 'in use' : 'not in use yet' }})</span>
        </p>
        <ul class="findings">
          <li v-for="(f, i) in current.findings" :key="i" :class="f.severity">
            <span class="sev">{{ f.severity }}</span> <strong>{{ f.title }}</strong>
            <div class="muted small">{{ f.detail }}<template v-if="f.page"> · page {{ f.page }}</template></div>
          </li>
          <li v-if="!current.findings.length" class="muted">Nothing found.</li>
        </ul>
        <dl class="facts small">
          <div><dt>Made with</dt><dd>{{ current.metadata?.creator || '—' }}</dd></div>
          <div><dt>Saved by</dt><dd>{{ current.metadata?.producer || '—' }}</dd></div>
          <div><dt>Saves on top</dt><dd>{{ current.structure?.incremental_updates ?? '—' }}</dd></div>
          <div><dt>SHA-256</dt><dd class="mono">{{ current.sha256?.slice(0, 16) }}…</dd></div>
        </dl>

        <div class="label-box">
          <h3>What was it really?</h3>
          <p class="muted small">Only label a document once you know: from the issuer, or the person who sent it. Labels train the classifier.</p>
          <textarea v-model="note" class="input" rows="2" maxlength="500" placeholder="How you know (optional), e.g. “Bank confirmed the balance was changed”"></textarea>
          <p v-if="labelError" class="form-error">{{ labelError }}</p>
          <div class="buttons">
            <button class="btn btn-sm" :class="current.label?.verdict === 'genuine' ? 'btn-primary' : 'btn-secondary'" type="button" :disabled="saving" @click="label('genuine')">Genuine</button>
            <button class="btn btn-sm" :class="current.label?.verdict === 'doctored' ? 'btn-primary' : 'btn-secondary'" type="button" :disabled="saving" @click="label('doctored')">Doctored</button>
            <button v-if="current.label" class="btn btn-ghost btn-sm" type="button" :disabled="saving" @click="label(null)">Remove label</button>
            <span v-if="current.label" class="muted small">Labelled {{ current.label.verdict }} {{ when(current.labelled_at) }}</span>
          </div>
        </div>
      </div>
    </ModalDialog>
  </div>
</template>

<script setup>
import {onMounted, reactive, ref, watch} from 'vue';
import {api} from '../../api.js';
import ModalDialog from '../../components/ModalDialog.vue';

const TYPES = {bank_statement: 'Bank statement', payslip: 'Payslip', utility_bill: 'Utility bill', other: 'Other'};

const status = ref({});
const checks = ref([]);
const total = ref(0);
const page = ref(1);
const perPage = 25;
const filters = reactive({labelled: '', verdict: ''});
const loading = ref(true);
const reloading = ref(false);
const error = ref('');
const current = ref(null);
const note = ref('');
const saving = ref(false);
const labelError = ref('');

const when = (d) => (d ? new Date(d).toLocaleString() : '—');
const pct = (v) => (v === null || v === undefined ? '—' : `${Math.round(v * 1000) / 10}%`);
const tone = (v) => ({clean: 'ok', review: 'warn', suspicious: 'bad'})[v] || '';

async function loadStatus() {
  try {
    status.value = await api.docModel();
  } catch (err) {
    error.value = err.message;
  }
}

async function load() {
  loading.value = true;
  try {
    const res = await api.documentChecks({labelled: filters.labelled, verdict: filters.verdict, page: page.value, per_page: perPage});
    checks.value = res.checks;
    total.value = res.total;
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

async function reload() {
  reloading.value = true;
  try {
    await api.reloadDocModel();
    await loadStatus();
  } catch (err) {
    error.value = err.message;
  } finally {
    reloading.value = false;
  }
}

async function open(row) {
  labelError.value = '';
  try {
    current.value = (await api.documentCheck(row.check_id)).check;
    note.value = current.value.label?.note || '';
  } catch (err) {
    error.value = err.message;
  }
}

async function label(verdict) {
  saving.value = true;
  labelError.value = '';
  try {
    current.value = (await api.labelDocumentCheck(current.value.check_id, {verdict, note: note.value.trim() || null})).check;
    await Promise.all([load(), loadStatus()]);
  } catch (err) {
    labelError.value = err.message;
  } finally {
    saving.value = false;
  }
}

watch(() => [filters.labelled, filters.verdict], () => {
  page.value = 1;
  load();
});
watch(page, load);
onMounted(() => Promise.all([loadStatus(), load()]));
</script>

<style scoped>
.intro { margin: 0 0 16px; max-width: 760px; }
.model { margin-bottom: 16px; }
.model h2 { font-size: 16px; margin: 0; }
.stats { display: flex; flex-wrap: wrap; gap: 28px; }
.stats div { display: grid; gap: 2px; }
.stats strong { font-size: 20px; }
.foot { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; border-top: 1px solid var(--line); padding-top: 14px; }
.toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 20px 0 12px; flex-wrap: wrap; }
.filters { display: flex; gap: 8px; flex-wrap: wrap; }
.filters .select { width: auto; }
.clickable { cursor: pointer; }
.clickable:hover td { background: var(--surface-2, rgba(127, 127, 127, 0.06)); }
.pager { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 12px; border-top: 1px solid var(--line); }
.detail { display: grid; gap: 12px; }
.head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.findings { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
.findings li { border-left: 3px solid var(--line); padding: 6px 10px; }
.findings li.high { border-left-color: #dc2626; }
.findings li.warning { border-left-color: #d97706; }
.sev { font-size: 11px; text-transform: uppercase; font-weight: 700; color: var(--muted); }
.facts { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 8px 16px; margin: 0; }
.facts dt { color: var(--muted); }
.facts dd { margin: 0; }
.mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
.label-box { border-top: 1px solid var(--line); padding-top: 12px; display: grid; gap: 8px; }
.label-box h3 { margin: 0; font-size: 15px; }
.label-box p { margin: 0; }
.buttons { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
</style>
