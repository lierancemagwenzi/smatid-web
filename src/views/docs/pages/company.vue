<template>
  <h1>Company registration</h1>
  <p class="lead">Confirm that a company is on the Zimbabwe company register (CIPZ), and get its registered name, address and status.</p>

  <EndpointLine method="GET" path="/api/kyc/company/:number" auth="Bearer token" />

  <h2>Request</h2>
  <table>
    <thead><tr><th>Parameter</th><th>In</th><th>Description</th></tr></thead>
    <tbody>
      <tr><td><code>number</code> <span class="req">required</span></td><td>Path</td><td>The registration number, e.g. <code>38043A0242025</code>. 3–30 characters: letters, digits, <code>/</code> and <code>-</code>. Letter case doesn’t matter.</td></tr>
    </tbody>
  </table>
  <CodeBlock :tabs="request" />

  <h2>Found · 200</h2>
  <CodeBlock :tabs="[{label: 'Response · 200', code: found}]" />
  <table>
    <thead><tr><th>Field</th><th>Description</th></tr></thead>
    <tbody>
      <tr><td><code>found</code></td><td><code>true</code>: the register has this number.</td></tr>
      <tr><td><code>name</code></td><td>The registered name, including its suffix, e.g. <code>(PRIVATE) LIMITED</code>.</td></tr>
      <tr><td><code>number</code></td><td>The registration number, as the register shows it.</td></tr>
      <tr><td><code>address</code></td><td>The registered address.</td></tr>
      <tr><td><code>status</code></td><td>The register’s status text, e.g. <code>Verified</code>.</td></tr>
      <tr><td><code>verified</code></td><td><code>true</code> only when <code>status</code> is exactly <code>Verified</code>. Use this for decisions.</td></tr>
      <tr><td><code>source</code></td><td>Always <code>CIPZ</code>.</td></tr>
      <tr><td><code>checked_at</code></td><td>When the register was read.</td></tr>
    </tbody>
  </table>

  <h2>Not found · 404</h2>
  <p>The register has no company with that number:</p>
  <CodeBlock :tabs="[{label: 'Response · 404', code: notFound}]" />

  <h2>Errors</h2>
  <table>
    <thead><tr><th>Status</th><th>Error</th><th>Meaning</th></tr></thead>
    <tbody>
      <tr><td>400</td><td><code>invalid_registration_number</code></td><td>The number has characters that can’t be in one, or is too short or long.</td></tr>
      <tr><td>502</td><td><code>registry_unavailable</code></td><td>The register didn’t answer, timed out or changed its page. Try again later.</td></tr>
      <tr><td>502</td><td><code>registry_mismatch</code></td><td>The register answered about a different number, so the answer isn’t used.</td></tr>
    </tbody>
  </table>

  <DocNote kind="info" title="About the source">
    <p>The answer comes live from the CIPZ public register each time, so it’s as current as the register. If the register is down, you get a <code>502</code>, never a guess.</p>
  </DocNote>
</template>

<script setup>
import CodeBlock from '../../../components/docs/CodeBlock.vue';
import DocNote from '../../../components/docs/DocNote.vue';
import EndpointLine from '../../../components/docs/EndpointLine.vue';
import {API} from '../docs.js';

const request = [
  {label: 'curl', code: `curl ${API}/api/kyc/company/38043A0242025 -H "Authorization: Bearer $SMATID_TOKEN"`},
  {label: 'Node.js', code: `
const res = await fetch(\`${API}/api/kyc/company/\${encodeURIComponent(number)}\`, {
  headers: {Authorization: \`Bearer \${process.env.SMATID_TOKEN}\`},
});
if (res.status === 404) { /* not on the register */ }
const company = await res.json();`},
  {label: 'PHP', code: `
$ch = curl_init('${API}/api/kyc/company/' . rawurlencode($number));
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . getenv('SMATID_TOKEN')],
]);
$company = json_decode(curl_exec($ch), true);`},
  {label: 'Python', code: `
res = requests.get(
    f"${API}/api/kyc/company/{number}",
    headers={"Authorization": f"Bearer {os.environ['SMATID_TOKEN']}"},
    timeout=30,
)
company = res.json()`},
];

const found = `
{
  "found": true,
  "name": "EXPRESS SMATPAY (PRIVATE) LIMITED",
  "number": "38043A0242025",
  "address": "3 FALMOUTH ROAD, ALEXANDRA PARK, HARARE ZIMBABWE",
  "status": "Verified",
  "verified": true,
  "source": "CIPZ",
  "checked_at": "2026-11-02T09:45:33.193Z"
}`;

const notFound = `{"found": false, "number": "NOPE0000000", "source": "CIPZ"}`;
</script>
