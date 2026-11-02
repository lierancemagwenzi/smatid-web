<template>
  <h1>Redirects &amp; popups</h1>
  <p class="lead">Bring the person back to your website or app when they’ve finished, and let a page that opened the check know it’s over.</p>

  <h2>Redirects</h2>
  <p>Give <code>redirect_url</code> when you <RouterLink to="/docs/liveness#create">open the session</RouterLink>. When the session ends (passed, failed after 3 tries, or expired), the person sees the result for 3 seconds and is sent there, with two values added:</p>
  <CodeBlock :tabs="[{label: 'The person lands on', code: landed}]" />
  <table>
    <thead><tr><th>Added</th><th>Value</th></tr></thead>
    <tbody>
      <tr><td><code>session_id</code></td><td>The session that just ended.</td></tr>
      <tr><td><code>status</code></td><td><code>passed</code>, <code>failed</code> or <code>expired</code>.</td></tr>
    </tbody>
  </table>
  <p>Anything already in your address, like <code>?step=3</code>, is kept.</p>

  <DocNote kind="danger" title="Don’t decide on the address">
    <p>Anyone can type <code>status=passed</code> into an address. Use <code>status</code> only to choose what to show, then confirm with your webhook or <code>GET /api/kyc/liveness/:session_id</code> from your server before you act on it.</p>
  </DocNote>

  <h3>Handling it on your site</h3>
  <ol class="steps">
    <li><strong>Find the session</strong>Look up the customer by <code>session_id</code> (you saved it when you opened the session).</li>
    <li><strong>Confirm the result from your server</strong>Read it from your webhook’s record, or ask the API.</li>
    <li><strong>Show the next step</strong>Carry on if it passed. If not, explain, and open a new session if they should try again.</li>
  </ol>
  <CodeBlock :tabs="handle" />

  <h3>Allowed addresses</h3>
  <table>
    <thead><tr><th>Kind</th><th>Example</th></tr></thead>
    <tbody>
      <tr><td>A web page</td><td><code>https://acme.co.zw/kyc/done</code></td></tr>
      <tr><td>A mobile app link</td><td><code>acmebank://kyc/done</code></td></tr>
      <tr><td>Your own computer, for testing</td><td><code>http://localhost:3000/done</code></td></tr>
    </tbody>
  </table>
  <p>Plain <code>http://</code> to other addresses, and <code>javascript:</code>, <code>data:</code>, <code>file:</code> and similar, are refused with <code>invalid_redirect_url</code>.</p>

  <h3>Mobile apps</h3>
  <ol class="steps">
    <li><strong>Register a link for your app</strong>A custom scheme like <code>acmebank://</code>, or an App Link (Android) / Universal Link (iOS) such as <code>https://acme.co.zw/app/kyc-done</code>.</li>
    <li><strong>Open the session with it</strong>Pass it as <code>redirect_url</code>.</li>
    <li><strong>Open <code>url</code> in the phone’s browser</strong>Chrome Custom Tabs on Android, <code>SFSafariViewController</code> or <code>ASWebAuthenticationSession</code> on iOS. A plain web view often can’t use the camera.</li>
    <li><strong>Catch the link when it opens your app</strong>Read <code>session_id</code> from it, then get the result from your server.</li>
  </ol>

  <h2 id="popup">Popups</h2>
  <p>On a website, you can open the check in a popup window instead of sending the person away. When the session ends, the popup sends your page a message, then closes itself (unless you gave a <code>redirect_url</code>, in which case it goes there).</p>
  <CodeBlock :tabs="[{label: 'The message', code: message}]" />
  <ol class="steps">
    <li><strong>Get the link from your server</strong>Open the session server-side (never put your token in the page), and pass the <code>url</code> to the page.</li>
    <li><strong>Open it when the person clicks</strong>Browsers block popups that aren’t opened from a click.</li>
    <li><strong>Listen for the message</strong>Accept it only from Smatid’s address, and only with <code>type</code> <code>smatid.liveness</code>.</li>
    <li><strong>Confirm with your server</strong>The message tells you it’s over; your server tells you how it went.</li>
  </ol>
  <CodeBlock :tabs="popup" />
</template>

<script setup>
import CodeBlock from '../../../components/docs/CodeBlock.vue';
import DocNote from '../../../components/docs/DocNote.vue';
import {API} from '../docs.js';

const landed = `https://acme.co.zw/kyc/done?session_id=lv_W11D-72wW0BsmnXBc11uBxBMofx8uF0R&status=passed`;

const handle = [
  {label: 'Node.js (Express)', code: `
app.get('/kyc/done', async (req, res) => {
  const sessionId = String(req.query.session_id || '');
  const customer = await findCustomerByLivenessSession(sessionId);
  if (!customer) return res.status(404).send('Unknown session');

  // Confirm with Smatid, from the server. Never trust req.query.status.
  const r = await fetch(\`${API}/api/kyc/liveness/\${encodeURIComponent(sessionId)}\`, {
    headers: {Authorization: \`Bearer \${process.env.SMATID_TOKEN}\`},
  });
  const result = await r.json();

  if (result.passed) return res.redirect('/onboarding/next-step');
  res.render('liveness-retry', {reason: result.failure_reason, status: result.status});
});`},
];

const message = `{"type": "smatid.liveness", "session_id": "lv_W11D-72wW0BsmnXBc11uBxBMofx8uF0R", "status": "passed"}`;

const popup = [
  {label: 'JavaScript (your page)', code: `
const SMATID = '${API}';

document.querySelector('#verify').addEventListener('click', async () => {
  // Your server opens the session with its token and returns {url}.
  const {url} = await (await fetch('/api/start-liveness', {method: 'POST'})).json();
  window.open(url, 'smatid', 'width=480,height=780');
});

window.addEventListener('message', async (event) => {
  if (event.origin !== SMATID) return;
  if (!event.data || event.data.type !== 'smatid.liveness') return;

  // It's over: ask your server for the real result.
  const result = await (await fetch(\`/api/liveness-result/\${event.data.session_id}\`)).json();
  showResult(result);
});`},
];
</script>
