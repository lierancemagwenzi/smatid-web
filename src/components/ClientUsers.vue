<template>
  <section class="card users">
    <header class="card-header">
      <h2>Portal users</h2>
      <button class="btn btn-primary btn-sm" type="button" @click="openAdd">+ Add user</button>
    </header>
    <p v-if="notice" class="notice">{{ notice }}</p>
    <p v-if="sentNotice" class="notice ok">{{ sentNotice }}</p>
    <p v-if="loadError" class="form-error pad">{{ loadError }}</p>
    <div class="table-wrap">
      <table class="table">
        <thead><tr><th>Name</th><th>Role</th><th>Status</th><th>Last signed in</th><th></th></tr></thead>
        <tbody>
          <tr v-for="u in users" :key="u.id">
            <td><strong>{{ u.name }}</strong><div class="muted small">{{ u.email }}</div></td>
            <td>{{ u.role === 'owner' ? 'Owner' : 'Member' }}</td>
            <td><span class="badge" :class="u.invited ? 'warn' : u.email_verified ? 'ok' : 'warn'">{{ u.invited ? 'Invited' : u.email_verified ? 'Active' : 'Email not confirmed' }}</span></td>
            <td class="muted nowrap">{{ formatDateTime(u.last_login_at) }}</td>
            <td class="num nowrap">
              <button v-if="u.invited" class="btn btn-ghost btn-sm" type="button" :disabled="resending === u.id" @click="resend(u)">{{ resending === u.id ? 'Sending…' : 'Resend invite' }}</button>
              <button class="btn btn-ghost btn-sm danger-text" type="button" @click="openRemove(u)">Remove</button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-if="loaded && !users.length" class="empty">No portal users yet. Add one to give this client portal access.</p>
    </div>
    <p class="muted small foot"><strong>Owners</strong> manage the team, the API token and the webhook. <strong>Members</strong> can see usage and credits, and top up.</p>

    <ModalDialog v-if="adding" title="Add a portal user" @close="adding = false">
      <p v-if="formError" class="form-error">{{ formError }}</p>
      <form id="add-user" class="form" @submit.prevent="add">
        <div class="field"><label for="u-name">Name</label><input id="u-name" v-model="form.name" class="input" maxlength="255" required autofocus /></div>
        <div class="field"><label for="u-email">Email</label><input id="u-email" v-model="form.email" class="input" type="email" required /></div>
        <div class="field">
          <label for="u-role">Role</label>
          <select id="u-role" v-model="form.role" class="select">
            <option value="member">Member: sees usage and credits, can top up</option>
            <option value="owner">Owner: also manages the team and API settings</option>
          </select>
        </div>
      </form>
      <p class="muted small" style="margin:0">They’ll get an email with a link to set their password. It works for 7 days.</p>
      <template #footer>
        <button class="btn btn-secondary" type="button" @click="adding = false">Cancel</button>
        <button class="btn btn-primary" type="submit" form="add-user" :disabled="saving">{{ saving ? 'Adding…' : 'Add user' }}</button>
      </template>
    </ModalDialog>

    <ModalDialog v-if="removing" :title="`Remove ${removing.name}?`" @close="removing = null">
      <p style="margin:0">They’ll be signed out of the portal and won’t be able to sign in to {{ client.name }} any more. Their past top-ups stay in the history.</p>
      <p v-if="formError" class="form-error">{{ formError }}</p>
      <template #footer>
        <button class="btn btn-secondary" type="button" @click="removing = null">Cancel</button>
        <button class="btn btn-danger" type="button" :disabled="saving" @click="remove">{{ saving ? 'Removing…' : 'Remove' }}</button>
      </template>
    </ModalDialog>
  </section>
</template>

<script setup>
import {reactive, ref, watch} from 'vue';
import {api} from '../api.js';
import {formatDateTime} from '../format.js';
import ModalDialog from './ModalDialog.vue';

const props = defineProps({client: {type: Object, required: true}});

const users = ref([]);
const loaded = ref(false);
const loadError = ref('');
const notice = ref('');
const sentNotice = ref('');
const resending = ref(null);
const adding = ref(false);
const removing = ref(null);
const saving = ref(false);
const formError = ref('');
const form = reactive({name: '', email: '', role: 'member'});

async function load() {
  loadError.value = '';
  try {
    users.value = (await api.clientUsers(props.client.id)).users;
  } catch (err) {
    loadError.value = `Couldn’t load the users: ${err.message}`;
  } finally {
    loaded.value = true;
  }
}
watch(() => props.client.id, load, {immediate: true});

function openAdd() {
  Object.assign(form, {name: '', email: '', role: 'member'});
  formError.value = '';
  adding.value = true;
}

async function add() {
  saving.value = true;
  formError.value = '';
  try {
    const {user, email_sent} = await api.addClientUser(props.client.id, {name: form.name.trim(), email: form.email.trim(), role: form.role});
    // The account exists either way; without the email they can still use "Forgot password" on the portal.
    notice.value = email_sent ? '' : `${user.email} was added, but the invitation email couldn’t be sent. They can set a password with “Forgot password” on the portal sign-in page.`;
    adding.value = false;
    await load();
  } catch (err) {
    formError.value = err.message;
  } finally {
    saving.value = false;
  }
}

/** A fresh invite link; the one sent before stops working. */
async function resend(u) {
  resending.value = u.id;
  notice.value = '';
  sentNotice.value = '';
  try {
    const {email_sent} = await api.resendInvite(props.client.id, u.id);
    if (email_sent) sentNotice.value = `A new invitation was sent to ${u.email}. The earlier link no longer works.`;
    else notice.value = `The invitation email to ${u.email} couldn’t be sent. Check the API’s email settings and try again.`;
  } catch (err) {
    notice.value = err.message;
  } finally {
    resending.value = null;
  }
}

function openRemove(u) {
  formError.value = '';
  removing.value = u;
}

async function remove() {
  saving.value = true;
  formError.value = '';
  try {
    await api.removeClientUser(props.client.id, removing.value.id);
    removing.value = null;
    await load();
  } catch (err) {
    formError.value = err.message;
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.notice { margin: 0; padding: 10px 16px; font-size: 13.5px; background: var(--warn-soft); color: #92400e; border-bottom: 1px solid var(--line); }
.notice.ok { background: var(--ok-soft); color: #065f46; }
.pad { margin: 0; padding: 10px 16px; }
.foot { margin: 0; padding: 12px 16px; border-top: 1px solid var(--line); }
.form { display: grid; gap: 14px; }
.danger-text { color: var(--bad); }
</style>
