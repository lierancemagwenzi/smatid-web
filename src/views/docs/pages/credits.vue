<template>
  <h1>Credits &amp; billing</h1>
  <p class="lead">Checks are paid for with credits. You get free trial credits when you sign up, and buy more whenever you need them.</p>

  <h2>What checks cost</h2>
  <table v-if="pricing">
    <thead><tr><th>Check</th><th>Credits</th></tr></thead>
    <tbody>
      <tr v-for="c in pricing.checks" :key="c.key"><td>{{ c.name }}</td><td>{{ c.credit_cost }}</td></tr>
    </tbody>
  </table>
  <p v-if="pricing">Credits cost <strong>{{ pricing.currency }} {{ pricing.credit_price.toFixed(2) }}</strong> each. Prices can change; your portal’s dashboard always shows the current ones.</p>
  <ul>
    <li><strong>Only completed checks are charged.</strong> A company that isn’t on the register still counts as a completed check. A bad request (<code>4xx</code>) or a source being down (<code>502</code>) is refunded straight away.</li>
    <li><strong>Liveness</strong> is charged once, when you open the session, however many tries the person takes.</li>
    <li>Asking for a result, the face photo, or anything about webhooks is free.</li>
  </ul>

  <h2>The free trial</h2>
  <p v-if="pricing">When you confirm your email, you get <strong>{{ pricing.trial.credits }} trial credits</strong> for <strong>{{ pricing.trial.days }} days</strong>. Trial credits are used before paid ones, and any left at the end of the trial expire. Paid credits never expire.</p>

  <h2>Running out</h2>
  <p>When you don’t have enough credits for a check, it isn’t run and nothing is charged:</p>
  <CodeBlock :tabs="[{label: 'Response · 402', code: outOfCredits}]" />
  <p>Your other requests, such as asking for liveness results, keep working.</p>

  <h2>Topping up</h2>
  <ol class="steps">
    <li><strong>Sign in to the portal</strong>Go to <RouterLink to="/app/credits">Credits &amp; top-up</RouterLink>.</li>
    <li><strong>Choose how many credits</strong>Pick a pack, or enter any amount.</li>
    <li><strong>Choose how to pay</strong>EcoCash or O’mari (approve a prompt on your phone), InnBucks (pay a code in the app), or Visa, Mastercard or ZimSwitch (on a secure card page). Payments go through SmatPay.</li>
    <li><strong>Finish paying</strong>The page waits, and adds the credits as soon as SmatPay confirms the payment. You also get an email receipt.</li>
  </ol>
  <p>Every change to your credits (trial, top-ups, checks, refunds) is listed under <strong>History</strong> on the same page, and every check under <RouterLink to="/app/usage">Usage</RouterLink>, with what it cost.</p>
</template>

<script setup>
import {onMounted, ref} from 'vue';
import CodeBlock from '../../../components/docs/CodeBlock.vue';

const outOfCredits = `{"error": "insufficient_credits", "credits_needed": 3, "available_credits": 1}`;
const pricing = ref(null);
onMounted(async () => {
  try {
    const base = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
    const res = await fetch(`${base}/api/public/pricing`);
    if (res.ok) pricing.value = await res.json();
  } catch {
    // Without the live prices the page still explains how it works.
  }
});
</script>
