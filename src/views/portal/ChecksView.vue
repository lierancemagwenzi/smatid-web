<template>
  <div class="page">
    <div class="tabs" role="tablist">
      <button v-for="c in CHECK_TABS" :key="c.id" type="button" role="tab" :aria-selected="tab === c.id" :class="{on: tab === c.id}" @click="select(c.id)">{{ c.label }}</button>
    </div>

    <section class="card">
      <header class="card-header">
        <h2>{{ tab === 'company' ? 'Company registration (CIPZ)' : 'Sanctions & PEP screening' }}</h2>
        <span v-if="option" class="muted small">{{ option.enabled ? `${plural(option.credit_cost, 'credit')} per check` : 'Not available' }}</span>
      </header>
      <div class="card-body">
        <p v-if="option && !option.enabled" class="notice warn">This check is switched off for now. Contact Smatid if you need it.</p>

        <form v-if="tab === 'company'" class="form" @submit.prevent="runCompany">
          <p class="muted small intro">Looks the number up on the Companies and Intellectual Property Office of Zimbabwe register and returns the registered name, address and status.</p>
          <div class="field">
            <label for="c-number">Registration number</label>
            <input id="c-number" v-model="companyNumber" class="input" maxlength="30" placeholder="e.g. 38043A0242025 or 1234/2010" required autofocus />
          </div>
          <div class="actions"><button class="btn btn-primary" type="submit" :disabled="busy || disabled">{{ busy ? 'Checking…' : runLabel }}</button></div>
        </form>

        <form v-else class="form" @submit.prevent="runSanctions">
          <p class="muted small intro">Screens a person or company against sanctions lists and politically exposed persons (PEPs), through OpenSanctions.</p>
          <div class="kind" role="radiogroup" aria-label="Who to screen">
            <label :class="{on: s.type === 'person'}"><input v-model="s.type" type="radio" value="person" /> A person</label>
            <label :class="{on: s.type === 'company'}"><input v-model="s.type" type="radio" value="company" /> A company</label>
          </div>
          <div class="field">
            <label for="s-name">{{ s.type === 'person' ? 'Full name' : 'Company name' }}</label>
            <input id="s-name" v-model="s.name" class="input" maxlength="255" required />
          </div>
          <div class="grid">
            <template v-if="s.type === 'person'">
              <div class="field"><label for="s-dob">Date of birth <span class="muted">(optional)</span></label><input id="s-dob" v-model="s.birth_date" class="input" type="date" /></div>
              <div class="field"><label for="s-nat">Nationality <span class="muted">(optional)</span></label><input id="s-nat" v-model="s.nationality" class="input" maxlength="60" placeholder="e.g. zw" /></div>
              <div class="field"><label for="s-id">ID number <span class="muted">(optional)</span></label><input id="s-id" v-model="s.id_number" class="input" maxlength="60" /></div>
              <div class="field"><label for="s-pass">Passport number <span class="muted">(optional)</span></label><input id="s-pass" v-model="s.passport_number" class="input" maxlength="60" /></div>
            </template>
            <template v-else>
              <div class="field"><label for="s-reg">Registration number <span class="muted">(optional)</span></label><input id="s-reg" v-model="s.registration_number" class="input" maxlength="60" /></div>
              <div class="field"><label for="s-country">Country <span class="muted">(optional)</span></label><input id="s-country" v-model="s.country" class="input" maxlength="60" placeholder="e.g. zw" /></div>
            </template>
          </div>
          <p class="muted small">The more you add, the fewer false matches. Names alone can match people who only share the name.</p>
          <div class="actions"><button class="btn btn-primary" type="submit" :disabled="busy || disabled">{{ busy ? 'Screening…' : runLabel }}</button></div>
        </form>

        <p v-if="error" class="form-error">
          {{ error }}
          <RouterLink v-if="needsCredits" to="/app/credits">Top up</RouterLink>
        </p>
      </div>
    </section>

    <section v-if="result && result.kind === 'company'" class="card result">
      <header class="card-header">
        <h2>Result</h2>
        <OutcomeBadge :outcome="result.body.found === false ? 'not_found' : 'found'" />
      </header>
      <div class="card-body">
        <p v-if="result.body.found === false" class="lead">No company with the number <strong>{{ result.body.number }}</strong> is on the CIPZ register.</p>
        <dl v-else class="facts">
          <div><dt>Name</dt><dd>{{ result.body.name }}</dd></div>
          <div><dt>Number</dt><dd>{{ result.body.number }}</dd></div>
          <div><dt>Status</dt><dd><span class="badge" :class="result.body.verified ? 'ok' : 'warn'">{{ result.body.status || 'Unknown' }}</span></dd></div>
          <div><dt>Address</dt><dd>{{ result.body.address || '—' }}</dd></div>
        </dl>
        <p class="muted small">Checked {{ formatDateTime(result.at) }} · {{ chargedText }} · <RouterLink to="/app/usage">See all your checks</RouterLink></p>
      </div>
    </section>

    <section v-if="result && result.kind === 'sanctions'" class="card result">
      <header class="card-header">
        <h2>Result for {{ result.name }}</h2>
        <span class="badges">
          <OutcomeBadge v-if="result.body.sanctioned" outcome="sanctioned" />
          <OutcomeBadge v-if="result.body.pep" outcome="pep" />
          <OutcomeBadge :outcome="result.body.hit ? 'hit' : 'clear'" />
        </span>
      </header>
      <div class="card-body">
        <p v-if="!result.body.hit" class="lead">No match on sanctions or PEP lists.</p>
        <p v-else class="lead">{{ result.body.matches.length }} possible {{ result.body.matches.length === 1 ? 'match' : 'matches' }}. Check each one against what you know before acting on it.</p>
        <ul v-if="result.body.matches.length" class="matches">
          <li v-for="m in result.body.matches" :key="m.id">
            <div>
              <a :href="m.url" target="_blank" rel="noopener"><strong>{{ m.name }}</strong></a>
              <div class="muted small">{{ m.schema }} · {{ m.datasets.slice(0, 3).join(', ') }}{{ m.datasets.length > 3 ? ` +${m.datasets.length - 3}` : '' }}</div>
            </div>
            <span class="badges">
              <span v-if="m.sanctioned" class="badge bad">Sanctioned</span>
              <span v-if="m.pep" class="badge info">PEP</span>
              <span class="badge plain">{{ Math.round(m.score * 100) }}% match</span>
            </span>
          </li>
        </ul>
        <details v-if="result.body.near_matches.length" class="near">
          <summary>{{ plural(result.body.near_matches.length, 'weaker result') }}, below the match threshold</summary>
          <ul class="matches">
            <li v-for="m in result.body.near_matches" :key="m.id">
              <a :href="m.url" target="_blank" rel="noopener">{{ m.name }}</a>
              <span class="badge plain">{{ Math.round(m.score * 100) }}%</span>
            </li>
          </ul>
        </details>
        <p class="muted small">Screened {{ formatDateTime(result.at) }} · {{ chargedText }} · <RouterLink to="/app/usage">See all your checks</RouterLink></p>
      </div>
    </section>
  </div>
</template>

<script setup>
import {computed, onMounted, reactive, ref} from 'vue';
import {useRoute, useRouter} from 'vue-router';
import {portalApi} from '../../portal/api.js';
import {portalUpdate} from '../../portal/session.js';
import {formatDateTime, plural} from '../../format.js';
import OutcomeBadge from '../../components/OutcomeBadge.vue';

const CHECK_TABS = [{id: 'company', label: 'Company registration'}, {id: 'sanctions', label: 'Sanctions & PEP'}];
const route = useRoute();
const router = useRouter();

const tab = ref(route.query.check === 'sanctions' ? 'sanctions' : 'company');
const options = ref([]);
const busy = ref(false);
const error = ref('');
const needsCredits = ref(false);
const result = ref(null);
const companyNumber = ref('');
const s = reactive({type: 'person', name: '', birth_date: '', nationality: '', id_number: '', passport_number: '', registration_number: '', country: ''});

const option = computed(() => options.value.find((o) => o.check_type === tab.value));
const disabled = computed(() => Boolean(option.value && !option.value.enabled));
const runLabel = computed(() => {
  const verb = tab.value === 'company' ? 'Check company' : 'Screen';
  return option.value && option.value.credit_cost ? `${verb} · ${plural(option.value.credit_cost, 'credit')}` : verb;
});
const chargedText = computed(() => (result.value && result.value.cost ? `${plural(result.value.cost, 'credit')} used` : 'no credits used'));

onMounted(async () => {
  try {
    options.value = (await portalApi.checkOptions()).checks;
  } catch {
    // Prices are only a hint; the check itself says if it's off.
  }
});

function select(id) {
  tab.value = id;
  error.value = '';
  result.value = null;
  router.replace({query: id === 'company' ? {} : {check: id}});
}

/** Runs a check, then refreshes the balance in the top bar. */
async function run(kind, send, name) {
  busy.value = true;
  error.value = '';
  needsCredits.value = false;
  result.value = null;
  try {
    const body = await send();
    result.value = {kind, body, name, at: body.checked_at || new Date().toISOString(), cost: option.value ? option.value.credit_cost : 0};
  } catch (err) {
    // CIPZ answers "not found" with a 404, and it's still a result (and charged).
    if (err.status === 404 && err.extra && err.extra.found === false) {
      result.value = {kind, body: err.extra, at: new Date().toISOString(), cost: option.value ? option.value.credit_cost : 0};
    } else {
      error.value = err.message;
      needsCredits.value = err.code === 'insufficient_credits';
    }
  } finally {
    busy.value = false;
    portalApi.me().then(portalUpdate).catch(() => {});
  }
}

const runCompany = () => run('company', () => portalApi.checkCompany(companyNumber.value.trim()));

function runSanctions() {
  const fields = s.type === 'person'
    ? ['name', 'birth_date', 'nationality', 'id_number', 'passport_number']
    : ['name', 'registration_number', 'country'];
  const body = {type: s.type};
  for (const f of fields) if (s[f].trim()) body[f] = s[f].trim();
  run('sanctions', () => portalApi.checkSanctions(body), body.name);
}
</script>

<style scoped>
.page { display: grid; gap: 20px; max-width: 860px; }
.tabs { display: flex; gap: 4px; flex-wrap: wrap; }
.tabs button { border: 1px solid var(--line); background: var(--surface); padding: 8px 14px; border-radius: 999px; font: inherit; font-size: 14px; font-weight: 600; color: var(--muted); cursor: pointer; }
.tabs button.on { background: var(--brand-soft); border-color: transparent; color: var(--brand); }
.card-body { display: grid; gap: 14px; }
.form { display: grid; gap: 14px; }
.intro { margin: 0; }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.kind { display: flex; gap: 8px; flex-wrap: wrap; }
.kind label { display: flex; align-items: center; gap: 8px; padding: 8px 14px; border: 2px solid var(--line); border-radius: 10px; cursor: pointer; font-size: 14px; font-weight: 500; }
.kind label.on { border-color: var(--brand); background: var(--brand-soft); }
.kind input { accent-color: var(--brand); }
.actions { display: flex; justify-content: flex-end; }
.notice { margin: 0; padding: 10px 14px; border-radius: 8px; font-size: 14px; }
.notice.warn { background: var(--warn-soft); color: #92400e; }
.form-error { margin: 0; }
.result .lead { margin: 0; font-size: 15px; }
.result p { margin: 0; }
.badges { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
.facts { margin: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 12px 20px; padding: 16px; border: 1px solid var(--line); border-radius: var(--radius); }
.facts dt { font-size: 12px; color: var(--muted); font-weight: 600; }
.facts dd { margin: 2px 0 0; font-size: 14px; }
.matches { list-style: none; margin: 0; padding: 0; border: 1px solid var(--line); border-radius: var(--radius); }
.matches li { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 10px 14px; border-bottom: 1px solid var(--line); flex-wrap: wrap; }
.matches li:last-child { border-bottom: 0; }
.near summary { cursor: pointer; font-size: 13.5px; color: var(--muted); margin-bottom: 8px; }
@media (max-width: 600px) { .grid, .facts { grid-template-columns: 1fr; } }
</style>
