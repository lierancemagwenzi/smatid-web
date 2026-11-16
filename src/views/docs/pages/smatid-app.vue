<template>
  <h1>The Smatid Verify app</h1>
  <p class="lead">
    Smatid Verify is Smatid’s own app for Android and iPhone. It does the identity checks that need a phone (scanning a passport or ID card,
    reading a passport chip, the liveness check) for any company that asks. You don’t build a scanner: you open a
    <RouterLink to="/docs/verification">verification session</RouterLink> and send the person to the app.
  </p>

  <h2>The whole journey</h2>
  <ol class="steps">
    <li><strong>In your app</strong>The person taps something like <em>Verify my identity</em>. Your server opens a session, and your app shows its code and a <em>Verify with Smatid</em> button.</li>
    <li><strong>Into Smatid Verify</strong>The button opens Smatid Verify on the session. If the app isn’t installed, the person installs it from the App Store or Google Play, opens it, taps <em>Verify</em> and types the code.</li>
    <li><strong>Who’s asking</strong>Smatid Verify shows your company’s name, what it asks for, and the steps they’ll go through. They tap <em>Start</em>.</li>
    <li><strong>The checks</strong>The app runs each step in turn: see below. If one is interrupted, the session stays open and they can start again.</li>
    <li><strong>Done</strong>They see whether they’re verified, need a review, or weren’t verified, and that the result has been sent to you. <em>Back to</em> your app opens your <code>return_url</code>.</li>
    <li><strong>Back in your app</strong>Your server reads the result with <code>GET /api/kyc/verifications/:id</code>, or gets it by webhook.</li>
  </ol>

  <h2 id="steps">What the person does at each step</h2>
  <table>
    <thead><tr><th>Step</th><th>What they see</th></tr></thead>
    <tbody>
      <tr>
        <td><strong>Passport</strong></td>
        <td>
          The camera, with a passport-shaped frame and a band for the two lines of <code>&lt;&lt;&lt;</code> text at the bottom of the photo page.
          The frame turns green once it’s reading. The picture is taken by itself once the text has been read the same way twice and every check digit matches,
          so blurred passports aren’t sent. There’s a torch button, and tips appear if nothing has been read after a few seconds.
        </td>
      </tr>
      <tr>
        <td><strong>Chip</strong></td>
        <td>
          They close the passport and hold the top of the phone flat on its cover. On iPhone the system’s NFC sheet appears; on Android, the app shows progress,
          and if the phone slips off, putting it back carries on. Takes a few seconds. If the phone has no NFC, the step is skipped by itself.
          If the passport has no chip, they can skip it.
        </td>
      </tr>
      <tr>
        <td><strong>ID card</strong></td>
        <td>The camera, with a card-shaped frame. They hold the front of their Zimbabwean ID (metal or plastic) in the frame, and the picture is taken once the ID number has been read.</td>
      </tr>
      <tr>
        <td><strong>Liveness</strong></td>
        <td>The same check as the <RouterLink to="/docs/liveness">hosted liveness page</RouterLink>, inside the app: face in the oval, then look straight, turn left, turn right and open their mouth, in a random order. About 20 seconds.</td>
      </tr>
      <tr>
        <td><strong>Face match</strong></td>
        <td>Nothing to do: Smatid compares the face from the liveness check with the passport’s chip photo (or the ID card’s photo) by itself.</td>
      </tr>
    </tbody>
  </table>
  <p>Every check is made by Smatid’s servers, not the phone. The phone reads the document and takes the pictures; Smatid decides what they say and whether they pass.</p>

  <h2 id="your-app">Sending people to Smatid Verify from your app</h2>
  <CodeBlock :tabs="flutter" />
  <ul>
    <li><strong>Show the code as well as the button.</strong> If Smatid Verify isn’t installed, the link can’t open it. The person can install it, open it and type the code.</li>
    <li><strong>Register your <code>return_url</code></strong> as a link your app opens (a custom scheme like <code>acmewallet://</code>, or an Android App Link / iOS Universal Link).</li>
    <li><strong>Don’t wait for the return link alone.</strong> The person may switch back to your app by hand. While a session is open, check it every few seconds, or when your app comes back to the foreground, until its <code>status</code> is final.</li>
    <li><strong>A website works too.</strong> Show the code (or a QR code of the <code>app_link</code>) and use an <code>https://</code> <code>return_url</code>.</li>
  </ul>

  <h2 id="privacy">What the app knows, and what you get</h2>
  <ul>
    <li><strong>The app holds no token.</strong> The session is its key, and it can only do that session’s steps, on that session’s own scans, while it’s open. It can’t set a webhook or a different reference.</li>
    <li><strong>The checks are yours.</strong> They’re logged and charged to your account, with your <code>reference</code>, as if you’d called them yourself.</li>
    <li><strong>The person sees their outcome, not your decision.</strong> Smatid Verify tells them whether they were verified. What you do with it is up to you.</li>
    <li><strong>You get everything.</strong> The session’s result has each check’s full details: the document, chip, face match and liveness results. The pictures are available from each check’s endpoints.</li>
  </ul>

  <h2>What the person needs</h2>
  <ul>
    <li>An Android phone or an iPhone with a camera and an internet connection.</li>
    <li>Their passport or Zimbabwean ID card, and good light.</li>
    <li>For the chip: a phone with NFC (most Android phones, iPhone 7 and later) and a passport with a chip (look for the chip symbol on the cover).</li>
  </ul>

  <h2 id="app-api">The app’s side of the API</h2>
  <p>
    For reference only: these are the calls Smatid Verify makes. They take no token; the session ID in the path is the key. Your code
    doesn’t call them. If you build your own app on the <RouterLink to="/docs/sdk">Flutter SDK</RouterLink>, <code>SmatidKyc.forVerification</code> makes them for you.
  </p>
  <table>
    <thead><tr><th>Method</th><th>Path</th><th>Does</th></tr></thead>
    <tbody>
      <tr v-for="e in appApi" :key="e[0] + e[1]">
        <td><span class="m" :class="e[0].toLowerCase()">{{ e[0] }}</span></td>
        <td><code>{{ e[1] }}</code></td>
        <td>{{ e[2] }}</td>
      </tr>
    </tbody>
  </table>
  <p>Typing a code is limited to 20 tries per 15 minutes from one network address, so codes can’t be guessed.</p>
</template>

<script setup>
import CodeBlock from '../../../components/docs/CodeBlock.vue';

const flutter = [
  {label: 'Flutter', code: `
// Your server opened the session and gave the app its app_link and code.
final opened = await launchUrl(Uri.parse(session.appLink), mode: LaunchMode.externalApplication);
if (!opened) {
  // Smatid Verify isn't installed: ask them to install it, open it and enter session.code.
}

// When your return_url opens the app (acmewallet://kyc/done?verification_id=vs_…&status=completed),
// ask your server for the result. It calls GET /api/kyc/verifications/:id with your token.`},
  {label: 'Android (manifest)', code: `
<!-- Let acmewallet://kyc/done open your app -->
<intent-filter>
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="acmewallet" android:host="kyc" />
</intent-filter>

<!-- Android 11+: allow your app to open smatid-verify:// links -->
<queries>
  <intent>
    <action android:name="android.intent.action.VIEW" />
    <data android:scheme="smatid-verify" />
  </intent>
</queries>`},
  {label: 'iOS (Info.plist)', code: `
<!-- Let acmewallet://kyc/done open your app -->
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array><string>acmewallet</string></array>
  </dict>
</array>

<!-- Allow your app to open smatid-verify:// links -->
<key>LSApplicationQueriesSchemes</key>
<array><string>smatid-verify</string></array>`},
];

const appApi = [
  ['POST', '/api/verify/claim', 'Turns a typed code into the session’s ID'],
  ['GET', '/api/verify/:verification_id', 'Who’s asking and which steps to run; marks the session in progress'],
  ['POST', '/api/verify/:verification_id/passport', 'The passport photo page scan'],
  ['POST', '/api/verify/:verification_id/passport/:scan_id/chip', 'The passport chip'],
  ['GET', '/api/verify/:verification_id/passport/:scan_id/chip/photo', 'The chip’s photo'],
  ['POST', '/api/verify/:verification_id/passport/:scan_id/face-match', 'Passport photo against the live face'],
  ['POST', '/api/verify/:verification_id/id-card', 'The ID card scan'],
  ['POST', '/api/verify/:verification_id/id-card/:scan_id/face-match', 'Card photo against the live face'],
  ['POST', '/api/verify/:verification_id/liveness', 'Opens the session’s liveness check'],
  ['GET', '/api/verify/:verification_id/liveness/:session_id', 'The liveness result'],
  ['GET', '/api/verify/:verification_id/liveness/:session_id/image', 'The liveness face photo'],
  ['POST', '/api/verify/:verification_id/complete', 'Closes the session, with any steps skipped'],
  ['POST', '/api/verify/:verification_id/cancel', 'The person gave up'],
];
</script>

<style scoped>
.m { font-size: 11.5px; font-weight: 700; padding: 2px 7px; border-radius: 5px; }
.get { background: #e7f6ef; color: #047857; }
.post { background: #f5edfd; color: #830bc9; }
</style>
