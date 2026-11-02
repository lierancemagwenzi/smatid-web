<template>
  <h1>Webhooks</h1>
  <p class="lead">Have liveness results sent to your server the moment a session passes, fails or expires, signed so you know they’re genuine.</p>

  <h2>Set up, step by step</h2>
  <ol class="steps">
    <li>
      <strong>Add an endpoint to your server</strong>
      <p>A URL that accepts <code>POST</code> requests with a JSON body, e.g. <code>https://acme.co.zw/hooks/smatid</code>. It must be <code>https</code> and reachable from the internet.</p>
    </li>
    <li>
      <strong>Get your signing secret</strong>
      <p>Smatid signs every webhook with a secret only you and Smatid know. Fetch it once and store it like a password:</p>
      <CodeBlock :tabs="secret" />
      <CodeBlock :tabs="[{label: 'Response · 200', code: secretResponse}]" />
    </li>
    <li>
      <strong>Tell Smatid where to send results</strong>
      <p>Set a default for all your sessions:</p>
      <CodeBlock :tabs="setDefault" />
      <p>Or give <code>webhook_url</code> when opening a session; it overrides the default for that session. Each session keeps the address it started with, so changing the default later doesn’t affect results already on their way. Your Smatid administrator can also set the default for you.</p>
    </li>
    <li>
      <strong>Check the signature on every webhook</strong>
      <p>Before you trust a webhook, check it came from Smatid. See <a href="#verify">Checking the signature</a> below.</p>
    </li>
    <li>
      <strong>Reply quickly with a 2xx</strong>
      <p>Answer <code>200</code> as soon as you’ve checked and stored it, then do any slow work afterwards. Anything else counts as not received, and it’s sent again.</p>
    </li>
  </ol>

  <h2>What you receive</h2>
  <table>
    <thead><tr><th>Header</th><th>Value</th></tr></thead>
    <tbody>
      <tr><td><code>Content-Type</code></td><td><code>application/json</code></td></tr>
      <tr><td><code>Smatid-Event</code></td><td><code>liveness.completed</code></td></tr>
      <tr><td><code>Smatid-Signature</code></td><td><code>t=&lt;unix time&gt;,v1=&lt;signature&gt;</code></td></tr>
      <tr><td><code>User-Agent</code></td><td><code>Smatid-Webhooks/1.0</code></td></tr>
    </tbody>
  </table>
  <CodeBlock :tabs="[{label: 'Body', code: payload}]" />
  <p><code>data</code> is exactly what <RouterLink to="/docs/liveness#result"><code>GET /api/kyc/liveness/:session_id</code></RouterLink> returns. <code>id</code> is unique to each delivery.</p>

  <h2 id="verify">Checking the signature</h2>
  <p>The signature is an HMAC-SHA256 of the timestamp, a dot and the raw body, using your secret. To check it:</p>
  <ol>
    <li>Read <code>t</code> and <code>v1</code> from the <code>Smatid-Signature</code> header.</li>
    <li>Refuse it if <code>t</code> is more than 5 minutes from now. That stops old webhooks being replayed.</li>
    <li>Work out HMAC-SHA256 of <code>t + "." + raw body</code> with your secret, as hex.</li>
    <li>Compare it with <code>v1</code> using a constant-time comparison. Accept the webhook only if they match.</li>
  </ol>
  <DocNote kind="warn" title="Use the raw body">
    <p>Check the signature against the body exactly as it arrived, before any JSON parsing. Parsing and re-encoding it changes the spacing, and the signature won’t match.</p>
  </DocNote>
  <CodeBlock :tabs="verify" />

  <h2>If your server doesn’t answer</h2>
  <table>
    <thead><tr><th>Try</th><th>When</th></tr></thead>
    <tbody>
      <tr><td>1</td><td>As soon as the session ends</td></tr>
      <tr><td>2</td><td>30 seconds later</td></tr>
      <tr><td>3</td><td>5 minutes after that</td></tr>
      <tr><td>4 (last)</td><td>30 minutes after that</td></tr>
    </tbody>
  </table>
  <ul>
    <li>Only a <code>2xx</code> counts as received. Redirects aren’t followed. Each try waits up to 10 seconds for an answer.</li>
    <li>The session’s <code>webhook</code> field shows how it’s going: <code>status</code> (<code>pending</code>, <code>delivered</code> or <code>failed</code>), <code>attempts</code>, <code>delivered_at</code> and <code>last_error</code>.</li>
    <li>If all four fail, the result is still available from <code>GET /api/kyc/liveness/:session_id</code>.</li>
    <li>A webhook can occasionally arrive twice. Use <code>data.session_id</code> to make handling it twice harmless.</li>
  </ul>

  <h2>Rules for webhook addresses</h2>
  <ul>
    <li><code>https://</code> only.</li>
    <li>A public address: <code>localhost</code>, <code>10.x.x.x</code>, <code>192.168.x.x</code> and other private or internal addresses are refused (<code>webhook_url_not_public</code>), including names that only point to one when the webhook is sent.</li>
    <li>No user name or password in the address.</li>
  </ul>
  <DocNote kind="tip" title="Testing on your own computer">
    <p>Your laptop isn’t reachable from the internet, so use a tunnel (such as ngrok or Cloudflare Tunnel) to get a public https address that forwards to it, and set that as the webhook.</p>
  </DocNote>

  <h2>Managing your webhook</h2>
  <table>
    <thead><tr><th>Endpoint</th><th>Does</th></tr></thead>
    <tbody>
      <tr><td><code>GET /api/kyc/webhook</code></td><td>Shows your default webhook address.</td></tr>
      <tr><td><code>PUT /api/kyc/webhook</code></td><td>Sets it: <code v-pre>{"webhook_url": "https://…"}</code>. <code>null</code> or <code>""</code> removes it.</td></tr>
      <tr><td><code>GET /api/kyc/webhook-secret</code></td><td>Shows your signing secret (made the first time you ask).</td></tr>
      <tr><td><code>POST /api/kyc/webhook-secret/rotate</code></td><td>Replaces it. The old one stops working at once, so update your server straight after.</td></tr>
    </tbody>
  </table>
  <DocNote kind="danger" title="If your secret leaks">
    <p>Rotate it right away. Anyone holding it could send your server fake results.</p>
  </DocNote>
</template>

<script setup>
import CodeBlock from '../../../components/docs/CodeBlock.vue';
import DocNote from '../../../components/docs/DocNote.vue';
import {API} from '../docs.js';

const secret = [
  {label: 'curl', code: `curl ${API}/api/kyc/webhook-secret -H "Authorization: Bearer $SMATID_TOKEN"`},
];
const secretResponse = `{"webhook_secret": "whsec_kL2r9…"}`;

const setDefault = [
  {label: 'curl', code: `
curl -X PUT ${API}/api/kyc/webhook \\
  -H "Authorization: Bearer $SMATID_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"webhook_url": "https://acme.co.zw/hooks/smatid"}'`},
  {label: 'Node.js', code: `
await fetch('${API}/api/kyc/webhook', {
  method: 'PUT',
  headers: {Authorization: \`Bearer \${process.env.SMATID_TOKEN}\`, 'Content-Type': 'application/json'},
  body: JSON.stringify({webhook_url: 'https://acme.co.zw/hooks/smatid'}),
});`},
];

const payload = `
{
  "id": "evt_Qm3c8yW1v9rTdA2x",
  "event": "liveness.completed",
  "created_at": "2026-11-02T13:06:39.781Z",
  "data": {
    "session_id": "lv_W11D-72wW0BsmnXBc11uBxBMofx8uF0R",
    "reference": "cust-42",
    "status": "passed",
    "passed": true,
    "attempts": 1,
    "failure_reason": null,
    "scores": {"real": 0.615, "similarity": 0.64},
    "steps": [ … ],
    "completed_at": "2026-11-02T13:06:39.000Z",
    …
  }
}`;

const verify = [
  {label: 'Node.js (Express)', code: `
const crypto = require('crypto');
const express = require('express');
const app = express();

function isFromSmatid(rawBody, header, secret) {
  const parts = Object.fromEntries(String(header || '').split(',').map((p) => p.split('=')));
  const t = Number(parts.t);
  if (!t || !parts.v1 || Math.abs(Date.now() / 1000 - t) > 300) return false;
  const expected = crypto.createHmac('sha256', secret).update(\`\${t}.\${rawBody}\`).digest('hex');
  return parts.v1.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(parts.v1), Buffer.from(expected));
}

// express.raw keeps the body exactly as it arrived.
app.post('/hooks/smatid', express.raw({type: 'application/json'}), async (req, res) => {
  const raw = req.body.toString('utf8');
  if (!isFromSmatid(raw, req.get('Smatid-Signature'), process.env.SMATID_WEBHOOK_SECRET)) {
    return res.sendStatus(401);
  }
  const {event, data} = JSON.parse(raw);
  if (event === 'liveness.completed') {
    await saveLivenessResult(data.reference, data.session_id, data.status, data.passed);
  }
  res.sendStatus(200);
});`},
  {label: 'PHP', code: `
<?php
$raw = file_get_contents('php://input');
$header = $_SERVER['HTTP_SMATID_SIGNATURE'] ?? '';
$secret = getenv('SMATID_WEBHOOK_SECRET');

parse_str(str_replace(',', '&', $header), $parts);
$t = (int) ($parts['t'] ?? 0);
$expected = hash_hmac('sha256', $t . '.' . $raw, $secret);

if (!$t || abs(time() - $t) > 300 || !hash_equals($expected, $parts['v1'] ?? '')) {
    http_response_code(401);
    exit;
}

$webhook = json_decode($raw, true);
if ($webhook['event'] === 'liveness.completed') {
    $data = $webhook['data'];
    // save $data['session_id'], $data['status'], $data['passed'] against $data['reference']
}
http_response_code(200);`},
  {label: 'Python (Flask)', code: `
import hashlib, hmac, os, time
from flask import Flask, request, abort

app = Flask(__name__)

def is_from_smatid(raw: bytes, header: str, secret: str) -> bool:
    parts = dict(p.split("=", 1) for p in header.split(",") if "=" in p)
    t = int(parts.get("t", 0))
    if not t or abs(time.time() - t) > 300:
        return False
    expected = hmac.new(secret.encode(), f"{t}.".encode() + raw, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, parts.get("v1", ""))

@app.post("/hooks/smatid")
def smatid_webhook():
    raw = request.get_data()
    if not is_from_smatid(raw, request.headers.get("Smatid-Signature", ""), os.environ["SMATID_WEBHOOK_SECRET"]):
        abort(401)
    webhook = request.get_json()
    if webhook["event"] == "liveness.completed":
        data = webhook["data"]
        # save data["session_id"], data["status"], data["passed"] against data["reference"]
    return "", 200`},
];
</script>
