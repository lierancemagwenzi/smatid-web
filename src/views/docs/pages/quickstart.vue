<template>
  <h1>Quick start</h1>
  <p class="lead">From your access token to your first result, step by step.</p>

  <ol class="steps">
    <li>
      <strong>Get your access token</strong>
      <p>When Smatid creates your account, you get an email titled “Your Smatid KYC API access token”. The token starts with <code>kyc_</code>.</p>
    </li>
    <li>
      <strong>Keep it on your server</strong>
      <p>Store it like a password, for example in an environment variable. Never put it in a website’s JavaScript or a mobile app: anyone could copy it from there.</p>
      <CodeBlock :tabs="[{label: '.env', code: envFile}]" />
    </li>
    <li>
      <strong>Make your first request</strong>
      <p>Look up a company on the register. This one exists:</p>
      <CodeBlock :tabs="first" />
    </li>
    <li>
      <strong>Read the answer</strong>
      <p>A <code>200</code> means it was found:</p>
      <CodeBlock :tabs="[{label: 'Response · 200', code: firstResponse}]" />
      <p><code>verified: true</code> means the register shows it as verified. A number that isn’t on the register gets a <code>404</code> with <code>"found": false</code>.</p>
    </li>
    <li>
      <strong>Handle errors</strong>
      <p>Anything else comes with an <code>error</code> code. A <code>4xx</code> means something in your request needs fixing; a <code>502</code> or <code>503</code> means a source was unavailable, so try again a little later. See <RouterLink to="/docs/errors">Errors</RouterLink>.</p>
    </li>
  </ol>

  <h2>Next steps</h2>
  <div class="cards">
    <RouterLink to="/docs/sanctions"><strong>Screen for sanctions</strong><span>People and companies, with PEP flags</span></RouterLink>
    <RouterLink to="/docs/liveness"><strong>Run a liveness check</strong><span>Send a person a link; get the result back</span></RouterLink>
    <RouterLink to="/docs/webhooks"><strong>Set up webhooks</strong><span>Have results sent to your server</span></RouterLink>
  </div>
</template>

<script setup>
import CodeBlock from '../../../components/docs/CodeBlock.vue';
import {API} from '../docs.js';

const envFile = `SMATID_TOKEN=kyc_your_token_here`;

const first = [
  {label: 'curl', code: `
curl ${API}/api/kyc/company/38043A0242025 \\
  -H "Authorization: Bearer $SMATID_TOKEN"`},
  {label: 'Node.js', code: `
const res = await fetch('${API}/api/kyc/company/38043A0242025', {
  headers: {Authorization: \`Bearer \${process.env.SMATID_TOKEN}\`},
});
const company = await res.json();
console.log(res.status, company);`},
  {label: 'PHP', code: `
$ch = curl_init('${API}/api/kyc/company/38043A0242025');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . getenv('SMATID_TOKEN')],
]);
$company = json_decode(curl_exec($ch), true);
$status = curl_getinfo($ch, CURLINFO_HTTP_CODE);`},
  {label: 'Python', code: `
import os, requests

res = requests.get(
    "${API}/api/kyc/company/38043A0242025",
    headers={"Authorization": f"Bearer {os.environ['SMATID_TOKEN']}"},
    timeout=30,
)
print(res.status_code, res.json())`},
];

const firstResponse = `
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
</script>
