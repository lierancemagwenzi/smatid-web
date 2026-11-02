<template>
  <AuthShell :title="error ? 'This link didn’t work' : 'Confirming your email…'">
    <div v-if="!error" class="center"><span class="spinner" style="display:inline-block"></span></div>
    <template v-else>
      <p class="form-error">{{ error }}</p>
      <p class="small muted">Enter your email and we’ll send a new confirmation link.</p>
      <form @submit.prevent="resend">
        <input v-model="email" class="input" type="email" placeholder="you@company.com" required />
        <button class="btn btn-primary" type="submit" :disabled="resent">{{ resent ? 'Sent: check your inbox' : 'Send a new link' }}</button>
      </form>
    </template>
    <template #below><RouterLink to="/login">Back to sign in</RouterLink></template>
  </AuthShell>
</template>

<script setup>
import {onMounted, ref} from 'vue';
import {useRoute, useRouter} from 'vue-router';
import AuthShell from '../../components/AuthShell.vue';
import {portalApi} from '../../portal/api.js';
import {portalSignIn} from '../../portal/session.js';

const route = useRoute();
const router = useRouter();
const error = ref('');
const email = ref('');
const resent = ref(false);

onMounted(async () => {
  try {
    portalSignIn(await portalApi.verifyEmail(String(route.query.token || '')));
    router.replace({path: '/app', query: {welcome: '1'}});
  } catch (err) {
    error.value = err.message;
  }
});

async function resend() {
  await portalApi.resendVerification(email.value.trim()).catch(() => {});
  resent.value = true;
}
</script>

<style scoped>
.center { text-align: center; padding: 12px; }
</style>
