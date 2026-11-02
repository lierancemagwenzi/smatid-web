<template>
  <div class="page">
    <div class="toolbar">
      <input v-model="search" class="input search" type="search" placeholder="Search by name or email" aria-label="Search clients" />
      <button class="btn btn-primary" type="button" @click="openCreate">+ New client</button>
    </div>

    <p v-if="error" class="form-error">{{ error }}</p>

    <section class="card">
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Client</th>
              <th>Token</th>
              <th>Status</th>
              <th class="num">Requests</th>
              <th>Last request</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in filtered" :key="c.id" class="clickable" tabindex="0" @click="go(c)" @keydown.enter="go(c)">
              <td>
                <div class="name">{{ c.name }}</div>
                <div class="muted small">{{ c.email || '—' }}</div>
              </td>
              <td><code class="prefix">{{ c.token_prefix }}…</code></td>
              <td><span class="badge" :class="c.status === 'active' ? 'ok' : 'bad'">{{ c.status === 'active' ? 'Active' : 'Revoked' }}</span></td>
              <td class="num">{{ formatNumber(c.requests) }}</td>
              <td class="nowrap muted">{{ formatDateTime(c.last_request_at) }}</td>
              <td class="nowrap muted">{{ formatDate(c.created_at) }}</td>
            </tr>
          </tbody>
        </table>
        <p v-if="!loading && !filtered.length" class="empty">
          {{ clients.length ? 'No clients match that search.' : 'No clients yet. Create one to give a company API access.' }}
        </p>
        <div v-if="loading" class="empty"><span class="spinner" style="display:inline-block"></span></div>
      </div>
    </section>

    <ModalDialog v-if="creating" :title="created ? 'Client created' : 'New client'" width="520px" @close="closeCreate">
      <template v-if="!created">
        <p class="muted small intro">The client gets an email with their access token. They use it to call the KYC API.</p>
        <p v-if="createError" class="form-error" role="alert">{{ createError }}</p>
        <form id="create-client" class="form" @submit.prevent="create">
          <div class="field">
            <label for="client-name">Company name</label>
            <input id="client-name" v-model="form.name" class="input" maxlength="255" required autofocus placeholder="e.g. Acme Bank" />
          </div>
          <div class="field">
            <label for="client-email">Email for the access token</label>
            <input id="client-email" v-model="form.email" class="input" type="email" required placeholder="it@acme.co.zw" />
          </div>
        </form>
      </template>

      <template v-else>
        <div class="notice" :class="created.email_sent ? 'ok' : 'warn'">
          <template v-if="created.email_sent">The access token was emailed to <strong>{{ created.client.email }}</strong>.</template>
          <template v-else>The email to <strong>{{ created.client.email }}</strong> could not be sent. Copy the token below and pass it on safely.</template>
        </div>
        <div class="field">
          <label>Access token</label>
          <div class="token">
            <code>{{ created.access_token }}</code>
            <button class="btn btn-secondary btn-sm" type="button" @click="copyToken">{{ copied ? 'Copied' : 'Copy' }}</button>
          </div>
          <p class="muted small">This is the only time the token is shown. Only a fingerprint of it is stored, so it can’t be shown again.</p>
        </div>
      </template>

      <template #footer>
        <template v-if="!created">
          <button class="btn btn-secondary" type="button" @click="closeCreate">Cancel</button>
          <button class="btn btn-primary" type="submit" form="create-client" :disabled="createBusy">
            {{ createBusy ? 'Creating…' : 'Create client' }}
          </button>
        </template>
        <template v-else>
          <RouterLink :to="`/admin/clients/${created.client.id}`" class="btn btn-secondary">View client</RouterLink>
          <button class="btn btn-primary" type="button" @click="closeCreate">Done</button>
        </template>
      </template>
    </ModalDialog>
  </div>
</template>

<script setup>
import {computed, onMounted, reactive, ref} from 'vue';
import {useRouter} from 'vue-router';
import {api} from '../../api.js';
import {formatDate, formatDateTime, formatNumber} from '../../format.js';
import ModalDialog from '../../components/ModalDialog.vue';

const router = useRouter();
const clients = ref([]);
const loading = ref(true);
const error = ref('');
const search = ref('');

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  const list = [...clients.value].reverse();
  return q ? list.filter((c) => `${c.name} ${c.email || ''}`.toLowerCase().includes(q)) : list;
});

async function load() {
  loading.value = true;
  try {
    clients.value = (await api.clients()).clients;
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}
onMounted(load);

const go = (c) => router.push(`/admin/clients/${c.id}`);

const creating = ref(false);
const created = ref(null);
const createBusy = ref(false);
const createError = ref('');
const copied = ref(false);
const form = reactive({name: '', email: ''});

function openCreate() {
  Object.assign(form, {name: '', email: ''});
  created.value = null;
  createError.value = '';
  creating.value = true;
}

function closeCreate() {
  creating.value = false;
  // Drop the token from memory once the dialog is closed.
  created.value = null;
}

async function create() {
  createError.value = '';
  createBusy.value = true;
  try {
    created.value = await api.createClient(form.name.trim(), form.email.trim());
    load();
  } catch (err) {
    createError.value = err.message;
  } finally {
    createBusy.value = false;
  }
}

async function copyToken() {
  try {
    await navigator.clipboard.writeText(created.value.access_token);
    copied.value = true;
    setTimeout(() => (copied.value = false), 1500);
  } catch {
    // Clipboard blocked; the token can be selected by hand.
  }
}
</script>

<style scoped>
.page { display: grid; gap: 20px; }
.toolbar { display: flex; gap: 12px; justify-content: space-between; flex-wrap: wrap; }
.search { max-width: 320px; }
.name { font-weight: 600; }
.prefix { color: var(--ink-2); background: var(--surface-2); padding: 2px 6px; border-radius: 5px; }
.intro { margin: 0; }
.form { display: grid; gap: 14px; }
.notice { padding: 12px 14px; border-radius: 8px; font-size: 14px; }
.notice.ok { background: var(--ok-soft); color: #065f46; }
.notice.warn { background: var(--warn-soft); color: #92400e; }
.token { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border: 1px solid var(--line-strong); border-radius: 8px; background: var(--surface-2); }
.token code { flex: 1; word-break: break-all; font-size: 13px; user-select: all; }
.field p { margin: 0; }
@media (max-width: 600px) { .search { max-width: none; } .toolbar .btn { width: 100%; } }
</style>
