<template>
  <h1>Modules</h1>
  <p class="lead">Each check is a module that Smatid can switch on or off, for example during maintenance of a data source.</p>

  <table>
    <thead><tr><th>Module</th><th>Check</th><th>Endpoints</th></tr></thead>
    <tbody>
      <tr><td><code>companies-check</code></td><td><RouterLink to="/docs/company">Company registration</RouterLink></td><td><code>GET /api/kyc/company/:number</code></td></tr>
      <tr><td><code>sanctions-check</code></td><td><RouterLink to="/docs/sanctions">Sanctions &amp; PEP</RouterLink></td><td><code>POST /api/kyc/sanctions</code></td></tr>
      <tr><td><code>liveness-check</code></td><td><RouterLink to="/docs/liveness">Liveness</RouterLink></td><td><code>/api/kyc/liveness…</code> and the hosted page</td></tr>
    </tbody>
  </table>

  <h2>When a module is off</h2>
  <p>Its endpoints answer every request with <code>403</code>, naming the module:</p>
  <CodeBlock :tabs="[{label: 'Response · 403', code: body}]" />
  <ul>
    <li>Your other checks keep working.</li>
    <li>Show your user a friendly “temporarily unavailable” message and try again later, rather than treating it as a failed check.</li>
    <li>For liveness, the hosted page shows “This check isn’t available right now” instead of the camera.</li>
  </ul>
</template>

<script setup>
import CodeBlock from '../../../components/docs/CodeBlock.vue';

const body = `{"error": "module_disabled", "module": "sanctions-check"}`;
</script>
