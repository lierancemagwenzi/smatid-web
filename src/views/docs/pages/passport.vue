<template>
  <h1>Passports</h1>
  <p class="lead">
    Read a passport’s photo page, check its chip was signed by the issuing country, and match the passport photo to a live face.
    Three checks that build on each other: the photo page scan, the chip, and the face match.
  </p>

  <DocNote kind="tip" title="You don’t have to build the scanner">
    <p>
      The phone camera reads the passport, so these checks start in an app. The easiest way is to send the person to the
      <RouterLink to="/docs/smatid-app">Smatid Verify app</RouterLink> with a <RouterLink to="/docs/verification">verification session</RouterLink>.
      To scan in your own Flutter app, use the <RouterLink to="/docs/sdk">Smatid Flutter SDK</RouterLink>, which makes the calls below for you.
      Call them yourself only if you build your own scanner.
    </p>
  </DocNote>

  <h2>How it works</h2>
  <ol class="steps">
    <li><strong>Photo page</strong>The app reads the MRZ (the two lines of <code>&lt;&lt;&lt;</code> text at the bottom) and takes a picture. Smatid parses the MRZ again and checks every check digit and the expiry date.</li>
    <li><strong>Chip</strong>Optional. The app reads the chip over NFC, using the MRZ as its key, and sends the files exactly as read. Smatid checks they’re intact, signed by the issuing country, and from the same passport.</li>
    <li><strong>Face match</strong>Optional. After a <RouterLink to="/docs/liveness">liveness check</RouterLink> the person passed, Smatid compares the passport photo (the chip’s, when it was read) with the live face.</li>
  </ol>

  <h2 id="scan">The photo page</h2>
  <EndpointLine method="POST" path="/api/kyc/passport" auth="Bearer token" />
  <table>
    <thead><tr><th>Field</th><th>Description</th></tr></thead>
    <tbody>
      <tr><td><code>mrz</code></td><td>Required. The two MRZ lines, or all the text read off the page (a list of lines or one string). Smatid finds the two lines in it.</td></tr>
      <tr><td><code>image</code></td><td>Required. A JPEG of the photo page, base64, up to 2 MB.</td></tr>
      <tr><td><code>reference</code></td><td>Your own ID for the person, up to 255 characters.</td></tr>
      <tr><td><code>device</code></td><td>Optional details about the app (SDK version, platform, how long the scan took). The SDK fills this in.</td></tr>
    </tbody>
  </table>
  <CodeBlock :tabs="scan" />
  <CodeBlock :tabs="[{label: 'Response · 201', code: scanned}]" />

  <table>
    <thead><tr><th>Field</th><th>Description</th></tr></thead>
    <tbody>
      <tr><td><code>status</code>, <code>passed</code></td><td><code>passed</code>: the MRZ read cleanly and the passport is in date. <code>failed</code>: it was read, but see <code>failure_reason</code> (<code>document_expired</code>).</td></tr>
      <tr><td><code>document</code></td><td>What the MRZ says. Countries are ICAO codes (<code>ZWE</code>), dates <code>YYYY-MM-DD</code>.</td></tr>
      <tr><td><code>document.birth_date</code></td><td>Some passports leave out the day, the month or even the year. The date is then <code>YYYY-MM</code>, <code>YYYY</code> or <code>null</code>, with <code>birth_date_partial: true</code>. You can pass it straight to <RouterLink to="/docs/sanctions">sanctions screening</RouterLink>.</td></tr>
      <tr><td><code>document.name_truncated</code></td><td>The name filled the whole MRZ field, so it may be cut short. The chip has the full name.</td></tr>
      <tr><td><code>checks</code></td><td>Which ICAO 9303 check digits matched.</td></tr>
      <tr><td><code>chip</code>, <code>face_match</code></td><td><code>null</code> until those checks are made. See below.</td></tr>
    </tbody>
  </table>

  <DocNote kind="warn" title="Check digits catch misreads, not forgeries">
    <p>Anyone can work out an MRZ’s check digits. A <code>passed</code> photo page scan means “the passport says this”. For proof that it’s genuine, read the chip.</p>
  </DocNote>

  <h3>Getting a scan again</h3>
  <EndpointLine method="GET" path="/api/kyc/passport/:scan_id" auth="Bearer token" />
  <p>The scan as above, with its <code>chip</code> and <code>face_match</code> results so far.</p>
  <EndpointLine method="GET" path="/api/kyc/passport/:scan_id/image" auth="Bearer token" />
  <p>The picture of the photo page, as a JPEG. You can only see scans you made.</p>

  <h3>Errors</h3>
  <table>
    <thead><tr><th>Status</th><th>Error</th><th>Meaning</th></tr></thead>
    <tbody>
      <tr><td>422</td><td><code>mrz_unreadable</code></td><td>The MRZ wasn’t found, or a check digit didn’t match. <code>problems</code> says which. Scan again. Not charged.</td></tr>
      <tr><td>400</td><td><code>mrz_required</code>, <code>invalid_image</code>, <code>invalid_reference</code></td><td>Something’s missing or isn’t usable. Not charged.</td></tr>
      <tr><td>403</td><td><code>module_disabled</code></td><td>The passport check is switched off for now.</td></tr>
    </tbody>
  </table>
  <p>A scan that was read is charged, even if it <code>failed</code> because the passport has expired.</p>

  <h2 id="chip">The chip</h2>
  <p>
    Most passports issued since about 2006 have a chip (Zimbabwe’s since late 2021). It holds the MRZ details (DG1), the holder’s photo (DG2),
    and a list of their fingerprints signed by the issuing country (EF.SOD). The phone opens the chip with a key made from the MRZ and sends the files as read.
  </p>
  <EndpointLine method="POST" path="/api/kyc/passport/:scan_id/chip" auth="Bearer token" />
  <table>
    <thead><tr><th>Field</th><th>Description</th></tr></thead>
    <tbody>
      <tr><td><code>files.sod</code>, <code>files.dg1</code>, <code>files.dg2</code></td><td>Required. The chip’s files, base64, exactly as read.</td></tr>
      <tr><td><code>files.dg14</code></td><td>If the chip has it.</td></tr>
      <tr><td><code>access</code></td><td>How the chip was opened: <code>pace</code> or <code>bac</code>.</td></tr>
    </tbody>
  </table>
  <CodeBlock :tabs="chipCall" />
  <p>The reply is the scan, with <code>chip</code>:</p>
  <CodeBlock :tabs="[{label: 'chip', code: chip}]" />

  <table>
    <thead><tr><th>Check</th><th>What it means</th></tr></thead>
    <tbody>
      <tr><td><code>data_intact</code></td><td>Every file is listed in EF.SOD and matches its fingerprint.</td></tr>
      <tr><td><code>signature_valid</code></td><td>The issuing country’s Document Signer signed that list.</td></tr>
      <tr><td><code>issuer_trusted</code></td><td>The Document Signer’s certificate was issued by that country’s CSCA, which Smatid holds. <code>null</code> when Smatid has no CSCA for that country yet.</td></tr>
      <tr><td><code>matches_scan</code></td><td>The chip’s document number, birth date and expiry date are the photo page’s. Names the camera misread are listed in <code>scan_corrections</code> and don’t fail the check: use the chip’s <code>document</code>.</td></tr>
    </tbody>
  </table>

  <table>
    <thead><tr><th><code>chip.status</code></th><th>Meaning</th></tr></thead>
    <tbody>
      <tr><td><code>verified</code></td><td>All four hold. The data is what the issuing country signed, and it’s this passport.</td></tr>
      <tr><td><code>unverified</code></td><td>Intact and signed, but Smatid has no CSCA for that country yet, so who signed it isn’t known.</td></tr>
      <tr><td><code>failed</code></td><td>Something didn’t hold. <code>problems</code> says what, e.g. <code>dg1_hash_mismatch</code>, <code>signature_invalid</code>, <code>chip_differs_from_scan</code>.</td></tr>
    </tbody>
  </table>
  <ul>
    <li>A chip check that ran is charged, whatever it found. Missing or broken files are a <code>400</code> or <code>422 chip_data_invalid</code> and aren’t charged.</li>
    <li><strong>Not checked yet: copies.</strong> A cloned chip carries a valid signature too. <code>clone_check</code> stays <code>not_done</code> until chip and active authentication are added.</li>
  </ul>

  <h3>The chip’s photo</h3>
  <EndpointLine method="GET" path="/api/kyc/passport/:scan_id/chip/photo" auth="Bearer token" />
  <p>The holder’s photo from the chip, always as a JPEG. Many chips store it as JPEG 2000, which Smatid converts for you.</p>

  <h2 id="face-match">Face match</h2>
  <p>Is the person who took a liveness check the passport’s holder? Run it after the scan (ideally with the chip read) and a liveness check the person passed.</p>
  <EndpointLine method="POST" path="/api/kyc/passport/:scan_id/face-match" auth="Bearer token" />
  <CodeBlock :tabs="matchCall" />
  <p>The reply is the scan, with <code>face_match</code>:</p>
  <CodeBlock :tabs="[{label: 'face_match', code: match}]" />
  <table>
    <thead><tr><th>Field</th><th>Description</th></tr></thead>
    <tbody>
      <tr><td><code>status</code></td><td><code>match</code>, <code>review</code> (close: have a person compare the pictures) or <code>no_match</code>.</td></tr>
      <tr><td><code>similarity</code></td><td>How alike the two faces are, 0 to 1. A match is 0.4 or more, a review 0.25 or more.</td></tr>
      <tr><td><code>passport_photo</code></td><td><code>chip</code> when the chip was read (signed and clean), otherwise <code>photo_page</code>, the printed photo.</td></tr>
      <tr><td><code>identity_verified</code></td><td><strong>The one field to base a decision on.</strong> <code>true</code> when the chip is <code>verified</code>, the liveness check passed, and the faces match.</td></tr>
    </tbody>
  </table>
  <table>
    <thead><tr><th>Status</th><th>Error</th><th>Meaning</th></tr></thead>
    <tbody>
      <tr><td>400</td><td><code>liveness_session_id_required</code></td><td>Give the liveness session to compare with.</td></tr>
      <tr><td>404</td><td><code>scan_not_found</code>, <code>liveness_session_not_found</code></td><td>No such scan or session, or it isn’t yours.</td></tr>
      <tr><td>409</td><td><code>liveness_not_passed</code></td><td>The person hasn’t passed that liveness check.</td></tr>
      <tr><td>422</td><td><code>no_face_in_passport</code></td><td>No face found in the passport photo. The printed photo is small and often has glare: read the chip.</td></tr>
      <tr><td>422</td><td><code>no_passport_photo</code>, <code>no_liveness_photo</code></td><td>There’s no picture to compare on one side.</td></tr>
    </tbody>
  </table>
  <p>Errors that mean no comparison was made aren’t charged. Each new comparison replaces the last.</p>

  <DocNote kind="warn" title="This is biometric and identity data">
    <p>Store passport pictures, chip photos and results securely, only as long as you need them, and in line with your privacy obligations.</p>
  </DocNote>
</template>

<script setup>
import CodeBlock from '../../../components/docs/CodeBlock.vue';
import DocNote from '../../../components/docs/DocNote.vue';
import EndpointLine from '../../../components/docs/EndpointLine.vue';
import {API} from '../docs.js';

const scan = [
  {label: 'curl', code: `
curl -X POST ${API}/api/kyc/passport \\
  -H "Authorization: Bearer $SMATID_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "mrz": ["P<ZWEMOYO<<TARIRO<GRACE<<<<<<<<<<<<<<<<<<<<<", "FN12345672ZWE9003129F3101012<<<<<<<<<<<<<<<0"],
    "image": "<base64 JPEG of the photo page>",
    "reference": "cust-42"
  }'`},
  {label: 'Node.js', code: `
const res = await fetch('${API}/api/kyc/passport', {
  method: 'POST',
  headers: {Authorization: \`Bearer \${process.env.SMATID_TOKEN}\`, 'Content-Type': 'application/json'},
  body: JSON.stringify({mrz: mrzLines, image: jpeg.toString('base64'), reference: 'cust-42'}),
});
const scan = await res.json();
if (res.status === 422) { /* mrz_unreadable: scan again */ }`},
];

const scanned = `
{
  "scan_id": "ps_Xq3v…",
  "reference": "cust-42",
  "status": "passed",
  "passed": true,
  "failure_reason": null,
  "document": {
    "document_type": "P", "issuing_country": "ZWE",
    "surname": "MOYO", "given_names": "TARIRO GRACE", "name_truncated": false,
    "document_number": "FN1234567", "nationality": "ZWE",
    "birth_date": "1990-03-12", "birth_date_partial": false, "sex": "F",
    "expiry_date": "2031-01-01", "expired": false, "personal_number": null
  },
  "checks": {"document_number": true, "birth_date": true, "expiry_date": true, "personal_number": true, "composite": true},
  "mrz": ["P<ZWEMOYO<<TARIRO<GRACE<<<<<<<<<<<<<<<<<<<<<", "FN12345672ZWE9003129F3101012<<<<<<<<<<<<<<<0"],
  "has_image": true,
  "chip": null,
  "face_match": null,
  "created_at": "2026-11-12T09:41:07.000Z"
}`;

const chipCall = [
  {label: 'curl', code: `
curl -X POST ${API}/api/kyc/passport/ps_Xq3v…/chip \\
  -H "Authorization: Bearer $SMATID_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "files": {"sod": "<base64>", "dg1": "<base64>", "dg2": "<base64>", "dg14": "<base64>"},
    "access": "pace"
  }'`},
];

const chip = `
"chip": {
  "status": "verified",
  "verified": true,
  "checks": {"data_intact": true, "signature_valid": true, "issuer_trusted": true, "matches_scan": true, "signer_certificate_current": true},
  "problems": [],
  "differences": [],
  "scan_corrections": [],
  "document": {"surname": "MOYO", "given_names": "TARIRO GRACE", "document_number": "FN1234567", "…": "…"},
  "signer": {"country": "ZW", "subject": "…", "valid_from": "…", "valid_to": "…"},
  "csca": {"country": "ZW", "subject": "…"},
  "signature_algorithm": "ecdsa-sha256",
  "photo": {"format": "jpeg", "original_format": "jp2", "width": 480, "height": 640},
  "has_photo": true,
  "clone_check": "not_done",
  "access": "pace",
  "read_at": "2026-11-12T09:41:31.000Z"
}`;

const matchCall = [
  {label: 'curl', code: `
curl -X POST ${API}/api/kyc/passport/ps_Xq3v…/face-match \\
  -H "Authorization: Bearer $SMATID_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"liveness_session_id": "lv_W11D-72wW0BsmnXBc11uBxBMofx8uF0R"}'`},
];

const match = `
"face_match": {
  "status": "match",
  "matched": true,
  "similarity": 0.62,
  "thresholds": {"match": 0.4, "review": 0.25},
  "passport_photo": "chip",
  "chip_verified": true,
  "liveness_session_id": "lv_W11D-72wW0BsmnXBc11uBxBMofx8uF0R",
  "liveness_passed": true,
  "identity_verified": true,
  "checked_at": "2026-11-12T09:42:10.000Z"
}`;
</script>
