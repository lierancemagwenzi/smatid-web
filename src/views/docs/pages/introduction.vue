<template>
  <h1>Smatid KYC API</h1>
  <p class="lead">
    One API for know-your-customer checks: confirm a company on the Zimbabwe company register, screen people and
    companies against sanctions and PEP lists, and check that a real person is in front of the camera.
  </p>

  <h2>What you can check</h2>
  <div class="cards">
    <RouterLink to="/docs/company"><strong>Company registration</strong><span>Is this company on the CIPZ register, and is it verified?</span></RouterLink>
    <RouterLink to="/docs/sanctions"><strong>Sanctions &amp; PEP</strong><span>Is this person or company on a sanctions list, or politically exposed?</span></RouterLink>
    <RouterLink to="/docs/liveness"><strong>Liveness</strong><span>Is a real, live person taking part, not a photo or a screen?</span></RouterLink>
  </div>
  <p>National ID extraction, passport extraction and photo matching are on the way.</p>

  <h2>The basics</h2>
  <table>
    <tbody>
      <tr><td><strong>Base URL</strong></td><td><code>{{ API }}</code></td></tr>
      <tr><td><strong>Format</strong></td><td>JSON in, JSON out. Send <code>Content-Type: application/json</code> with a body.</td></tr>
      <tr><td><strong>Security</strong></td><td>HTTPS only. Every request carries your access token: <code>Authorization: Bearer kyc_…</code></td></tr>
      <tr><td><strong>Errors</strong></td><td>An HTTP status plus <code v-pre>{"error": "a_code"}</code>. See <RouterLink to="/docs/errors">Errors</RouterLink>.</td></tr>
      <tr><td><strong>Times</strong></td><td>ISO 8601, in UTC, e.g. <code>2026-11-02T13:06:39.000Z</code></td></tr>
    </tbody>
  </table>

  <h2>How it fits together</h2>
  <ol class="steps">
    <li><strong>Sign up and get a token</strong><RouterLink to="/register">Create an account</RouterLink> for a free trial, then create your API token in the portal. It’s shown once and only you hold it.</li>
    <li><strong>Call a check</strong>Company and sanctions checks answer straight away. A liveness check gives you a link to send the person.</li>
    <li><strong>Act on the result</strong>Each answer is clear (verified or not, a hit or not, passed or failed) and says where it came from, so your team can review it.</li>
  </ol>

  <DocNote kind="tip" title="New here?">
    <p>Follow the <RouterLink to="/docs/quickstart">Quick start</RouterLink>: your first check takes a couple of minutes.</p>
  </DocNote>
</template>

<script setup>
import DocNote from '../../../components/docs/DocNote.vue';
import {API} from '../docs.js';
</script>
