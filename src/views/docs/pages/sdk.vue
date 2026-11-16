<template>
  <h1>Flutter SDK</h1>
  <p class="lead">
    <code>smatid_kyc</code> puts Smatid’s scanners inside your own Flutter app: the passport scanner, the chip reader, the ID card scanner and the
    liveness check. Each one opens full screen, runs the check with Smatid, and gives you the result.
  </p>

  <DocNote kind="info" title="SDK or Smatid Verify?">
    <p>
      If you’d rather not put scanners or an access token in your app, use <RouterLink to="/docs/verification">verification sessions</RouterLink>:
      the <RouterLink to="/docs/smatid-app">Smatid Verify app</RouterLink> does the scanning and your token stays on your server.
      Use the SDK when the checks must happen inside your own app.
    </p>
  </DocNote>

  <h2>How it works</h2>
  <ol class="steps">
    <li><strong>Your app calls one method</strong>For example <code>kyc.verifyIdentity(context)</code>. The SDK pushes its own full-screen pages.</li>
    <li><strong>The phone reads, Smatid decides</strong>The SDK reads text with Google ML Kit on the phone and reads chips over NFC, then sends the text, pictures and chip files to Smatid. Smatid parses and checks everything again; the phone’s own reading is never trusted.</li>
    <li><strong>You get the result</strong>The method returns Smatid’s answer as Dart objects (<code>PassportScan</code>, <code>IdCardScan</code>, <code>LivenessSession</code>…), or <code>null</code> if the person closed the scanner.</li>
  </ol>

  <h2 id="install">Install</h2>
  <p>Smatid gives you the package. Add it from git or from a folder:</p>
  <CodeBlock :tabs="[{label: 'pubspec.yaml', code: pubspec}]" />
  <p>Needs Flutter 3.35 or newer.</p>

  <h3>Android</h3>
  <ul>
    <li><code>minSdk = 24</code> in <code>android/app/build.gradle.kts</code>.</li>
    <li>Camera and NFC permissions come with the SDK. NFC isn’t required, so phones without it can still install your app.</li>
    <li>The chip reader’s libraries carry duplicate metadata files. Exclude them:</li>
  </ul>
  <CodeBlock :tabs="[{label: 'android/app/build.gradle.kts', code: gradle}]" />

  <h3>iOS</h3>
  <ul>
    <li>iOS 15.5 or newer (<code>platform :ios, '15.5'</code> in <code>ios/Podfile</code>).</li>
    <li>For the chip, add the <strong>Near Field Communication Tag Reading</strong> capability to the Runner target in Xcode (Signing &amp; Capabilities).</li>
    <li>ML Kit only runs on real iPhones, not the simulator: test on a phone.</li>
  </ul>
  <CodeBlock :tabs="[{label: 'ios/Runner/Info.plist', code: plist}, {label: 'ios/Podfile', code: podfile}]" />

  <DocNote kind="warn" title="HTTPS only">
    <p>The SDK talks to Smatid over HTTPS. The liveness check also needs it, because phones only give the camera to secure pages.</p>
  </DocNote>

  <h2 id="start">Getting started</h2>
  <CodeBlock :tabs="[{label: 'Dart', code: start}]" />

  <h2 id="passport">Scan a passport</h2>
  <CodeBlock :tabs="[{label: 'Dart', code: passport}]" />
  <p>The scanner:</p>
  <ul>
    <li>shows a passport-shaped frame with a band for the MRZ, and turns green once it’s reading;</li>
    <li>only takes the picture once two reads in a row agree and every check digit matches, so blurred or half-read passports aren’t sent;</li>
    <li>has a torch button, and gives tips after 12 seconds without a read;</li>
    <li>scans again by itself if Smatid can’t read the MRZ (that isn’t charged), and offers <em>Try again</em> on network errors without rescanning.</li>
  </ul>
  <p>The result is the <RouterLink to="/docs/passport">passport scan</RouterLink>: <code>scan.document</code> has <code>fullName</code>, <code>documentNumber</code>, <code>nationality</code>, <code>birthDate</code>, <code>expiryDate</code> and the rest, and <code>scan.raw</code> the whole JSON reply.</p>

  <h3>The chip</h3>
  <p>Pass <code>readChip: true</code>, and after a clean scan the SDK asks the person to close the passport and hold the phone on its cover.</p>
  <CodeBlock :tabs="[{label: 'Dart', code: chip}]" />
  <ul>
    <li>The MRZ just scanned is the key that opens the chip. On iPhone the system NFC sheet appears; on Android the SDK’s own screen shows progress.</li>
    <li>The person can skip the chip, for passports without one. <code>kyc.readChip(context, scan)</code> reads the chip of a scan made earlier.</li>
    <li>The phone checks nothing itself: it sends the chip’s files exactly as read, and Smatid checks the signature. See <RouterLink to="/docs/passport#chip">The chip</RouterLink>.</li>
    <li>The chip’s photo: <code>await kyc.client.getChipPhoto(scan.scanId)</code> gives JPEG bytes for <code>Image.memory</code>.</li>
  </ul>

  <h2 id="id-card">Scan an ID card</h2>
  <CodeBlock :tabs="[{label: 'Dart', code: idCard}]" />
  <p>
    The scanner waits for good light, reads the ID number the same twice running, takes the picture, and sends its text with where each line is.
    Smatid reads the fields. The result can be <code>passed</code>, <code>review</code> or <code>failed</code>: see <RouterLink to="/docs/id-cards">ID cards</RouterLink>.
  </p>

  <h2 id="liveness">Liveness</h2>
  <CodeBlock :tabs="[{label: 'Dart', code: liveness}]" />
  <p>
    The SDK opens Smatid’s <RouterLink to="/docs/liveness">liveness page</RouterLink> inside your app, with the camera allowed. When the person finishes,
    it reads the result back from Smatid. It never takes the result from the page.
  </p>

  <h2 id="identity">A full identity check</h2>
  <p>One call for all the steps: the document, a liveness check, and the document photo matched to the live face.</p>
  <CodeBlock :tabs="identity" />
  <ul>
    <li><code>verifyIdentity</code>: passport photo page, chip (where the phone and passport have one), liveness, then face match against the chip photo, or the printed photo without a chip. <code>verified</code> needs the chip verified, liveness passed and the faces matching.</li>
    <li><code>verifyIdentityWithIdCard</code>: ID card, liveness, then face match against the card photo. A card that failed stops there; one for review carries on. An ID card has no chip to prove it’s genuine, so its <code>verified</code> is weaker than a passport’s.</li>
    <li><code>stoppedAt</code> names the step that didn’t finish: <code>passport</code>/<code>id_card</code>, <code>chip</code>, <code>liveness</code> or <code>face_match</code>.</li>
    <li>Each step is charged as its own check.</li>
  </ul>

  <h2 id="sessions">Running a verification session</h2>
  <p>
    The SDK can also run a <RouterLink to="/docs/verification">verification session</RouterLink> another app opened, with no token in your app.
    This is how the Smatid Verify app works, and you can use it to build your own.
  </p>
  <CodeBlock :tabs="[{label: 'Dart', code: sessions}]" />

  <h2 id="errors">Errors</h2>
  <p>Problems that scanning again won’t fix come as a <code>SmatidKycException</code>:</p>
  <table>
    <thead><tr><th>Check</th><th>Meaning</th></tr></thead>
    <tbody>
      <tr><td><code>e.unauthorized</code></td><td>The token is wrong or has been revoked.</td></tr>
      <tr><td><code>e.outOfCredits</code></td><td>Not enough credits: top up in the portal.</td></tr>
      <tr><td><code>e.code</code></td><td>The error code, e.g. <code>module_disabled</code>, <code>network_error</code>, <code>timeout</code>. See <RouterLink to="/docs/errors">Errors</RouterLink>.</td></tr>
    </tbody>
  </table>

  <h2 id="screens">Changing the words</h2>
  <p>
    Every screen takes its words as a parameter, to translate them or match your app’s tone: <code>PassportScannerStrings</code>, <code>ChipScreenStrings</code>
    (and its <code>sheet</code> for the iPhone NFC sheet), <code>IdCardScannerStrings</code> and <code>LivenessScreenStrings</code>.
    The screens take their colours from your app’s theme.
  </p>

  <h2 id="lower-level">Without the screens</h2>
  <p><code>kyc.client</code> (<code>SmatidKycClient</code>) makes the API calls on their own, if you build your own screens:</p>
  <table>
    <tbody>
      <tr v-for="m in clientMethods" :key="m[0]"><td><code>{{ m[0] }}</code></td><td>{{ m[1] }}</td></tr>
    </tbody>
  </table>

  <h2 id="token">The access token in your app</h2>
  <DocNote kind="danger" title="Anyone can pull a token out of an installed app">
    <p>With the SDK’s direct checks, your <code>kyc_</code> token is inside your app, and someone could use it for checks on your credits. To keep that contained:</p>
    <ul>
      <li>give the app its own Smatid client, with its own token and credits, separate from your server’s;</li>
      <li>if it leaks, revoke that client and ship a new token;</li>
      <li>or use <RouterLink to="/docs/verification">verification sessions</RouterLink>, where the token stays on your server.</li>
    </ul>
  </DocNote>

  <h2>Licences</h2>
  <p>
    The chip reader uses JMRTD on Android (LGPL-3.0, used unmodified as a library) and NFCPassportReader on iOS (MIT). Text is read with Google ML Kit.
    Check the LGPL suits how you distribute your app.
  </p>
</template>

<script setup>
import CodeBlock from '../../../components/docs/CodeBlock.vue';
import DocNote from '../../../components/docs/DocNote.vue';
import {API} from '../docs.js';

const pubspec = `
dependencies:
  smatid_kyc:
    git:
      url: <the git address Smatid gives you>
      ref: main
  # or, from a folder:
  # smatid_kyc:
  #   path: ../smatid_kyc_flutter`;

const gradle = `
android {
    defaultConfig {
        minSdk = 24
    }
    packaging {
        resources {
            excludes += listOf(
                "META-INF/versions/9/OSGI-INF/MANIFEST.MF",
                "META-INF/LICENSE*", "META-INF/NOTICE*", "META-INF/DEPENDENCIES",
            )
        }
    }
}`;

const plist = `
<key>NSCameraUsageDescription</key>
<string>The camera is used to scan your ID and check you're really there.</string>

<!-- For the passport chip -->
<key>NFCReaderUsageDescription</key>
<string>NFC is used to read the chip in your passport.</string>
<key>com.apple.developer.nfc.readersession.iso7816.select-identifiers</key>
<array>
    <string>A0000002471001</string>
    <string>A0000002472001</string>
    <string>00000000000000</string>
</array>`;

const podfile = `
platform :ios, '15.5'

post_install do |installer|
  installer.pods_project.targets.each do |target|
    flutter_additional_ios_build_settings(target)
    target.build_configurations.each do |config|
      config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.5'
    end
  end
end`;

const start = `
import 'package:smatid_kyc/smatid_kyc.dart';

final kyc = SmatidKyc(apiKey: 'kyc_...', baseUrl: '${API}');`;

const passport = `
try {
  final scan = await kyc.scanPassport(context, reference: 'cust-42');
  if (scan == null) return;                       // the person closed the scanner
  if (scan.passed) {
    final doc = scan.document!;
    print('\${doc.fullName}, \${doc.documentNumber}, born \${doc.birthDate}');
  } else {
    print('Not accepted: \${scan.failureReason}');  // e.g. document_expired
  }
} on SmatidKycException catch (e) {
  // see Errors below
}`;

const chip = `
final scan = await kyc.scanPassport(context, reference: 'cust-42', readChip: true);
final chip = scan?.chip;
if (chip == null) {
  // Not read: the phone has no NFC, or the person skipped it.
} else if (chip.verified) {
  // Signed by the issuing country (chip.signerCountry), untouched, and this passport.
} else if (chip.status == 'unverified') {
  // Intact and signed, but Smatid has no certificate for that country yet.
} else {
  // chip.problems says what failed.
}`;

const idCard = `
final card = await kyc.scanIdCard(context, country: IdCardCountry.zimbabwe, reference: 'cust-42');
if (card == null) return;                          // cancelled
switch (card.status) {
  case 'passed': print(card.document!.idNumber);   // e.g. 63-1234567 D 42
  case 'review': print(card.reviewReasons);        // have a person look at the card
  default:       print(card.failureReason);        // invalid_date_of_birth
}`;

const liveness = `
final session = await kyc.checkLiveness(context, reference: 'cust-42');
if (session == null) return;                       // closed before the end
if (session.passed) { /* a live person was confirmed */ }`;

const identity = [
  {label: 'Passport', code: `
final result = await kyc.verifyIdentity(context, reference: 'cust-42');
if (result == null) return;                        // the passport scan was cancelled
if (result.verified) {
  // Chip signed by the issuing country, liveness passed, and the live face is the passport's.
} else if (result.scan.faceMatch?.status == 'review') {
  // Close call: have a person compare the pictures.
} else {
  print('Stopped at \${result.stoppedAt}');       // passport, chip, liveness or face_match
}`},
  {label: 'ID card', code: `
final result = await kyc.verifyIdentityWithIdCard(context, reference: 'cust-42');
if (result == null) return;                        // the card scan was cancelled
if (result.verified) {
  // The card read cleanly, liveness passed, and the live face is the card's.
} else {
  print('Stopped at \${result.stoppedAt}');       // id_card, liveness or face_match
}`},
];

const sessions = `
// From a typed code, or straight from the session ID in a smatid-verify:// link.
final id = await SmatidKycClient.claimVerification(baseUrl: '${API}', code: 'K7QM-4P2X');
final kyc = SmatidKyc.forVerification(verificationId: id, baseUrl: '${API}');

final task = await kyc.client.openVerification();   // who's asking, and which steps
print('\${task.clientName} asks for: \${task.steps}');

final run = await kyc.runVerification(context, task);  // runs the session's steps in order
if (run.finished) {
  final done = await kyc.client.completeVerification(skipped: run.skipped);
  // done.outcome; done.returnUrl takes the person back to the app that asked
} else {
  // Stopped part-way: the session stays open, so they can start again.
}`;

const clientMethods = [
  ['submitPassport(mrz:, jpeg:)', 'Send a photo page scan'],
  ['getPassport(scanId)', 'A passport scan'],
  ['submitChip(scanId, read)', 'Send a chip read (PassportChip.read does the NFC half)'],
  ['getChipPhoto(scanId)', 'The chip photo, as JPEG bytes'],
  ['faceMatch(scanId, livenessSessionId)', 'Passport photo against a liveness check, including one taken on the hosted page'],
  ['submitIdCard(…) / getIdCard(scanId)', 'Send or get an ID card scan'],
  ['getIdCardImage(scanId)', 'The card picture'],
  ['idCardFaceMatch(scanId, livenessSessionId)', 'Card photo against a liveness check'],
  ['createLiveness() / getLiveness(id) / getLivenessImage(id)', 'Liveness sessions'],
  ['checkDocument(pdf) / getDocumentCheck(id)', 'The document proofreader'],
  ['createVerification(type:) / getVerification(id)', 'Verification sessions (better done from your server)'],
];
</script>
