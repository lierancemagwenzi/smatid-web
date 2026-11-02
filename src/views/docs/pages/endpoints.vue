<template>
  <h1>All endpoints</h1>
  <p class="lead">Every endpoint you can call, on <code>{{ API }}</code>. All need <code>Authorization: Bearer kyc_…</code>.</p>

  <template v-for="g in groups" :key="g.name">
    <h2>{{ g.name }}</h2>
    <table>
      <thead><tr><th>Method</th><th>Path</th><th>Does</th><th>Docs</th></tr></thead>
      <tbody>
        <tr v-for="e in g.endpoints" :key="e[0] + e[1]">
          <td><span class="m" :class="e[0].toLowerCase()">{{ e[0] }}</span></td>
          <td><code>{{ e[1] }}</code></td>
          <td>{{ e[2] }}</td>
          <td><RouterLink :to="e[3]">Read</RouterLink></td>
        </tr>
      </tbody>
    </table>
  </template>

  <h2>The hosted page</h2>
  <p>Not for your code to call: it’s the page the person opens.</p>
  <table>
    <tbody>
      <tr><td><code>GET /liveness/:session_id</code></td><td>The liveness camera page. You get its full address as <code>url</code> when you open a session.</td></tr>
    </tbody>
  </table>
</template>

<script setup>
import {API} from '../docs.js';

const groups = [
  {name: 'Checks', endpoints: [
    ['GET', '/api/kyc/company/:number', 'Look up a company on the CIPZ register', '/docs/company'],
    ['POST', '/api/kyc/sanctions', 'Screen a person or company for sanctions and PEPs', '/docs/sanctions'],
  ]},
  {name: 'Liveness', endpoints: [
    ['POST', '/api/kyc/liveness', 'Open a session and get the link for the person', '/docs/liveness#create'],
    ['GET', '/api/kyc/liveness/:session_id', 'The session’s status and result', '/docs/liveness#result'],
    ['GET', '/api/kyc/liveness/:session_id/image', 'The straight-on face photo (JPEG)', '/docs/liveness#photo'],
  ]},
  {name: 'Webhooks', endpoints: [
    ['GET', '/api/kyc/webhook', 'Your default webhook address', '/docs/webhooks'],
    ['PUT', '/api/kyc/webhook', 'Set or remove your default webhook address', '/docs/webhooks'],
    ['GET', '/api/kyc/webhook-secret', 'Your webhook signing secret', '/docs/webhooks'],
    ['POST', '/api/kyc/webhook-secret/rotate', 'Replace your signing secret', '/docs/webhooks'],
  ]},
];
</script>

<style scoped>
.m { font-size: 11.5px; font-weight: 700; padding: 2px 7px; border-radius: 5px; }
.get { background: #e7f6ef; color: #047857; }
.post { background: #e8efff; color: #1d4ed8; }
.put { background: #fdf3e2; color: #b45309; }
</style>
