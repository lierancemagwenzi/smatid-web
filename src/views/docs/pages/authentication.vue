<template>
  <h1>Authentication</h1>
  <p class="lead">Every request carries your access token in the <code>Authorization</code> header.</p>

  <CodeBlock :tabs="[{label: 'Header', code: 'Authorization: Bearer kyc_aA9gK91Y…'}]" />

  <h2>Your token</h2>
  <ul>
    <li>It starts with <code>kyc_</code>, followed by 43 random characters.</li>
    <li>It’s emailed to you once, when Smatid creates your account. Smatid only keeps a fingerprint of it, so it can’t be shown or sent again.</li>
    <li>It’s yours alone: every check made with it is recorded against your account.</li>
  </ul>

  <h2>Keeping it safe</h2>
  <ul>
    <li>Use it only from your own server. Never put it in a web page, a mobile app or a public code repository.</li>
    <li>Keep it in an environment variable or a secrets manager, not in your code.</li>
    <li>For liveness checks, the person gets a link with a session ID, never your token. See <RouterLink to="/docs/liveness">Liveness</RouterLink>.</li>
  </ul>

  <h2>When it’s refused</h2>
  <table>
    <thead><tr><th>Status</th><th>Error</th><th>Meaning</th></tr></thead>
    <tbody>
      <tr><td>401</td><td><code>missing_access_token</code></td><td>No <code>Authorization: Bearer …</code> header was sent.</td></tr>
      <tr><td>401</td><td><code>invalid_access_token</code></td><td>The token is wrong, or it has been revoked.</td></tr>
      <tr><td>503</td><td><code>auth_unavailable</code></td><td>Smatid couldn’t check the token just then. Try again shortly.</td></tr>
    </tbody>
  </table>

  <DocNote kind="danger" title="Lost or leaked token?">
    <p>Contact Smatid straight away. We revoke it, so it stops working at once, and issue you a new one.</p>
  </DocNote>
</template>

<script setup>
import CodeBlock from '../../../components/docs/CodeBlock.vue';
import DocNote from '../../../components/docs/DocNote.vue';
</script>
