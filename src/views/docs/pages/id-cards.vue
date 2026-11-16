<template>
  <h1>ID cards</h1>
  <p class="lead">
    Read the front of a national ID card and check that its details hold together, then match the card’s photo to a live face.
    <strong>Zimbabwe</strong> is supported for now: the metal card and the plastic card.
  </p>

  <DocNote kind="tip" title="You don’t have to build the scanner">
    <p>
      The phone reads the card, so this check starts in an app. Send the person to the <RouterLink to="/docs/smatid-app">Smatid Verify app</RouterLink>
      with a <RouterLink to="/docs/verification">verification session</RouterLink> (<code>id_card</code> or <code>id_card_full</code>), or use
      <code>scanIdCard</code> in the <RouterLink to="/docs/sdk">Flutter SDK</RouterLink>. Call the endpoints below yourself only if you build your own scanner.
    </p>
  </DocNote>

  <h2>How it works</h2>
  <ol class="steps">
    <li><strong>The app reads the card</strong>It takes a picture of the front and reads its text on the phone, line by line, noting where each line sits on the card.</li>
    <li><strong>Smatid works out the fields</strong>From the lines and where they sit, Smatid finds the ID number, names, date of birth and the rest. It doesn’t take the phone’s word for it.</li>
    <li><strong>Smatid checks them</strong>The ID number’s format and check letter, that there’s a name and a plausible date of birth, and that the card wasn’t issued before the person was born.</li>
  </ol>

  <h2 id="scan">Scan a card</h2>
  <EndpointLine method="POST" path="/api/kyc/id-card" auth="Bearer token" />
  <table>
    <thead><tr><th>Field</th><th>Description</th></tr></thead>
    <tbody>
      <tr><td><code>country</code></td><td>Required. <code>ZW</code>.</td></tr>
      <tr><td><code>image</code></td><td>Required. A JPEG of the front of the card, base64, up to 2 MB.</td></tr>
      <tr><td><code>ocr.lines</code></td><td>Required. The text read off the card: up to 200 lines of <code v-pre>{"text", "box"}</code>. <code>box</code> is <code>[left, top, width, height]</code>, as fractions (0 to 1) of the picture.</td></tr>
      <tr><td><code>reference</code></td><td>Your own ID for the person, up to 255 characters.</td></tr>
      <tr><td><code>device</code></td><td>Optional details about the app. The SDK fills this in.</td></tr>
    </tbody>
  </table>
  <CodeBlock :tabs="scan" />
  <CodeBlock :tabs="[{label: 'Response · 201', code: scanned}]" />

  <h3>Fields</h3>
  <table>
    <thead><tr><th>Field</th><th>Description</th></tr></thead>
    <tbody>
      <tr><td><code>status</code></td><td><code>passed</code>, <code>review</code> or <code>failed</code>. See below.</td></tr>
      <tr><td><code>passed</code></td><td><code>true</code> only for <code>passed</code>.</td></tr>
      <tr><td><code>card_type</code></td><td><code>metal</code> or <code>plastic</code>, or <code>null</code> if it couldn’t tell.</td></tr>
      <tr><td><code>document</code></td><td><code>id_number</code> (e.g. <code>63-1234567 D 42</code>) and its parts, <code>surname</code>, <code>first_names</code>, <code>full_name</code>, <code>date_of_birth</code>, <code>place_of_birth</code>, <code>village_of_origin</code>, <code>sex</code>, <code>date_of_issue</code>. Dates are <code>YYYY-MM-DD</code>. Fields not found are <code>null</code>.</td></tr>
      <tr><td><code>checks</code></td><td><code>id_number_format</code>, <code>id_check_letter</code>, <code>name_found</code>, <code>date_of_birth_found</code>, <code>date_of_birth_plausible</code>, <code>issue_after_birth</code>. <code>null</code> means it couldn’t be checked.</td></tr>
      <tr><td><code>review_reasons</code></td><td>Why a scan needs a person to look at it.</td></tr>
      <tr><td><code>extracted_by</code></td><td>What read the fields: the country’s rules (<code>rules:ZW</code>) or its trained model (<code>model:ZW@3</code>).</td></tr>
      <tr><td><code>face_match</code></td><td><code>null</code> until you <a href="#face-match">match the face</a>.</td></tr>
    </tbody>
  </table>

  <h3>Statuses</h3>
  <table>
    <thead><tr><th>Status</th><th>Meaning</th></tr></thead>
    <tbody>
      <tr><td><code>passed</code></td><td>A valid ID number with the right check letter, a name and a date of birth.</td></tr>
      <tr><td><code>review</code></td><td>Read, but something needs a person to look at the card picture. See <code>review_reasons</code>.</td></tr>
      <tr><td><code>failed</code></td><td>Read, but not acceptable: <code>failure_reason</code> is <code>invalid_date_of_birth</code>.</td></tr>
    </tbody>
  </table>

  <table>
    <thead><tr><th>Review reason</th><th>What happened</th></tr></thead>
    <tbody>
      <tr v-for="r in reviewReasons" :key="r[0]"><td><code>{{ r[0] }}</code></td><td>{{ r[1] }}</td></tr>
    </tbody>
  </table>

  <DocNote kind="info" title="The Zimbabwean check letter">
    <p>
      The letter in a Zimbabwean ID number is worked out from the district and serial number. A wrong letter is a <code>review</code>, not a failure,
      because a camera misreading one letter looks just like a made-up number. A person can tell them apart by looking at the card.
    </p>
  </DocNote>

  <h3>Getting a scan again</h3>
  <EndpointLine method="GET" path="/api/kyc/id-card/:scan_id" auth="Bearer token" />
  <p>The scan as above, with its <code>face_match</code> result so far.</p>
  <EndpointLine method="GET" path="/api/kyc/id-card/:scan_id/image" auth="Bearer token" />
  <p>The picture of the card, as a JPEG. You can only see scans you made.</p>

  <h3>Errors</h3>
  <table>
    <thead><tr><th>Status</th><th>Error</th><th>Meaning</th></tr></thead>
    <tbody>
      <tr><td>422</td><td><code>id_unreadable</code></td><td>No ID number could be found. Scan again. Not charged.</td></tr>
      <tr><td>400</td><td><code>unsupported_country</code></td><td>That country isn’t supported yet. <code>supported</code> lists the ones that are.</td></tr>
      <tr><td>400</td><td><code>invalid_image</code>, <code>ocr_required</code>, <code>invalid_ocr</code>, <code>invalid_reference</code></td><td>Something’s missing or isn’t usable. Not charged.</td></tr>
      <tr><td>403</td><td><code>module_disabled</code></td><td>The ID card check is switched off for now.</td></tr>
    </tbody>
  </table>

  <h2 id="face-match">Face match</h2>
  <p>Is the person who took a <RouterLink to="/docs/liveness">liveness check</RouterLink> the card’s holder? Run it after the scan and a liveness check the person passed.</p>
  <EndpointLine method="POST" path="/api/kyc/id-card/:scan_id/face-match" auth="Bearer token" />
  <CodeBlock :tabs="matchCall" />
  <p>The reply is the scan, with <code>face_match</code>:</p>
  <CodeBlock :tabs="[{label: 'face_match', code: match}]" />
  <ul>
    <li><code>status</code> is <code>match</code>, <code>review</code> (close: have a person compare the pictures) or <code>no_match</code>.</li>
    <li><code>identity_verified</code> is <code>true</code> when the card <code>passed</code> and the faces match. An ID card has no chip to prove it’s genuine, so this is weaker than a passport with its chip verified.</li>
    <li>A card with no face on it is recorded as <code>no_face_on_card</code> and answers <code>422</code>. In a verification session, that step goes to review.</li>
    <li>The other errors are the same as for a <RouterLink to="/docs/passport#face-match">passport face match</RouterLink>. Errors that mean no comparison was made aren’t charged.</li>
  </ul>

  <DocNote kind="warn" title="This is identity data">
    <p>Store card pictures and results securely, only as long as you need them, and in line with your privacy obligations.</p>
  </DocNote>
</template>

<script setup>
import CodeBlock from '../../../components/docs/CodeBlock.vue';
import DocNote from '../../../components/docs/DocNote.vue';
import EndpointLine from '../../../components/docs/EndpointLine.vue';
import {API} from '../docs.js';

const scan = [
  {label: 'curl', code: `
curl -X POST ${API}/api/kyc/id-card \\
  -H "Authorization: Bearer $SMATID_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "country": "ZW",
    "reference": "cust-42",
    "image": "<base64 JPEG of the front of the card>",
    "ocr": {"lines": [
      {"text": "SURNAME", "box": [0.35, 0.33, 0.30, 0.04]},
      {"text": "MOYO", "box": [0.35, 0.38, 0.30, 0.04]},
      {"text": "63-1234567 D 42", "box": [0.35, 0.20, 0.40, 0.05]}
    ]}
  }'`},
];

const scanned = `
{
  "scan_id": "ic_8dK2…",
  "reference": "cust-42",
  "country": "ZW",
  "card_type": "plastic",
  "status": "passed",
  "passed": true,
  "failure_reason": null,
  "review_reasons": [],
  "document": {
    "country": "ZW",
    "card_type": "plastic",
    "id_number": "63-1234567 D 42",
    "id_number_parts": {"district": "63", "serial": "1234567", "check_letter": "D", "origin_district": "42"},
    "surname": "MOYO",
    "first_names": "TARIRO GRACE",
    "full_name": "TARIRO GRACE MOYO",
    "date_of_birth": "1990-03-12",
    "place_of_birth": "HARARE",
    "village_of_origin": "CHIKOMBA",
    "sex": "F",
    "date_of_issue": "2022-06-01"
  },
  "checks": {
    "id_number_format": true, "id_check_letter": true, "name_found": true,
    "date_of_birth_found": true, "date_of_birth_plausible": true, "issue_after_birth": true
  },
  "extracted_by": "rules:ZW",
  "has_image": true,
  "face_match": null,
  "created_at": "2026-11-12T10:02:44.000Z"
}`;

const matchCall = [
  {label: 'curl', code: `
curl -X POST ${API}/api/kyc/id-card/ic_8dK2…/face-match \\
  -H "Authorization: Bearer $SMATID_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"liveness_session_id": "lv_W11D-72wW0BsmnXBc11uBxBMofx8uF0R"}'`},
];

const match = `
"face_match": {
  "status": "match",
  "matched": true,
  "similarity": 0.58,
  "thresholds": {"match": 0.4, "review": 0.25},
  "liveness_session_id": "lv_W11D-72wW0BsmnXBc11uBxBMofx8uF0R",
  "liveness_passed": true,
  "identity_verified": true,
  "checked_at": "2026-11-12T10:03:30.000Z"
}`;

const reviewReasons = [
  ['check_letter_mismatch', 'The check letter doesn’t fit the number: a misread, or a made-up number.'],
  ['check_letter_not_read', 'The letter couldn’t be read, so it was worked out from the number and can’t vouch for it.'],
  ['name_missing', 'No name was found.'],
  ['surname_not_separated', 'A name was found but the surname couldn’t be told apart (common on the metal card, which has no labels).'],
  ['date_of_birth_missing', 'No date of birth was found.'],
  ['issued_before_birth', 'The date of issue is before the date of birth.'],
];
</script>
