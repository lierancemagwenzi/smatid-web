<template>
  <div class="page">
    <section class="card">
      <header class="card-header">
        <h2>Proofread a document</h2>
        <span v-if="option" class="muted small">{{ option.enabled ? `${plural(option.credit_cost, 'credit')} per document` : 'Not available' }}</span>
      </header>
      <div class="card-body">
        <p class="muted small intro">
          Checks a PDF for signs it was changed: the software that last saved it and when, fonts that don’t belong, text off its
          row or hidden under a box, and whether its figures add up. Made for bank statements, payslips and utility bills, and
          useful on any document. The file is read and not kept.
        </p>
        <p v-if="option && !option.enabled" class="notice warn">The document proofreader is switched off for now. Contact Smatid if you need it.</p>

        <form class="form" @submit.prevent="run">
          <label class="drop" :class="{over: dragging, has: file}" @dragover.prevent="dragging = true" @dragleave.prevent="dragging = false" @drop.prevent="dropped">
            <input type="file" accept="application/pdf,.pdf" class="file-input" @change="chosen" />
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5z"/><path d="M14 3v5h5M12 18v-6M9 15l3-3 3 3"/></svg>
            <span v-if="file"><strong>{{ file.name }}</strong> <span class="muted">· {{ size(file.size) }}</span></span>
            <span v-else><strong>Choose a PDF</strong> or drop it here <span class="muted">(up to 15 MB)</span></span>
          </label>
          <div class="field">
            <label for="d-type">What is it?</label>
            <select id="d-type" v-model="docType" class="select">
              <option value="">Work it out</option>
              <option value="bank_statement">Bank statement</option>
              <option value="payslip">Payslip</option>
              <option value="utility_bill">Utility bill / proof of address</option>
              <option value="other">Something else</option>
            </select>
          </div>
          <div class="field">
            <label for="d-ref">Your reference <span class="muted">(optional)</span></label>
            <input id="d-ref" v-model="reference" class="input" maxlength="255" placeholder="e.g. a loan application number" />
          </div>
          <div class="actions">
            <button class="btn btn-primary" type="submit" :disabled="busy || !file || disabled">{{ busy ? 'Checking…' : runLabel }}</button>
          </div>
        </form>
        <p v-if="error" class="form-error">
          {{ error }}
          <RouterLink v-if="needsCredits" to="/app/credits">Top up</RouterLink>
        </p>
      </div>
    </section>

    <template v-if="report">
      <section class="card verdict" :class="report.verdict">
        <div class="verdict-main">
          <div class="score" :title="`Risk score ${report.score} out of 100`">{{ report.score }}</div>
          <div>
            <h2>{{ VERDICTS[report.verdict].title }}</h2>
            <p class="muted">{{ VERDICTS[report.verdict].text }}</p>
            <p class="small muted">
              {{ TYPES[report.document.type] }}<template v-if="report.document.type !== report.document.type_detected"> (you said; it looked like {{ TYPES[report.document.type_detected].toLowerCase() }})</template>
              · {{ plural(report.document.pages, 'page') }} · {{ report.filename }}
              <template v-if="report.checked_before"> · checked {{ plural(report.checked_before, 'time') }} before</template>
              · {{ chargedText }}
            </p>
          </div>
        </div>
        <div class="counts">
          <span class="pill high">{{ report.counts.high }} serious</span>
          <span class="pill warning">{{ report.counts.warning }} to look at</span>
          <span class="pill info">{{ report.counts.info }} for information</span>
          <span v-if="report.model" class="pill" :title="report.model.active ? 'Weighs in on the verdict' : 'Shown for information; not yet weighing in on verdicts'">
            Model: {{ Math.round(report.model.tampered_probability * 100) }}% likely changed{{ report.model.active ? '' : ' (not in use yet)' }}
          </span>
        </div>
      </section>

      <div class="columns">
        <section class="card findings">
          <header class="card-header"><h2>What was found</h2></header>
          <div class="card-body">
            <p v-if="!report.findings.length" class="muted">Nothing looks wrong with this document.</p>
            <div v-for="group in groups" :key="group.category" class="group">
              <h3>{{ CATEGORIES[group.category] }}</h3>
              <button v-for="(f, i) in group.items" :key="i" type="button" class="finding" :class="[f.severity, {active: active === f}]" @click="show(f)">
                <span class="sev">{{ SEVERITIES[f.severity] }}</span>
                <span class="f-title">{{ f.title }}</span>
                <span class="f-detail muted small">{{ f.detail }}</span>
                <span v-if="f.page" class="f-where small">Page {{ f.page }}{{ f.box ? ' · show on the page' : '' }}</span>
              </button>
            </div>
          </div>
        </section>

        <section class="card viewer">
          <header class="card-header"><h2>The document</h2><span class="muted small">Highlighted where something was found</span></header>
          <div ref="pagesEl" class="pages">
            <p v-if="rendering" class="muted small">Showing the pages…</p>
            <p v-if="renderError" class="muted small">{{ renderError }}</p>
            <div v-for="p in pages" :key="p.number" :ref="(el) => (pageEls[p.number] = el)" class="pdf-page" :style="{aspectRatio: `${p.width} / ${p.height}`}">
              <img :src="p.url" :alt="`Page ${p.number}`" />
              <button v-for="(f, i) in boxesOn(p.number)" :key="i" type="button" class="box" :class="[f.severity, {active: active === f}]"
                :style="boxStyle(f.box)" :title="f.title" @click="active = f"></button>
              <span class="page-no small">{{ p.number }} / {{ pages.length }}</span>
            </div>
          </div>
        </section>
      </div>

      <section class="card">
        <header class="card-header"><h2>About the file</h2></header>
        <div class="card-body details">
          <dl>
            <div><dt>Made with</dt><dd>{{ report.metadata.creator || '—' }}</dd></div>
            <div><dt>Saved by</dt><dd>{{ report.metadata.producer || '—' }}</dd></div>
            <div><dt>Created</dt><dd>{{ formatDateTime(report.metadata.created) }}</dd></div>
            <div><dt>Last modified</dt><dd>{{ formatDateTime(report.metadata.modified) }}</dd></div>
            <div><dt>Saves on top of the original</dt><dd>{{ report.structure.incremental_updates }}</dd></div>
            <div><dt>Digitally signed</dt><dd>{{ report.structure.signed ? 'Yes' : 'No' }}</dd></div>
            <div v-if="report.structure.producers.length > 1" class="wide"><dt>Software over time</dt><dd>{{ report.structure.producers.join(' → ') }}</dd></div>
          </dl>
          <div v-if="report.figures" class="figures">
            <h3>Figures read</h3>
            <dl>
              <div v-for="(v, k) in report.figures" :key="k"><dt>{{ words(k) }}</dt><dd>{{ figure(v) }}</dd></div>
            </dl>
          </div>
          <div>
            <h3>Fonts</h3>
            <table class="table small">
              <thead><tr><th>Font</th><th>Embedded</th><th>Pieces of text</th><th>Pages</th></tr></thead>
              <tbody>
                <tr v-for="f in report.fonts" :key="f.name + (f.subset || '')">
                  <td>{{ f.base }}<span v-if="f.subset" class="muted"> ({{ f.subset }})</span></td>
                  <td>{{ f.embedded === null ? '—' : f.embedded ? 'Yes' : 'No' }}</td>
                  <td>{{ f.items }}</td>
                  <td>{{ f.pages.join(', ') }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="muted small">Check ID <span class="mono">{{ report.check_id }}</span> · SHA-256 <span class="mono">{{ report.sha256.slice(0, 16) }}…</span></p>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup>
import {computed, nextTick, onBeforeUnmount, onMounted, ref} from 'vue';
import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {portalApi} from '../../portal/api.js';
import {portalUpdate} from '../../portal/session.js';
import {formatDateTime, plural} from '../../format.js';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

const VERDICTS = {
  clean: {title: 'Looks genuine', text: 'Nothing was found that suggests the document was changed.'},
  review: {title: 'Worth a closer look', text: 'Some things don’t look like a document straight from its issuer. Check them before relying on it.'},
  suspicious: {title: 'Signs of tampering', text: 'The document shows signs of being changed after it was issued. Ask for the original from the issuer.'},
};
const TYPES = {bank_statement: 'Bank statement', payslip: 'Payslip', utility_bill: 'Utility bill', other: 'Document'};
const CATEGORIES = {content: 'What it says', layout: 'Layout', fonts: 'Fonts', structure: 'The file’s history', metadata: 'Metadata', image: 'The scanned pages', model: 'Trained model'};
const SEVERITIES = {high: 'Serious', warning: 'Look at', info: 'Note'};
const MAX_BYTES = 15 * 1024 * 1024;

const options = ref([]);
const file = ref(null);
const docType = ref('');
const reference = ref('');
const dragging = ref(false);
const busy = ref(false);
const error = ref('');
const needsCredits = ref(false);
const report = ref(null);
const active = ref(null);
const pages = ref([]);
const rendering = ref(false);
const renderError = ref('');
const pagesEl = ref(null);
const pageEls = {};
let bytes = null;

const option = computed(() => options.value.find((o) => o.check_type === 'document'));
const disabled = computed(() => Boolean(option.value && !option.value.enabled));
const runLabel = computed(() => (option.value && option.value.credit_cost ? `Check document · ${plural(option.value.credit_cost, 'credit')}` : 'Check document'));
const chargedText = computed(() => (option.value && option.value.credit_cost ? `${plural(option.value.credit_cost, 'credit')} used` : 'no credits used'));
const groups = computed(() => {
  if (!report.value) return [];
  return Object.keys(CATEGORIES)
    .map((category) => ({category, items: report.value.findings.filter((f) => f.category === category)}))
    .filter((g) => g.items.length);
});

const size = (n) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
const words = (k) => k.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
const figure = (v) => (v === null || v === undefined ? '—' : typeof v === 'number' ? v.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : typeof v === 'object' ? Object.values(v).join(' to ') : v);
const boxesOn = (n) => (report.value ? report.value.findings.filter((f) => f.page === n && f.box) : []);
const boxStyle = (b) => ({left: `${b[0] * 100}%`, top: `${b[1] * 100}%`, width: `${Math.max(b[2] * 100, 0.8)}%`, height: `${Math.max(b[3] * 100, 0.8)}%`});

onMounted(async () => {
  try {
    options.value = (await portalApi.checkOptions()).checks;
  } catch {
    // Prices are only a hint; the check itself says if it's off.
  }
});
onBeforeUnmount(clearPages);

function pick(f) {
  error.value = '';
  if (!f) return;
  if (f.type !== 'application/pdf' && !/\.pdf$/i.test(f.name)) {
    error.value = 'That isn’t a PDF. For now the proofreader checks PDF files only.';
    return;
  }
  if (f.size > MAX_BYTES) {
    error.value = 'That PDF is too big. The limit is 15 MB.';
    return;
  }
  file.value = f;
}
const chosen = (e) => pick(e.target.files && e.target.files[0]);
function dropped(e) {
  dragging.value = false;
  pick(e.dataTransfer.files && e.dataTransfer.files[0]);
}

function toBase64(buf) {
  const view = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < view.length; i += 0x8000) s += String.fromCharCode.apply(null, view.subarray(i, i + 0x8000));
  return btoa(s);
}

async function run() {
  if (!file.value) return;
  busy.value = true;
  error.value = '';
  needsCredits.value = false;
  report.value = null;
  active.value = null;
  clearPages();
  try {
    bytes = await file.value.arrayBuffer();
    const body = {file: toBase64(bytes), filename: file.value.name};
    if (docType.value) body.type = docType.value;
    if (reference.value.trim()) body.reference = reference.value.trim();
    report.value = await portalApi.checkDocument(body);
    renderPages();
  } catch (err) {
    error.value = err.message;
    needsCredits.value = err.code === 'insufficient_credits';
  } finally {
    busy.value = false;
    portalApi.me().then(portalUpdate).catch(() => {});
  }
}

function clearPages() {
  for (const p of pages.value) URL.revokeObjectURL(p.url);
  pages.value = [];
  renderError.value = '';
}

/** Draws the client's own copy of the PDF (it's never sent back from the server). */
async function renderPages() {
  rendering.value = true;
  try {
    const doc = await pdfjs.getDocument({data: new Uint8Array(bytes.slice(0)), isEvalSupported: false}).promise;
    const out = [];
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      const viewport = page.getViewport({scale: 1.6});
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      await page.render({canvasContext: canvas.getContext('2d'), viewport}).promise;
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      out.push({number: n, width: viewport.width, height: viewport.height, url: URL.createObjectURL(blob)});
      pages.value = [...out];
    }
    doc.destroy();
  } catch {
    renderError.value = 'The pages couldn’t be shown here, but the check above is complete.';
  } finally {
    rendering.value = false;
  }
}

async function show(f) {
  active.value = f;
  if (!f.page) return;
  await nextTick();
  const el = pageEls[f.page];
  if (el) el.scrollIntoView({behavior: 'smooth', block: f.box ? 'center' : 'start'});
}
</script>

<style scoped>
.page { display: grid; gap: 20px; max-width: 1180px; }
.card-body { display: grid; gap: 14px; }
.form { display: grid; gap: 14px; max-width: 640px; }
.intro { margin: 0; max-width: 760px; }
.drop { display: flex; align-items: center; gap: 12px; border: 1.5px dashed var(--line); border-radius: 12px; padding: 18px; cursor: pointer; color: var(--muted); background: var(--surface); }
.drop.over, .drop:hover { border-color: var(--brand); color: var(--brand); }
.drop.has { border-style: solid; color: inherit; }
.file-input { position: absolute; width: 1px; height: 1px; opacity: 0; }

.verdict { padding: 20px; display: grid; gap: 14px; border-left: 5px solid var(--line); }
.verdict.clean { border-left-color: #16a34a; }
.verdict.review { border-left-color: #d97706; }
.verdict.suspicious { border-left-color: #dc2626; }
.verdict-main { display: flex; gap: 18px; align-items: center; }
.verdict h2 { margin: 0 0 4px; font-size: 20px; }
.verdict p { margin: 0 0 4px; }
.score { flex: 0 0 auto; width: 64px; height: 64px; border-radius: 50%; display: grid; place-items: center; font-size: 22px; font-weight: 700; background: var(--brand-soft); }
.clean .score { background: #dcfce7; color: #166534; }
.review .score { background: #fef3c7; color: #92400e; }
.suspicious .score { background: #fee2e2; color: #991b1b; }
.counts { display: flex; gap: 8px; flex-wrap: wrap; }
.pill { font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 999px; background: var(--surface); border: 1px solid var(--line); }
.pill.high { color: #b91c1c; }
.pill.warning { color: #b45309; }

.columns { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr); gap: 20px; align-items: start; }
.group h3 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--muted); margin: 6px 0 8px; }
.finding { display: grid; gap: 3px; width: 100%; text-align: left; border: 1px solid var(--line); border-left: 4px solid var(--line); border-radius: 10px; padding: 10px 12px; margin-bottom: 8px; background: var(--surface); font: inherit; color: inherit; cursor: pointer; }
.finding.high { border-left-color: #dc2626; }
.finding.warning { border-left-color: #d97706; }
.finding.info { border-left-color: #64748b; }
.finding.active, .finding:hover { box-shadow: 0 0 0 2px var(--brand-soft); }
.sev { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
.high .sev { color: #b91c1c; }
.warning .sev { color: #b45309; }
.info .sev { color: #475569; }
.f-title { font-weight: 600; }
.f-where { color: var(--brand); }

.viewer { position: sticky; top: 16px; }
.pages { max-height: calc(100vh - 140px); overflow: auto; padding: 14px; display: grid; gap: 14px; background: #e5e7eb; border-radius: 0 0 12px 12px; }
.pdf-page { position: relative; width: 100%; background: #fff; box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15); }
.pdf-page img { width: 100%; height: 100%; display: block; }
.box { position: absolute; padding: 0; border: 2px solid; border-radius: 3px; cursor: pointer; background: transparent; }
.box.high { border-color: #dc2626; background: rgba(220, 38, 38, 0.12); }
.box.warning { border-color: #d97706; background: rgba(217, 119, 6, 0.12); }
.box.info { border-color: #64748b; background: rgba(100, 116, 139, 0.1); }
.box.active { box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.45); animation: pulse 1.2s ease-out 2; }
.page-no { position: absolute; right: 8px; bottom: 6px; color: #64748b; }
@keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.6); } 100% { box-shadow: 0 0 0 12px rgba(37, 99, 235, 0); } }

.details { display: grid; gap: 18px; }
.details h3 { font-size: 14px; margin: 0 0 8px; }
dl { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 10px 18px; margin: 0; }
dt { font-size: 12px; color: var(--muted); }
dd { margin: 0; word-break: break-word; }
.wide { grid-column: 1 / -1; }
.mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }

@media (max-width: 900px) {
  .columns { grid-template-columns: 1fr; }
  .viewer { position: static; }
  .pages { max-height: none; }
}
</style>
