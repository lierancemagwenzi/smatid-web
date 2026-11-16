<template>
  <h1>Verification sessions</h1>
  <p class="lead">
    The simplest way to verify someone’s identity from your app or website. You open a session saying what to check, send the person to the
    <RouterLink to="/docs/smatid-app">Smatid Verify app</RouterLink>, and read the result. You don’t build any scanner, and your token never leaves your server.
  </p>

  <h2>How it works</h2>
  <ol class="steps">
    <li><strong>You open a session</strong>Your server calls <code>POST /api/kyc/verifications</code> with the type of check. You get back a link to the app and a short code.</li>
    <li><strong>You send the person to Smatid Verify</strong>Open the <code>app_link</code> from your app, or show the code for them to type into Smatid Verify.</li>
    <li><strong>They do the checks</strong>Smatid Verify shows who asked (your company name) and walks them through each step: passport or ID card, chip, liveness, face match.</li>
    <li><strong>They come back, and you read the result</strong>Smatid Verify sends them to your <code>return_url</code>. Your server reads the result with <code>GET /api/kyc/verifications/:id</code>, or gets it by webhook.</li>
  </ol>

  <h2 id="types">Session types</h2>
  <table>
    <thead><tr><th><code>type</code></th><th>Steps, in order</th><th>Use it for</th></tr></thead>
    <tbody>
      <tr><td><code>liveness</code></td><td>liveness</td><td>Just checking a live person is there.</td></tr>
      <tr><td><code>passport</code></td><td>passport</td><td>Reading a passport’s photo page.</td></tr>
      <tr><td><code>passport_chip</code></td><td>passport, chip</td><td>Proof the passport is genuine.</td></tr>
      <tr><td><code>full</code></td><td>passport, chip, liveness, face_match</td><td><strong>Full identity check:</strong> a genuine passport, held by the person in front of the camera.</td></tr>
      <tr><td><code>id_card</code></td><td>id_card</td><td>Reading a Zimbabwean national ID card.</td></tr>
      <tr><td><code>id_card_full</code></td><td>id_card, liveness, face_match</td><td>Identity check with a national ID card. The face is matched to the card’s photo.</td></tr>
    </tbody>
  </table>
  <p>Each step is charged as its own check, the same as calling it directly. See <RouterLink to="/docs/credits">Credits &amp; billing</RouterLink>.</p>

  <h2 id="create">Step 1: Open a session</h2>
  <EndpointLine method="POST" path="/api/kyc/verifications" auth="Bearer token" />
  <table>
    <thead><tr><th>Field</th><th>Description</th></tr></thead>
    <tbody>
      <tr><td><code>type</code></td><td>Required. One of the <a href="#types">types</a> above.</td></tr>
      <tr><td><code>reference</code></td><td>Your own ID for the person or application, up to 255 characters. Every check in the session carries it.</td></tr>
      <tr><td><code>return_url</code></td><td>Where Smatid Verify sends the person when they’re done: your app’s link, like <code>acmewallet://kyc/done</code>, or an <code>https://</code> page.</td></tr>
    </tbody>
  </table>
  <CodeBlock :tabs="create" />
  <CodeBlock :tabs="[{label: 'Response · 201', code: created}]" />
  <ul>
    <li>Keep <code>verification_id</code> with the person’s record: it’s how you read the result.</li>
    <li>The session lasts <strong>30 minutes</strong>.</li>
  </ul>

  <h2 id="send">Step 2: Send the person to Smatid Verify</h2>
  <p>Two ways, and it’s best to offer both:</p>
  <ul>
    <li><strong>The link.</strong> Open <code>app_link</code> (<code>smatid-verify://verify?id=vs_…</code>) from your app. If Smatid Verify is installed, it opens straight onto the session.</li>
    <li><strong>The code.</strong> Show <code>code</code> (like <code>K7QM-4P2X</code>) and ask the person to open Smatid Verify, tap <em>Verify</em> and type it in. This works when the link can’t open the app, for example if the person is on a computer and verifies on their phone.</li>
  </ul>
  <DocNote kind="warn" title="Keep your token on your server">
    <p>Open sessions from your server, not from inside your mobile app. Anyone can pull a token out of an installed app. The link and the code only open this one session, so they’re safe to give to the person.</p>
  </DocNote>

  <h2 id="return">Step 3: The person comes back</h2>
  <p>When they finish or cancel, Smatid Verify opens your <code>return_url</code> with the session added:</p>
  <CodeBlock :tabs="[{label: 'Return link', code: 'acmewallet://kyc/done?verification_id=vs_Rk2…&status=completed'}]" />
  <p>Treat this only as a signal to go and read the result. Anyone can edit a link, so never take the outcome from it.</p>

  <h2 id="result">Step 4: Read the result</h2>
  <EndpointLine method="GET" path="/api/kyc/verifications/:verification_id" auth="Bearer token" />
  <CodeBlock :tabs="get" />
  <CodeBlock :tabs="[{label: 'Response · 200', code: result}]" />

  <h3>Fields</h3>
  <table>
    <thead><tr><th>Field</th><th>Description</th></tr></thead>
    <tbody>
      <tr><td><code>status</code></td><td>Where the session is: see below.</td></tr>
      <tr><td><code>outcome</code></td><td><strong>The one field to base a decision on.</strong> <code>null</code> until the session is <code>completed</code>.</td></tr>
      <tr><td><code>steps</code></td><td>Each step of the type, with its own result: <code>passed</code>, <code>review</code>, <code>failed</code>, <code>skipped</code> or <code>not_done</code>.</td></tr>
      <tr><td><code>skipped</code></td><td>Steps the app couldn’t do, and why. Only the chip can be skipped: <code>no_nfc</code> (the phone can’t read chips) or <code>skipped</code> (the person said the passport has no chip).</td></tr>
      <tr><td><code>passport</code></td><td>The passport scan, with <code>chip</code> and <code>face_match</code>, exactly as <RouterLink to="/docs/passport">GET /api/kyc/passport/:scan_id</RouterLink> gives it. <code>null</code> if there isn’t one.</td></tr>
      <tr><td><code>id_card</code></td><td>The ID card scan, as <RouterLink to="/docs/id-cards">GET /api/kyc/id-card/:scan_id</RouterLink> gives it.</td></tr>
      <tr><td><code>liveness</code></td><td>The liveness check, as <RouterLink to="/docs/liveness#result">GET /api/kyc/liveness/:session_id</RouterLink> gives it.</td></tr>
    </tbody>
  </table>
  <p>You can fetch the pictures with each check’s own endpoints and IDs, e.g. the chip photo with <code>GET /api/kyc/passport/:scan_id/chip/photo</code>.</p>

  <h3>Statuses</h3>
  <table>
    <thead><tr><th>Status</th><th>Meaning</th><th>Final?</th></tr></thead>
    <tbody>
      <tr><td><code>pending</code></td><td>Smatid Verify hasn’t opened it yet.</td><td>No</td></tr>
      <tr><td><code>in_progress</code></td><td>The person has opened it in Smatid Verify.</td><td>No</td></tr>
      <tr><td><code>completed</code></td><td>The person finished. <code>outcome</code> is set.</td><td>Yes</td></tr>
      <tr><td><code>cancelled</code></td><td>The person gave up in the app.</td><td>Yes</td></tr>
      <tr><td><code>expired</code></td><td>Not finished within 30 minutes. Open a new session.</td><td>Yes</td></tr>
    </tbody>
  </table>

  <h3>Outcomes</h3>
  <table>
    <thead><tr><th>Outcome</th><th>Meaning</th><th>What to do</th></tr></thead>
    <tbody>
      <tr><td><code>verified</code></td><td>Every step passed.</td><td>Accept.</td></tr>
      <tr><td><code>review</code></td><td>None failed, but one needs a person: a face match <code>review</code>, a chip that’s <code>unverified</code>, an ID card for review, or the chip was skipped.</td><td>Have someone look at the pictures and details.</td></tr>
      <tr><td><code>failed</code></td><td>A step failed.</td><td>Don’t accept. You can open a new session to let them try again.</td></tr>
      <tr><td><code>incomplete</code></td><td>The app finished without doing every step.</td><td>Open a new session.</td></tr>
    </tbody>
  </table>

  <h2 id="webhook">Getting it by webhook</h2>
  <p>
    If you’ve set a <RouterLink to="/docs/webhooks">default webhook</RouterLink>, Smatid sends a <code>verification.completed</code> event to it when a
    session is completed or cancelled. It’s signed like every other webhook, and its <code>data</code> is exactly what <code>GET /api/kyc/verifications/:id</code> returns.
    It’s sent once. Read the session with the GET above if you miss it.
  </p>

  <h2>Errors</h2>
  <table>
    <thead><tr><th>Status</th><th>Error</th><th>Meaning</th></tr></thead>
    <tbody>
      <tr><td>400</td><td><code>invalid_type</code></td><td>Not one of the types. <code>types</code> lists them.</td></tr>
      <tr><td>400</td><td><code>invalid_reference</code></td><td>Empty, or longer than 255 characters.</td></tr>
      <tr><td>400</td><td><code>invalid_return_url</code></td><td>Must be <code>https://</code>, <code>http://localhost</code> (testing) or an app link.</td></tr>
      <tr><td>404</td><td><code>verification_not_found</code></td><td>No such session, or it isn’t yours.</td></tr>
    </tbody>
  </table>
  <p>Opening and reading sessions is free. A check that can’t run because you’re out of credits, or its module is off, shows the person a message in the app.</p>
</template>

<script setup>
import CodeBlock from '../../../components/docs/CodeBlock.vue';
import DocNote from '../../../components/docs/DocNote.vue';
import EndpointLine from '../../../components/docs/EndpointLine.vue';
import {API} from '../docs.js';

const create = [
  {label: 'curl', code: `
curl -X POST ${API}/api/kyc/verifications \\
  -H "Authorization: Bearer $SMATID_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"type": "full", "reference": "cust-42", "return_url": "acmewallet://kyc/done"}'`},
  {label: 'Node.js', code: `
const res = await fetch('${API}/api/kyc/verifications', {
  method: 'POST',
  headers: {Authorization: \`Bearer \${process.env.SMATID_TOKEN}\`, 'Content-Type': 'application/json'},
  body: JSON.stringify({type: 'full', reference: 'cust-42', return_url: 'acmewallet://kyc/done'}),
});
const session = await res.json();
// Save session.verification_id; give your app session.app_link and session.code`},
  {label: 'PHP', code: `
$ch = curl_init('${API}/api/kyc/verifications');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . getenv('SMATID_TOKEN'), 'Content-Type: application/json'],
    CURLOPT_POSTFIELDS => json_encode(['type' => 'full', 'reference' => 'cust-42', 'return_url' => 'acmewallet://kyc/done']),
]);
$session = json_decode(curl_exec($ch), true);`},
  {label: 'Python', code: `
res = requests.post(
    "${API}/api/kyc/verifications",
    headers={"Authorization": f"Bearer {os.environ['SMATID_TOKEN']}"},
    json={"type": "full", "reference": "cust-42", "return_url": "acmewallet://kyc/done"},
    timeout=30,
)
session = res.json()`},
];

const created = `
{
  "verification_id": "vs_Rk2…",
  "code": "K7QM-4P2X",
  "type": "full",
  "reference": "cust-42",
  "status": "pending",
  "outcome": null,
  "steps": {"passport": "not_done", "chip": "not_done", "liveness": "not_done", "face_match": "not_done"},
  "skipped": {},
  "app_link": "smatid-verify://verify?id=vs_Rk2…",
  "return_url": "acmewallet://kyc/done",
  "passport": null,
  "id_card": null,
  "liveness": null,
  "opened_at": null,
  "completed_at": null,
  "expires_at": "2026-11-12T10:30:00.000Z",
  "created_at": "2026-11-12T10:00:00.000Z"
}`;

const get = [
  {label: 'curl', code: `curl ${API}/api/kyc/verifications/vs_Rk2… -H "Authorization: Bearer $SMATID_TOKEN"`},
  {label: 'Node.js', code: `
const res = await fetch(\`${API}/api/kyc/verifications/\${verificationId}\`, {
  headers: {Authorization: \`Bearer \${process.env.SMATID_TOKEN}\`},
});
const v = await res.json();
if (v.status === 'completed' && v.outcome === 'verified') { /* accept */ }`},
];

const result = `
{
  "verification_id": "vs_Rk2…",
  "code": "K7QM-4P2X",
  "type": "full",
  "reference": "cust-42",
  "status": "completed",
  "outcome": "verified",
  "steps": {"passport": "passed", "chip": "passed", "liveness": "passed", "face_match": "passed"},
  "skipped": {},
  "app_link": "smatid-verify://verify?id=vs_Rk2…",
  "return_url": "acmewallet://kyc/done",
  "passport": {
    "scan_id": "ps_Xq3v…", "status": "passed", "passed": true,
    "document": {"surname": "MOYO", "given_names": "TARIRO GRACE", "document_number": "FN1234567", "…": "…"},
    "chip": {"status": "verified", "verified": true, "…": "…"},
    "face_match": {"status": "match", "similarity": 0.62, "identity_verified": true, "…": "…"},
    "…": "…"
  },
  "id_card": null,
  "liveness": {"session_id": "lv_W11D…", "status": "passed", "passed": true, "…": "…"},
  "opened_at": "2026-11-12T10:01:12.000Z",
  "completed_at": "2026-11-12T10:04:55.000Z",
  "expires_at": "2026-11-12T10:30:00.000Z",
  "created_at": "2026-11-12T10:00:00.000Z"
}`;
</script>
