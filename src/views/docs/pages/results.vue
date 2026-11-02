<template>
  <h1>Getting results</h1>
  <p class="lead">A liveness check finishes when the person is done, which could be seconds or minutes after you open the session. There are five ways to find out how it went.</p>

  <table>
    <thead><tr><th>Way</th><th>How it works</th><th>Use it for</th><th>Trust it?</th></tr></thead>
    <tbody>
      <tr>
        <td><RouterLink to="/docs/webhooks"><strong>Webhook</strong></RouterLink></td>
        <td>Smatid POSTs the result to your server the moment the session passes, fails or expires.</td>
        <td>Your server finding out without asking</td>
        <td>Yes, once you’ve checked its signature</td>
      </tr>
      <tr>
        <td><RouterLink to="/docs/liveness#result"><strong>Ask</strong></RouterLink></td>
        <td><code>GET /api/kyc/liveness/:session_id</code> whenever you like.</td>
        <td>The source of truth, any time</td>
        <td>Yes</td>
      </tr>
      <tr>
        <td><RouterLink to="/docs/redirects"><strong>Redirect</strong></RouterLink></td>
        <td>The person is sent to your <code>redirect_url</code> with <code>?session_id=…&amp;status=…</code>.</td>
        <td>Bringing the person back to your site or app</td>
        <td>No: anyone can edit an address. Ask or use a webhook.</td>
      </tr>
      <tr>
        <td><RouterLink to="/docs/redirects#popup"><strong>Popup message</strong></RouterLink></td>
        <td>If your page opened the check in a popup, it gets a message as the check ends.</td>
        <td>Desktop websites</td>
        <td>No: use it as a signal, then ask</td>
      </tr>
      <tr>
        <td><RouterLink to="/docs/liveness#photo"><strong>Face photo</strong></RouterLink></td>
        <td><code>GET /api/kyc/liveness/:session_id/image</code> returns the straight-on picture.</td>
        <td>Comparing with an ID document; your records</td>
        <td>Yes</td>
      </tr>
    </tbody>
  </table>

  <h2>The recommended set-up</h2>
  <ol class="steps">
    <li><strong>Set a default webhook once</strong><code>PUT /api/kyc/webhook</code>. Every session then reports back to your server, with no polling.</li>
    <li><strong>Open sessions with a <code>redirect_url</code></strong>So people come back to the right page in your site or app when they’re done.</li>
    <li><strong>Decide on the webhook or on asking</strong>When the person lands on your <code>redirect_url</code>, show “Checking…” and read the result from your database (filled by the webhook) or from <code>GET /api/kyc/liveness/:session_id</code>. Never from the address.</li>
    <li><strong>Keep asking as a fallback</strong>If a webhook hasn’t arrived (your server was down, say), ask the API. It always has the answer.</li>
  </ol>

  <DocNote kind="info" title="One result, many messages">
    <p>A webhook, a redirect and a popup message can all arrive for the same session. They all describe the same result, so handle them so that doing it twice is harmless (for example, update the customer’s record only if it isn’t already set).</p>
  </DocNote>
</template>

<script setup>
import DocNote from '../../../components/docs/DocNote.vue';
</script>
