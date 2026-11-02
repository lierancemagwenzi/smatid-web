<template>
  <AuthShell :title="invite ? 'Set up your account' : 'Choose a new password'" :subtitle="invite ? 'Choose a password to sign in to the Smatid KYC portal.' : 'You’ll be signed out everywhere else.'">
    <p v-if="error" class="form-error" role="alert">{{ error }}</p>
    <form novalidate @submit.prevent="submit">
      <div class="field">
        <label for="password">New password</label>
        <input id="password" v-model="password" class="input" type="password" autocomplete="new-password" minlength="10" required autofocus />
        <span class="small muted">At least 10 characters.</span>
      </div>
      <div class="field">
        <label for="confirm">Type it again</label>
        <input id="confirm" v-model="confirm" class="input" type="password" autocomplete="new-password" required />
      </div>
      <button class="btn btn-primary btn-lg" type="submit" :disabled="busy">{{ busy ? 'Saving…' : 'Save and sign in' }}</button>
    </form>
    <template #below>
      <RouterLink v-if="!invite" to="/forgot-password">Need a new link?</RouterLink>
      <RouterLink v-else to="/login">Back to sign in</RouterLink>
    </template>
  </AuthShell>
</template>

<script setup>
import {computed, ref} from 'vue';
import {useRoute, useRouter} from 'vue-router';
import AuthShell from '../../components/AuthShell.vue';
import {portalApi} from '../../portal/api.js';
import {portalSignIn} from '../../portal/session.js';

const route = useRoute();
const router = useRouter();
const invite = computed(() => route.name === 'portal-accept-invite');
const password = ref('');
const confirm = ref('');
const error = ref('');
const busy = ref(false);

async function submit() {
  error.value = '';
  if (password.value.length < 10) {
    error.value = 'Use a password of at least 10 characters.';
    return;
  }
  if (password.value !== confirm.value) {
    error.value = 'The two passwords don’t match.';
    return;
  }
  busy.value = true;
  try {
    portalSignIn(await portalApi.resetPassword(String(route.query.token || ''), password.value));
    router.replace('/app');
  } catch (err) {
    error.value = err.message;
  } finally {
    busy.value = false;
  }
}
</script>
