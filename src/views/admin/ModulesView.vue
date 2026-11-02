<template>
  <div class="page">
    <div class="toolbar">
      <p class="muted">Each KYC check is a module. While a module is disabled, its endpoint refuses every client with <code>403 module_disabled</code>.</p>
      <button class="btn btn-primary" type="button" @click="openCreate">+ New module</button>
    </div>

    <p v-if="error" class="form-error">{{ error }}</p>

    <section class="card">
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Module</th>
              <th>Key</th>
              <th>Endpoint</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in modules" :key="m.id">
              <td>
                <div class="name">{{ m.name }}</div>
                <div v-if="m.description" class="muted small">{{ m.description }}</div>
              </td>
              <td><code class="key">{{ m.key }}</code></td>
              <td>
                <span v-if="m.connected" class="small">Connected</span>
                <span v-else class="small muted" title="No endpoint checks this key yet. It needs to be built before the switch does anything.">Not built yet</span>
              </td>
              <td>
                <button
                  class="switch"
                  type="button"
                  role="switch"
                  :aria-checked="m.status === 'enabled'"
                  :aria-label="`${m.name}: ${m.status}`"
                  :disabled="busyId === m.id"
                  @click="askToggle(m)"
                >
                  <span class="knob"></span>
                </button>
                <span class="state" :class="m.status === 'enabled' ? 'on' : 'off'">{{ m.status === 'enabled' ? 'Enabled' : 'Disabled' }}</span>
              </td>
              <td class="actions">
                <button class="btn btn-ghost btn-sm" type="button" @click="openEdit(m)">Edit</button>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-if="!loading && !modules.length" class="empty">No modules yet.</p>
        <div v-if="loading" class="empty"><span class="spinner" style="display:inline-block"></span></div>
      </div>
    </section>

    <ModalDialog v-if="editing" :title="editing.id ? `Edit ${editing.name || 'module'}` : 'New module'" @close="editing = null">
      <p v-if="formError" class="form-error" role="alert">{{ formError }}</p>
      <form id="module-form" class="form" @submit.prevent="save">
        <div class="field">
          <label for="m-name">Name</label>
          <input id="m-name" v-model="form.name" class="input" maxlength="255" required placeholder="e.g. Liveness" />
        </div>
        <div class="field">
          <label for="m-key">Key</label>
          <input id="m-key" v-model="form.key" class="input mono" :disabled="!!editing.id" maxlength="64" required placeholder="liveness-check" />
          <span class="muted small">{{ editing.id ? 'The key can’t be changed: the code checks it.' : 'Lowercase letters, numbers and dashes. The endpoint for this check must use the same key.' }}</span>
        </div>
        <div class="field">
          <label for="m-desc">Description</label>
          <textarea id="m-desc" v-model="form.description" class="input textarea" rows="3" maxlength="2000" placeholder="What this check does"></textarea>
        </div>
        <label class="check">
          <input v-model="form.enabled" type="checkbox" />
          Enabled
        </label>
      </form>
      <template #footer>
        <button class="btn btn-secondary" type="button" @click="editing = null">Cancel</button>
        <button class="btn btn-primary" type="submit" form="module-form" :disabled="saving">
          {{ saving ? 'Saving…' : editing.id ? 'Save' : 'Create module' }}
        </button>
      </template>
    </ModalDialog>

    <ModalDialog v-if="confirming" :title="`Disable ${confirming.name}?`" @close="confirming = null">
      <p class="confirm-text">
        Every client calling this check will get <code>403 module_disabled</code> until you enable it again.
      </p>
      <template #footer>
        <button class="btn btn-secondary" type="button" @click="confirming = null">Cancel</button>
        <button class="btn btn-danger" type="button" @click="setStatus(confirming, 'disabled')">Disable</button>
      </template>
    </ModalDialog>
  </div>
</template>

<script setup>
import {onMounted, reactive, ref} from 'vue';
import {api} from '../../api.js';
import ModalDialog from '../../components/ModalDialog.vue';

const modules = ref([]);
const loading = ref(true);
const error = ref('');
const busyId = ref(null);

async function load() {
  loading.value = true;
  try {
    modules.value = (await api.modules()).modules;
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}
onMounted(load);

function replace(updated) {
  const i = modules.value.findIndex((m) => m.id === updated.id);
  if (i > -1) modules.value[i] = updated;
  else modules.value.push(updated);
}

// Switching off affects clients at once, so it asks first; switching on doesn't.
const confirming = ref(null);
function askToggle(m) {
  if (m.status === 'enabled') confirming.value = m;
  else setStatus(m, 'enabled');
}

async function setStatus(m, status) {
  confirming.value = null;
  busyId.value = m.id;
  error.value = '';
  try {
    replace((await api.updateModule(m.id, {status})).module);
  } catch (err) {
    error.value = err.message;
  } finally {
    busyId.value = null;
  }
}

const editing = ref(null);
const saving = ref(false);
const formError = ref('');
const form = reactive({key: '', name: '', description: '', enabled: true});

function openCreate() {
  Object.assign(form, {key: '', name: '', description: '', enabled: true});
  formError.value = '';
  editing.value = {};
}

function openEdit(m) {
  Object.assign(form, {key: m.key, name: m.name, description: m.description || '', enabled: m.status === 'enabled'});
  formError.value = '';
  editing.value = m;
}

async function save() {
  formError.value = '';
  if (!form.name.trim()) {
    formError.value = 'Enter a name.';
    return;
  }
  saving.value = true;
  const fields = {name: form.name.trim(), description: form.description.trim() || null, status: form.enabled ? 'enabled' : 'disabled'};
  try {
    const {module} = editing.value.id
      ? await api.updateModule(editing.value.id, fields)
      : await api.createModule({key: form.key.trim().toLowerCase(), ...fields});
    replace(module);
    editing.value = null;
  } catch (err) {
    formError.value = err.message;
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.page { display: grid; gap: 20px; }
.toolbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.toolbar p { margin: 0; max-width: 640px; }
.name { font-weight: 600; }
.key { color: var(--ink-2); background: var(--surface-2); padding: 2px 6px; border-radius: 5px; }
.actions { text-align: right; }
.state { margin-left: 10px; font-size: 13px; font-weight: 600; vertical-align: middle; }
.state.on { color: var(--ok); }
.state.off { color: var(--muted); }

.switch {
  position: relative;
  width: 40px;
  height: 22px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: var(--line-strong);
  cursor: pointer;
  vertical-align: middle;
  transition: background 0.15s;
}
.switch[aria-checked='true'] { background: var(--ok); }
.switch:disabled { opacity: 0.6; cursor: wait; }
.switch:focus-visible { outline: 3px solid rgb(29 78 216 / 0.3); outline-offset: 2px; }
.knob {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 2px rgb(15 23 42 / 0.3);
  transition: transform 0.15s;
}
.switch[aria-checked='true'] .knob { transform: translateX(18px); }

.form { display: grid; gap: 14px; }
.textarea { height: auto; padding: 10px 12px; resize: vertical; font: inherit; font-size: 14px; }
.input.mono { font-family: var(--mono); }
.input:disabled { background: var(--surface-2); color: var(--muted); }
.check { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; }
.confirm-text { margin: 0; }
</style>
