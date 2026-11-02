<template>
  <div class="page">
    <section class="card">
      <header class="card-header">
        <h2>People in {{ portal.client?.name }}</h2>
        <button v-if="isOwner()" class="btn btn-primary btn-sm" type="button" @click="openInvite">+ Invite someone</button>
      </header>
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>Name</th><th>Role</th><th>Status</th><th>Last signed in</th><th></th></tr></thead>
          <tbody>
            <tr v-for="u in users" :key="u.id">
              <td><div class="name">{{ u.name }}<span v-if="u.id === portal.user?.id" class="muted small"> (you)</span></div><div class="muted small">{{ u.email }}</div></td>
              <td>{{ u.role === 'owner' ? 'Owner' : 'Member' }}</td>
              <td><span class="badge" :class="u.invited ? 'warn' : 'ok'">{{ u.invited ? 'Invited' : 'Active' }}</span></td>
              <td class="muted nowrap">{{ formatDateTime(u.last_login_at) }}</td>
              <td class="num">
                <button v-if="isOwner() && u.id !== portal.user?.id" class="btn btn-ghost btn-sm danger" type="button" @click="removing = u">Remove</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="muted small foot"><strong>Owners</strong> manage the team, the API token and the webhook. <strong>Members</strong> can see usage and credits, and top up.</p>
    </section>

    <ModalDialog v-if="inviting" title="Invite someone" @close="inviting = false">
      <p v-if="inviteError" class="form-error">{{ inviteError }}</p>
      <form id="invite" class="form" @submit.prevent="invite">
        <div class="field"><label for="i-name">Name</label><input id="i-name" v-model="form.name" class="input" required autofocus /></div>
        <div class="field"><label for="i-email">Email</label><input id="i-email" v-model="form.email" class="input" type="email" required /></div>
        <div class="field">
          <label for="i-role">Role</label>
          <select id="i-role" v-model="form.role" class="select">
            <option value="member">Member: sees usage and credits, can top up</option>
            <option value="owner">Owner: also manages the team and API settings</option>
          </select>
        </div>
      </form>
      <p class="muted small" style="margin:0">They’ll get an email with a link to set their password. It works for 7 days.</p>
      <template #footer>
        <button class="btn btn-secondary" type="button" @click="inviting = false">Cancel</button>
        <button class="btn btn-primary" type="submit" form="invite" :disabled="busy">{{ busy ? 'Sending…' : 'Send invitation' }}</button>
      </template>
    </ModalDialog>

    <ModalDialog v-if="removing" :title="`Remove ${removing.name}?`" @close="removing = null">
      <p style="margin:0">They’ll be signed out and won’t be able to sign in to {{ portal.client?.name }} any more.</p>
      <p v-if="removeError" class="form-error">{{ removeError }}</p>
      <template #footer>
        <button class="btn btn-secondary" type="button" @click="removing = null">Cancel</button>
        <button class="btn btn-danger" type="button" :disabled="busy" @click="remove">Remove</button>
      </template>
    </ModalDialog>
  </div>
</template>

<script setup>
import {onMounted, reactive, ref} from 'vue';
import {portalApi} from '../../portal/api.js';
import {isOwner, portal} from '../../portal/session.js';
import {formatDateTime} from '../../format.js';
import ModalDialog from '../../components/ModalDialog.vue';

const users = ref([]);
const inviting = ref(false);
const removing = ref(null);
const busy = ref(false);
const inviteError = ref('');
const removeError = ref('');
const form = reactive({name: '', email: '', role: 'member'});

const load = async () => (users.value = (await portalApi.team()).users);
onMounted(load);

function openInvite() {
  Object.assign(form, {name: '', email: '', role: 'member'});
  inviteError.value = '';
  inviting.value = true;
}

async function invite() {
  busy.value = true;
  inviteError.value = '';
  try {
    await portalApi.invite({name: form.name.trim(), email: form.email.trim(), role: form.role});
    inviting.value = false;
    await load();
  } catch (err) {
    inviteError.value = err.message;
  } finally {
    busy.value = false;
  }
}

async function remove() {
  busy.value = true;
  removeError.value = '';
  try {
    await portalApi.removeUser(removing.value.id);
    removing.value = null;
    await load();
  } catch (err) {
    removeError.value = err.message;
  } finally {
    busy.value = false;
  }
}
</script>

<style scoped>
.page { display: grid; gap: 20px; }
.name { font-weight: 600; }
.foot { margin: 0; padding: 12px 16px; border-top: 1px solid var(--line); }
.form { display: grid; gap: 14px; }
.danger { color: var(--bad); }
</style>
