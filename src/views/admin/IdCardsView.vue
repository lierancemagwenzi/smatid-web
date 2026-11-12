<template>
  <div>
    <p class="muted intro">
      Every ID card scan keeps its picture and the text the phone read. Label scans (check the picture, fix what was read, save):
      each country's model is trained on its labelled scans, and takes over from the rules once it reads cards at least as well.
    </p>

    <p v-if="error" class="form-error">{{ error }}</p>

    <section v-for="c in countries" :key="c.code" class="card model">
      <div class="card-header">
        <h2>{{ c.name }} <span class="muted small">({{ c.code }})</span></h2>
        <span class="badge" :class="c.model?.usable ? 'ok' : 'warn'">{{ c.model?.usable ? `Model v${c.model.version} in use` : 'Read by rules' }}</span>
      </div>
      <div class="card-body stats">
        <div><strong>{{ c.scans }}</strong><span class="muted small">scans</span></div>
        <div><strong>{{ c.labelled }}</strong><span class="muted small">labelled</span></div>
        <template v-if="c.model">
          <div><strong>{{ pct(c.model.metrics?.model?.overall) }}</strong><span class="muted small">model accuracy</span></div>
          <div><strong>{{ pct(c.model.metrics?.rules?.overall) }}</strong><span class="muted small">rules accuracy</span></div>
          <div><strong>{{ c.model.samples?.train ?? '—' }}</strong><span class="muted small">trained on</span></div>
        </template>
      </div>
      <div class="card-body foot">
        <span class="muted small">
          <template v-if="c.model">Version {{ c.model.version }}, trained {{ when(c.model.trained_at) }}{{ c.model.active ? '' : ' — not active: too few scans, or no better than the rules' }}.</template>
          <template v-else>No model yet. Label at least 30 scans, then run <code>npm run idmodel:train -- --country {{ c.code }}</code> on the server.</template>
        </span>
        <button class="btn btn-secondary btn-sm" type="button" :disabled="reloading" @click="reload">{{ reloading ? 'Reloading…' : 'Reload models' }}</button>
      </div>
    </section>

    <div class="toolbar">
      <div class="filters">
        <select v-model="filters.labelled" class="select" aria-label="Labelled">
          <option value="">All scans</option>
          <option value="0">Needs a label</option>
          <option value="1">Labelled</option>
        </select>
        <select v-model="filters.status" class="select" aria-label="Status">
          <option value="">Any result</option>
          <option value="passed">Passed</option>
          <option value="review">Review</option>
          <option value="failed">Failed</option>
        </select>
      </div>
      <span class="muted small">{{ total }} {{ total === 1 ? 'scan' : 'scans' }}</span>
    </div>

    <section class="card">
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Card</th>
              <th>When</th>
              <th>Client</th>
              <th>Type</th>
              <th>ID number</th>
              <th>Name</th>
              <th>Result</th>
              <th>Read by</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in scans" :key="s.scan_id" class="clickable" @click="open(s)">
              <td class="thumb">
                <AuthImage v-if="s.has_image" :load="() => api.idCardImage(s.scan_id)" :alt="`ID card ${s.scan_id}`" width="84px" height="53px" />
                <span v-else class="muted small">—</span>
              </td>
              <td class="nowrap">{{ when(s.created_at) }}</td>
              <td>{{ s.client?.name || '—' }}</td>
              <td class="nowrap">{{ cardName(s.card_type) }} <span class="muted small">{{ s.country }}</span></td>
              <td class="mono nowrap">{{ s.document?.id_number || '—' }}</td>
              <td>{{ s.document?.full_name || '—' }}</td>
              <td><span class="badge" :class="statusClass(s.status)">{{ s.status }}</span></td>
              <td class="small muted nowrap">{{ s.extracted_by }}</td>
              <td class="actions">
                <button class="btn btn-ghost btn-sm" type="button" @click.stop="open(s)">{{ s.labelled ? 'Edit label' : 'Label' }}</button>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-if="!loading && !scans.length" class="empty">No scans here.</p>
        <div v-if="loading" class="empty"><span class="spinner" style="display:inline-block"></span></div>
      </div>
      <div v-if="total > perPage" class="pager">
        <button class="btn btn-ghost btn-sm" type="button" :disabled="page <= 1" @click="page--">← Newer</button>
        <span class="muted small">Page {{ page }} of {{ Math.ceil(total / perPage) }}</span>
        <button class="btn btn-ghost btn-sm" type="button" :disabled="page * perPage >= total" @click="page++">Older →</button>
      </div>
    </section>

    <ModalDialog v-if="current" :title="`ID card scan ${current.scan.scan_id}`" width="980px" @close="close">
      <div class="label-grid">
        <div class="picture">
          <img v-if="imageUrl" :src="imageUrl" alt="The ID card as photographed" />
          <p v-else class="empty">{{ imageError || 'Loading picture…' }}</p>
          <div class="result">
            <div class="result-head">
              <span class="badge" :class="statusClass(current.scan.status)">{{ current.scan.status }}</span>
              <span class="small muted">{{ cardName(current.scan.card_type) }} · {{ current.scan.client?.name || '—' }} · {{ when(current.scan.created_at) }}</span>
            </div>
            <p v-if="current.scan.failure_reason" class="small">Failed: <strong>{{ words(current.scan.failure_reason) }}</strong></p>
            <p v-if="current.scan.review_reasons?.length" class="small">For review: <strong>{{ current.scan.review_reasons.map(words).join(', ') }}</strong></p>
            <ul class="checks small">
              <li v-for="(v, k) in current.scan.checks || {}" :key="k" :class="v === true ? 'ok' : v === false ? 'bad' : 'muted'">
                {{ v === true ? '✓' : v === false ? '✗' : '–' }} {{ words(k) }}
              </li>
            </ul>
            <p v-if="current.scan.device" class="small muted">
              {{ current.scan.device.platform }} {{ current.scan.device.os_version }} · SDK {{ current.scan.device.sdk_version }}
              <template v-if="current.scan.device.scan_ms"> · scanned in {{ (current.scan.device.scan_ms / 1000).toFixed(1) }} s</template>
              · reference {{ current.scan.reference || '—' }}
            </p>
          </div>
          <FaceMatchPanel v-if="current.scan.face_match" :match="current.scan.face_match"
            :document-photo="() => api.idCardImage(current.scan.scan_id)" document-label="The ID card" />
          <details class="ocr">
            <summary class="small">What the phone read ({{ current.scan.ocr?.lines?.length || 0 }} lines)</summary>
            <ol class="small mono">
              <li v-for="(l, i) in current.scan.ocr?.lines || []" :key="i">{{ l.text }}</li>
            </ol>
          </details>
        </div>
        <form id="label-form" class="form" @submit.prevent="save">
          <p class="muted small">
            Prefilled with what was read ({{ current.scan.extracted_by }}). Correct anything wrong, leave blank what isn't on the card,
            and save.
          </p>
          <p v-if="formError" class="form-error" role="alert">{{ formError }}</p>
          <div class="field">
            <label for="l-type">Card type</label>
            <select id="l-type" v-model="form.card_type" class="select">
              <option value="">Not sure</option>
              <option v-for="t in current.profile?.card_types || []" :key="t" :value="t">{{ cardName(t) }}</option>
            </select>
          </div>
          <div v-for="f in current.profile?.fields || []" :key="f" class="field">
            <label :for="`l-${f}`">{{ fieldName(f) }}</label>
            <input :id="`l-${f}`" v-model="form.fields[f]" class="input" :class="{mono: f === 'id_number'}" maxlength="120"
              :placeholder="placeholder(f)" />
          </div>
        </form>
      </div>
      <template #footer>
        <button class="btn btn-secondary" type="button" @click="close">Cancel</button>
        <button class="btn btn-primary" type="submit" form="label-form" :disabled="saving">{{ saving ? 'Saving…' : 'Save label' }}</button>
      </template>
    </ModalDialog>
  </div>
</template>

<script setup>
import {onMounted, reactive, ref, watch} from 'vue';
import {api} from '../../api.js';
import ModalDialog from '../../components/ModalDialog.vue';
import AuthImage from '../../components/AuthImage.vue';
import FaceMatchPanel from '../../components/FaceMatchPanel.vue';

const countries = ref([]);
const scans = ref([]);
const total = ref(0);
const page = ref(1);
const perPage = 25;
const filters = reactive({labelled: '', status: ''});
const loading = ref(true);
const reloading = ref(false);
const error = ref('');

const current = ref(null);
const imageUrl = ref('');
const imageError = ref('');
const form = reactive({card_type: '', fields: {}});
const formError = ref('');
const saving = ref(false);

const CARD_NAMES = {metal: 'Metal ID', plastic: 'Plastic ID'};
const FIELD_NAMES = {
  id_number: 'ID number', surname: 'Surname', first_names: 'First names', date_of_birth: 'Date of birth',
  place_of_birth: 'Place of birth', village_of_origin: 'Village of origin', sex: 'Sex', date_of_issue: 'Date of issue',
};
const cardName = (t) => CARD_NAMES[t] || t || '—';
const fieldName = (f) => FIELD_NAMES[f] || f.replace(/_/g, ' ');
const placeholder = (f) => ({id_number: '63-1234567 D 42', date_of_birth: 'DD/MM/YYYY', date_of_issue: 'DD/MM/YYYY', sex: 'M or F'})[f] || '';
const pct = (v) => (v === null || v === undefined ? '—' : `${Math.round(v * 1000) / 10}%`);
const when = (d) => (d ? new Date(d).toLocaleString() : '—');
const words = (k) => String(k).replace(/_/g, ' ');
const statusClass = (s) => ({passed: 'ok', review: 'warn', failed: 'bad'})[s] || '';

async function loadModels() {
  try {
    countries.value = (await api.idModels()).countries;
  } catch (err) {
    error.value = err.message;
  }
}

async function loadScans() {
  loading.value = true;
  try {
    const res = await api.idCards({labelled: filters.labelled, status: filters.status, page: page.value, per_page: perPage});
    scans.value = res.scans;
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
    countries.value = (await api.reloadIdModels()).countries;
  } catch (err) {
    error.value = err.message;
  } finally {
    reloading.value = false;
  }
}

async function open(row) {
  formError.value = '';
  imageError.value = '';
  try {
    const detail = await api.idCard(row.scan_id);
    current.value = detail;
    // Start from the admin's earlier label, else from what was read.
    const label = detail.scan.label;
    const doc = detail.scan.document || {};
    form.card_type = (label ? label.card_type : detail.scan.card_type) || '';
    form.fields = Object.fromEntries((detail.profile?.fields || []).map((f) => [f, (label ? label.fields[f] : doc[f]) || '']));
    // The metal card's names come as one: put them where the admin can split them.
    if (!label && !doc.surname && !doc.first_names && doc.full_name) form.fields.surname = doc.full_name;
    api.idCardImage(row.scan_id)
      .then((blob) => (imageUrl.value = URL.createObjectURL(blob)))
      .catch(() => (imageError.value = 'The picture isn’t available.'));
  } catch (err) {
    error.value = err.message;
  }
}

function close() {
  if (imageUrl.value) URL.revokeObjectURL(imageUrl.value);
  imageUrl.value = '';
  current.value = null;
}

async function save() {
  saving.value = true;
  formError.value = '';
  try {
    const fields = Object.fromEntries(Object.entries(form.fields).filter(([, v]) => String(v || '').trim()));
    await api.labelIdCard(current.value.scan.scan_id, {card_type: form.card_type || null, fields});
    close();
    await Promise.all([loadScans(), loadModels()]);
  } catch (err) {
    formError.value = err.message;
  } finally {
    saving.value = false;
  }
}

watch(() => [filters.labelled, filters.status], () => {
  page.value = 1;
  loadScans();
});
watch(page, loadScans);
onMounted(() => Promise.all([loadModels(), loadScans()]));
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
.mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
.actions { text-align: right; }
.pager { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 12px; border-top: 1px solid var(--line); }
.thumb { width: 96px; }
.clickable { cursor: pointer; }
.clickable:hover td { background: var(--surface-2, rgba(127, 127, 127, 0.06)); }
.result { margin-top: 12px; display: grid; gap: 6px; }
.result p { margin: 0; }
.result-head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.checks { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 2px 12px; }
.checks .ok { color: var(--ok, #15803d); }
.checks .bad { color: var(--bad, #b91c1c); }
.label-grid { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr); gap: 20px; align-items: start; }
.picture img { width: 100%; max-height: 380px; object-fit: contain; background: #111; border-radius: 10px; border: 1px solid var(--line); display: block; }
.ocr { margin-top: 10px; }
.ocr ol { margin: 8px 0 0; padding-left: 22px; max-height: 220px; overflow: auto; }
@media (max-width: 760px) {
  .label-grid { grid-template-columns: 1fr; }
}
</style>
