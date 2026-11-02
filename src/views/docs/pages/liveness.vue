<template>
  <h1>Liveness</h1>
  <p class="lead">
    Check that a real, live person is in front of the camera, not a printed photo, a picture on a screen or a still image.
    Smatid hosts the camera page; you send the person a link and get the result back.
  </p>

  <h2>How it works</h2>
  <ol class="steps">
    <li><strong>You open a session</strong>Your server calls <code>POST /api/kyc/liveness</code> and gets back a link.</li>
    <li><strong>You send the person the link</strong>By SMS, email, WhatsApp, a QR code, or by opening it in your app or website.</li>
    <li><strong>They take the check</strong>On Smatid’s page they look at the camera, turn their head both ways and open their mouth, in a random order. About 20 seconds.</li>
    <li><strong>You get the result</strong>By webhook, by asking the API, or as they’re sent back to you. See <RouterLink to="/docs/results">Getting results</RouterLink>.</li>
  </ol>

  <h2 id="create">Step 1: Open a session</h2>
  <EndpointLine method="POST" path="/api/kyc/liveness" auth="Bearer token" />
  <p>All fields are optional.</p>
  <table>
    <thead><tr><th>Field</th><th>Description</th></tr></thead>
    <tbody>
      <tr><td><code>reference</code></td><td>Your own ID for the person or application, e.g. <code>cust-42</code>. Up to 255 characters. Given back in every result.</td></tr>
      <tr><td><code>redirect_url</code></td><td>Where to send the person when they’re done: an <code>https://</code> page on your site, or an app link like <code>acmebank://kyc/done</code>. See <RouterLink to="/docs/redirects">Redirects</RouterLink>.</td></tr>
      <tr><td><code>webhook_url</code></td><td>An <code>https://</code> address on your server to POST the result to. Leave it out to use your default webhook, if you have one. See <RouterLink to="/docs/webhooks">Webhooks</RouterLink>.</td></tr>
    </tbody>
  </table>
  <CodeBlock :tabs="create" />
  <CodeBlock :tabs="[{label: 'Response · 201', code: created}]" />
  <p>Keep <code>session_id</code>: it’s how you get the result. Send the person <code>url</code>.</p>

  <h2 id="send">Step 2: Send the person the link</h2>
  <ul>
    <li><strong>Any channel works</strong>: SMS, email, WhatsApp, a QR code on screen, a button in your app.</li>
    <li><strong>A phone is best.</strong> If they open it on a computer, the page shows a QR code so they can carry on with their phone, and the computer follows along and shows the result.</li>
    <li><strong>In your website</strong>, open it in a popup or send them to it. <strong>In a mobile app</strong>, open it in the phone’s browser (Chrome Custom Tabs on Android, <code>SFSafariViewController</code> on iOS), not a plain web view, which often can’t use the camera.</li>
    <li>The link works for <strong>30 minutes</strong> and allows <strong>3 tries</strong>.</li>
  </ul>
  <DocNote kind="warn" title="The link is the key">
    <p>Anyone with the link can take the check, so send it only to the person it’s for. It’s safe to share in the sense that it can’t be used for anything else: it never contains your access token.</p>
  </DocNote>

  <h2 id="person">Step 3: What the person sees</h2>
  <ol>
    <li>Who asked for the check (your company name) and what will happen.</li>
    <li>A request to use the camera. If it’s blocked, step-by-step help for their phone and browser.</li>
    <li>Their camera, with an oval to put their face in, and one instruction at a time: <em>Look straight at the camera</em>, <em>Turn your head to your left</em>, <em>Turn your head to your right</em>, <em>Open your mouth wide</em>, in a random order. A picture is taken as each is held.</li>
    <li>Live coaching if needed: too dark, too far, off-centre, more than one face, phone on its side.</li>
    <li>“You’re done”, then back to you if you gave a <code>redirect_url</code>. If a try fails, they’re told why and can try again.</li>
  </ol>
  <p>The pictures are checked on Smatid’s servers, not on the phone: the face is found again, each movement is measured, the same person must appear in every picture, and an anti-spoof model looks for photos and screens.</p>
  <p>It works in current Chrome, Safari, Edge, Firefox and Samsung Internet, on Android, iPhone and computers with a webcam. Apps with their own browser (Facebook, Instagram, TikTok and similar) are detected, and the person is asked to open the link in their real browser.</p>

  <h2 id="result">Step 4: Get the result</h2>
  <EndpointLine method="GET" path="/api/kyc/liveness/:session_id" auth="Bearer token" />
  <CodeBlock :tabs="get" />
  <CodeBlock :tabs="[{label: 'Response · 200', code: result}]" />
  <p>You can only see sessions you opened. Other ways to get this same result, including having it pushed to you, are in <RouterLink to="/docs/results">Getting results</RouterLink>.</p>

  <h3>Fields</h3>
  <table>
    <thead><tr><th>Field</th><th>Description</th></tr></thead>
    <tbody>
      <tr><td><code>status</code></td><td>Where the session is: see the table below.</td></tr>
      <tr><td><code>passed</code></td><td><code>true</code> only when a live person was confirmed. The one field to base a decision on.</td></tr>
      <tr><td><code>attempts</code></td><td>Tries used so far (up to 3).</td></tr>
      <tr><td><code>failure_reason</code></td><td>Why it failed, when <code>status</code> is <code>failed</code>. See below.</td></tr>
      <tr><td><code>scores.real</code></td><td>The anti-spoof model’s average, 0 to 1 (higher is more likely a real face).</td></tr>
      <tr><td><code>scores.similarity</code></td><td>The lowest “same person” score between the pictures, 0 to 1.</td></tr>
      <tr><td><code>steps</code></td><td>Each step of the last try, with <code>ok</code> and, if not, its <code>problem</code>.</td></tr>
      <tr><td><code>webhook</code></td><td>Where the result is being sent and how that went, or <code>null</code>.</td></tr>
      <tr><td><code>completed_at</code></td><td>When it passed, failed or expired.</td></tr>
    </tbody>
  </table>

  <h3>Statuses</h3>
  <table>
    <thead><tr><th>Status</th><th>Meaning</th><th>Final?</th></tr></thead>
    <tbody>
      <tr><td><code>pending</code></td><td>Not taken yet, or a try failed and they can try again.</td><td>No</td></tr>
      <tr><td><code>started</code></td><td>They’re doing it now.</td><td>No</td></tr>
      <tr><td><code>passed</code></td><td>A live person was confirmed.</td><td>Yes</td></tr>
      <tr><td><code>failed</code></td><td>All 3 tries failed.</td><td>Yes</td></tr>
      <tr><td><code>expired</code></td><td>Not finished within 30 minutes. Open a new session.</td><td>Yes</td></tr>
    </tbody>
  </table>

  <h3>Failure reasons</h3>
  <table>
    <thead><tr><th>Reason</th><th>What happened</th></tr></thead>
    <tbody>
      <tr v-for="r in reasons" :key="r[0]"><td><code>{{ r[0] }}</code></td><td>{{ r[1] }}</td></tr>
    </tbody>
  </table>

  <h2 id="photo">The face photo</h2>
  <EndpointLine method="GET" path="/api/kyc/liveness/:session_id/image" auth="Bearer token" />
  <p>The straight-on picture from the latest try, as a JPEG (640×480). Use it to compare with the photo on an ID document, or to keep with the person’s file.</p>
  <CodeBlock :tabs="photo" />
  <table>
    <thead><tr><th>Status</th><th>Meaning</th></tr></thead>
    <tbody>
      <tr><td>200</td><td>The JPEG.</td></tr>
      <tr><td>404 <code>image_not_available</code></td><td>The person hasn’t finished a try yet.</td></tr>
      <tr><td>404 <code>session_not_found</code></td><td>No such session, or it isn’t yours.</td></tr>
    </tbody>
  </table>
  <DocNote kind="warn" title="This is biometric data">
    <p>Store it securely, only as long as you need it, and in line with your privacy obligations.</p>
  </DocNote>

  <h2>Errors when opening a session</h2>
  <table>
    <thead><tr><th>Status</th><th>Error</th><th>Meaning</th></tr></thead>
    <tbody>
      <tr><td>400</td><td><code>invalid_reference</code></td><td>Empty, or longer than 255 characters.</td></tr>
      <tr><td>400</td><td><code>invalid_redirect_url</code></td><td>Must be <code>https://</code>, <code>http://localhost</code> (testing) or an app link.</td></tr>
      <tr><td>400</td><td><code>webhook_url_must_be_https</code>, <code>webhook_url_not_public</code>, <code>invalid_webhook_url</code></td><td>See <RouterLink to="/docs/webhooks">Webhooks</RouterLink>.</td></tr>
      <tr><td>403</td><td><code>module_disabled</code></td><td>Liveness is switched off for now. See <RouterLink to="/docs/modules">Modules</RouterLink>.</td></tr>
    </tbody>
  </table>

  <DocNote kind="info" title="What it protects against">
    <p>It stops printed photos, photos or videos held up to the camera without the right movements, and still images. The steps come in a new random order every try, so a recording made in advance won’t fit. For the highest-risk uses, talk to Smatid about stronger options.</p>
  </DocNote>
</template>

<script setup>
import CodeBlock from '../../../components/docs/CodeBlock.vue';
import DocNote from '../../../components/docs/DocNote.vue';
import EndpointLine from '../../../components/docs/EndpointLine.vue';
import {API} from '../docs.js';

const create = [
  {label: 'curl', code: `
curl -X POST ${API}/api/kyc/liveness \\
  -H "Authorization: Bearer $SMATID_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "reference": "cust-42",
    "redirect_url": "https://acme.co.zw/kyc/done",
    "webhook_url": "https://acme.co.zw/hooks/smatid"
  }'`},
  {label: 'Node.js', code: `
const res = await fetch('${API}/api/kyc/liveness', {
  method: 'POST',
  headers: {
    Authorization: \`Bearer \${process.env.SMATID_TOKEN}\`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    reference: 'cust-42',
    redirect_url: 'https://acme.co.zw/kyc/done',
  }),
});
const session = await res.json();
// Save session.session_id with the customer, then send them session.url`},
  {label: 'PHP', code: `
$ch = curl_init('${API}/api/kyc/liveness');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . getenv('SMATID_TOKEN'), 'Content-Type: application/json'],
    CURLOPT_POSTFIELDS => json_encode([
        'reference' => 'cust-42',
        'redirect_url' => 'https://acme.co.zw/kyc/done',
    ]),
]);
$session = json_decode(curl_exec($ch), true);
// Save $session['session_id'], then send the person $session['url']`},
  {label: 'Python', code: `
res = requests.post(
    "${API}/api/kyc/liveness",
    headers={"Authorization": f"Bearer {os.environ['SMATID_TOKEN']}"},
    json={"reference": "cust-42", "redirect_url": "https://acme.co.zw/kyc/done"},
    timeout=30,
)
session = res.json()
# Save session["session_id"], then send the person session["url"]`},
];

const created = `
{
  "session_id": "lv_W11D-72wW0BsmnXBc11uBxBMofx8uF0R",
  "reference": "cust-42",
  "status": "pending",
  "passed": false,
  "url": "${API}/liveness/lv_W11D-72wW0BsmnXBc11uBxBMofx8uF0R",
  "attempts": 0,
  "failure_reason": null,
  "scores": null,
  "steps": null,
  "expires_at": "2026-11-02T13:28:52.000Z",
  "completed_at": null,
  "created_at": "2026-11-02T12:58:52.000Z",
  "webhook": {
    "url": "https://acme.co.zw/hooks/smatid",
    "status": null,
    "attempts": 0,
    "delivered_at": null,
    "last_error": null
  }
}`;

const get = [
  {label: 'curl', code: `curl ${API}/api/kyc/liveness/lv_W11D-72wW0BsmnXBc11uBxBMofx8uF0R -H "Authorization: Bearer $SMATID_TOKEN"`},
  {label: 'Node.js', code: `
const res = await fetch(\`${API}/api/kyc/liveness/\${sessionId}\`, {
  headers: {Authorization: \`Bearer \${process.env.SMATID_TOKEN}\`},
});
const result = await res.json();
if (result.passed) { /* a live person was confirmed */ }`},
];

const result = `
{
  "session_id": "lv_W11D-72wW0BsmnXBc11uBxBMofx8uF0R",
  "reference": "cust-42",
  "status": "passed",
  "passed": true,
  "url": "${API}/liveness/lv_W11D-72wW0BsmnXBc11uBxBMofx8uF0R",
  "attempts": 1,
  "failure_reason": null,
  "scores": {"real": 0.615, "similarity": 0.64},
  "steps": [
    {"step": "center",     "ok": true, "problem": null, "turn": 0.455, "mouth": 0.031, "real": 0.6,  "similarity": null},
    {"step": "open_mouth", "ok": true, "problem": null, "turn": 0.475, "mouth": 0.159, "real": 0.62, "similarity": 0.64},
    {"step": "turn_left",  "ok": true, "problem": null, "turn": 0.983, "mouth": 0.019, "real": 0.63, "similarity": 0.64},
    {"step": "turn_right", "ok": true, "problem": null, "turn": -0.056, "mouth": 0.014, "real": 0.61, "similarity": 0.71}
  ],
  "expires_at": "2026-11-02T13:28:52.000Z",
  "completed_at": "2026-11-02T13:06:39.000Z",
  "created_at": "2026-11-02T12:58:52.000Z",
  "webhook": {
    "url": "https://acme.co.zw/hooks/smatid",
    "status": "delivered",
    "attempts": 1,
    "delivered_at": "2026-11-02T13:06:39.000Z",
    "last_error": null
  }
}`;

const photo = [
  {label: 'curl', code: `
curl ${API}/api/kyc/liveness/lv_W11D-72wW0BsmnXBc11uBxBMofx8uF0R/image \\
  -H "Authorization: Bearer $SMATID_TOKEN" -o face.jpg`},
  {label: 'Node.js', code: `
const res = await fetch(\`${API}/api/kyc/liveness/\${sessionId}/image\`, {
  headers: {Authorization: \`Bearer \${process.env.SMATID_TOKEN}\`},
});
if (res.ok) await fs.promises.writeFile('face.jpg', Buffer.from(await res.arrayBuffer()));`},
];

const reasons = [
  ['no_face', 'No face could be found in a picture: too dark, blurred, or turned fully side-on.'],
  ['multiple_faces', 'More than one face was in a picture.'],
  ['face_too_small', 'The face was too far from the camera.'],
  ['not_facing_camera', 'They weren’t looking straight at the camera when asked.'],
  ['did_not_turn_left', 'They didn’t turn far enough to their left.'],
  ['did_not_turn_right', 'They didn’t turn far enough to their right.'],
  ['mouth_not_open', 'They didn’t open their mouth wide enough.'],
  ['different_person', 'The pictures didn’t all show the same person.'],
  ['spoof_suspected', 'The anti-spoof model judged it to be a photo or a screen.'],
  ['duplicate_frames', 'Two pictures were identical: not a live camera.'],
  ['too_fast', 'The try was finished impossibly quickly.'],
  ['too_slow', 'The try took over 3 minutes.'],
  ['wrong_frame_count', 'The wrong number of pictures arrived.'],
  ['invalid_frame', 'A picture wasn’t a usable image.'],
];
</script>
