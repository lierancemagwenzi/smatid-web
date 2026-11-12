<template>
  <div>
    <div class="toolbar">
      <div class="filters">
        <select v-model="filters.status" class="select" aria-label="Result">
          <option value="">Any result</option>
          <option value="passed">Passed</option>
          <option value="failed">Failed</option>
        </select>
      </div>
      <span class="muted small">{{ total }} {{ total === 1 ? 'scan' : 'scans' }}</span>
    </div>

    <p v-if="error" class="form-error">{{ error }}</p>

    <section class="card">
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Passport</th>
              <th>When</th>
              <th>Client</th>
              <th>Name</th>
              <th>Number</th>
              <th>Nationality</th>
              <th>Result</th>
              <th>Chip</th>
              <th>Face</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in scans" :key="s.scan_id" class="clickable" @click="open(s)">
              <td class="thumb">
                <AuthImage v-if="s.has_image" :load="() => api.passportImage(s.scan_id)" :alt="`Passport ${s.scan_id}`" width="84px" height="58px" />
                <span v-else class="muted small">—</span>
              </td>
              <td class="nowrap">{{ when(s.created_at) }}</td>
              <td>{{ s.client?.name || '—' }}</td>
              <td>{{ name(s.document) }}</td>
              <td class="mono nowrap">{{ s.document?.document_number || '—' }}</td>
              <td>{{ s.document?.nationality || '—' }}</td>
              <td><span class="badge" :class="tone(s.status)">{{ s.status }}</span></td>
              <td class="small">{{ s.chip ? s.chip.status : '—' }}</td>
              <td class="small">{{ s.face_match ? words(s.face_match.status) : '—' }}</td>
            </tr>
          </tbody>
        </table>
        <p v-if="!loading && !scans.length" class="empty">No passport scans yet.</p>
        <div v-if="loading" class="empty"><span class="spinner" style="display:inline-block"></span></div>
      </div>
      <div v-if="total > perPage" class="pager">
        <button class="btn btn-ghost btn-sm" type="button" :disabled="page <= 1" @click="page--">← Newer</button>
        <span class="muted small">Page {{ page }} of {{ Math.ceil(total / perPage) }}</span>
        <button class="btn btn-ghost btn-sm" type="button" :disabled="page * perPage >= total" @click="page++">Older →</button>
      </div>
    </section>

    <ModalDialog v-if="current" :title="`Passport scan ${current.scan_id}`" width="980px" @close="current = null">
      <div class="detail">
        <div class="pictures">
          <figure>
            <AuthImage v-if="current.has_image" :load="() => api.passportImage(current.scan_id)" alt="The passport photo page" />
            <span v-else class="muted small">No picture kept</span>
            <figcaption class="small muted">Photo page</figcaption>
          </figure>
          <figure v-if="current.chip?.has_photo">
            <AuthImage :load="() => api.passportChipPhoto(current.scan_id)" alt="The photo stored on the chip" height="220px" />
            <figcaption class="small muted">Chip photo</figcaption>
          </figure>
        </div>
        <div>
          <div class="result-head">
            <span class="badge" :class="tone(current.status)">{{ current.status }}</span>
            <span class="small muted">{{ current.client?.name || '—' }} · {{ when(current.created_at) }} · reference {{ current.reference || '—' }}</span>
          </div>
          <p v-if="current.failure_reason" class="small">Failed: <strong>{{ words(current.failure_reason) }}</strong></p>
          <dl class="facts">
            <template v-for="(label, key) in FIELDS" :key="key">
              <div v-if="current.document?.[key]"><dt>{{ label }}</dt><dd :class="{mono: key === 'document_number'}">{{ current.document[key] }}</dd></div>
            </template>
          </dl>
          <ul class="checks small">
            <li v-for="(v, k) in current.checks || {}" :key="k" :class="v === true ? 'ok' : v === false ? 'bad' : 'muted'">
              {{ v === true ? '✓' : v === false ? '✗' : '–' }} {{ words(k) }}
            </li>
          </ul>
          <template v-if="current.chip">
            <h3 class="sub">Chip <span class="badge" :class="current.chip.verified ? 'ok' : current.chip.status === 'failed' ? 'bad' : 'warn'">{{ current.chip.status }}</span></h3>
            <ul class="checks small">
              <li v-for="(v, k) in current.chip.checks || {}" :key="k" :class="v === true ? 'ok' : v === false ? 'bad' : 'muted'">
                {{ v === true ? '✓' : v === false ? '✗' : '–' }} {{ words(k) }}
              </li>
            </ul>
          </template>
          <p v-if="current.device" class="small muted">{{ current.device.platform }} {{ current.device.os_version }} · SDK {{ current.device.sdk_version }}</p>
          <details v-if="Array.isArray(current.mrz)" class="small">
            <summary>MRZ as read</summary>
            <pre class="mono">{{ current.mrz.join('\n') }}</pre>
          </details>
        </div>
      </div>
      <FaceMatchPanel v-if="current.face_match" :match="current.face_match"
        :document-photo="() => (current.chip?.has_photo ? api.passportChipPhoto(current.scan_id) : api.passportImage(current.scan_id))"
        :document-label="current.chip?.has_photo ? 'Chip photo' : 'Photo page'" />
    </ModalDialog>
  </div>
</template>

<script setup>
import {onMounted, reactive, ref, watch} from 'vue';
import {api} from '../../api.js';
import ModalDialog from '../../components/ModalDialog.vue';
import AuthImage from '../../components/AuthImage.vue';
import FaceMatchPanel from '../../components/FaceMatchPanel.vue';

const FIELDS = {
  surname: 'Surname', given_names: 'Given names', document_number: 'Passport number', nationality: 'Nationality',
  issuing_country: 'Issued by', birth_date: 'Date of birth', sex: 'Sex', expiry_date: 'Expires', personal_number: 'Personal number',
};

const scans = ref([]);
const total = ref(0);
const page = ref(1);
const perPage = 25;
const filters = reactive({status: ''});
const loading = ref(true);
const error = ref('');
const current = ref(null);

const when = (d) => (d ? new Date(d).toLocaleString() : '—');
const words = (k) => String(k).replace(/_/g, ' ');
const tone = (s) => ({passed: 'ok', review: 'warn', failed: 'bad'})[s] || '';
const name = (d) => (d ? [d.given_names, d.surname].filter(Boolean).join(' ') || '—' : '—');

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const res = await api.passports({status: filters.status, page: page.value, per_page: perPage});
    scans.value = res.scans;
    total.value = res.total;
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

async function open(row) {
  try {
    current.value = (await api.passport(row.scan_id)).scan;
  } catch (err) {
    error.value = err.message;
  }
}

watch(() => filters.status, () => {
  page.value = 1;
  load();
});
watch(page, load);
onMounted(load);
</script>

<style scoped>
.toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 0 0 12px; flex-wrap: wrap; }
.filters { display: flex; gap: 8px; flex-wrap: wrap; }
.filters .select { width: auto; }
.mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
.thumb { width: 96px; }
.clickable { cursor: pointer; }
.clickable:hover td { background: var(--surface-2, rgba(127, 127, 127, 0.06)); }
.pager { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 12px; border-top: 1px solid var(--line); }
.detail { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr); gap: 20px; align-items: start; }
.pictures { display: grid; gap: 12px; }
.pictures :deep(img) { max-height: 380px; object-fit: contain; background: #111; }
figure { margin: 0; display: grid; gap: 6px; }
.result-head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 8px; }
.facts { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 8px 16px; margin: 10px 0; }
.facts dt { font-size: 12px; color: var(--muted); }
.facts dd { margin: 0; }
.checks { list-style: none; margin: 8px 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 2px 12px; }
.checks .ok { color: var(--ok, #15803d); }
.checks .bad { color: var(--bad, #b91c1c); }
.sub { font-size: 14px; margin: 14px 0 4px; display: flex; gap: 8px; align-items: center; }
pre { white-space: pre; overflow-x: auto; margin: 6px 0 0; }
p { margin: 4px 0; }
@media (max-width: 760px) {
  .detail { grid-template-columns: 1fr; }
}
</style>
