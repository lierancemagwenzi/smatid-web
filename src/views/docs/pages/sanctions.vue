<template>
  <h1>Sanctions &amp; PEP screening</h1>
  <p class="lead">
    Screen a person or a company against global sanctions lists and politically exposed persons (PEPs),
    using OpenSanctions data.
  </p>

  <EndpointLine method="POST" path="/api/kyc/sanctions" auth="Bearer token" />

  <h2>Request body</h2>
  <h3>A person</h3>
  <table>
    <thead><tr><th>Field</th><th>Description</th></tr></thead>
    <tbody>
      <tr><td><code>type</code> <span class="req">required</span></td><td><code>"person"</code></td></tr>
      <tr><td><code>name</code></td><td>Full name. Give this, <em>or</em> both <code>first_name</code> and <code>last_name</code>.</td></tr>
      <tr><td><code>first_name</code>, <code>middle_name</code>, <code>last_name</code></td><td>Name parts.</td></tr>
      <tr><td><code>birth_date</code> <span class="opt">recommended</span></td><td><code>YYYY-MM-DD</code>, <code>YYYY-MM</code> or <code>YYYY</code>.</td></tr>
      <tr><td><code>nationality</code> <span class="opt">recommended</span></td><td>Country code, e.g. <code>zw</code>.</td></tr>
      <tr><td><code>id_number</code>, <code>passport_number</code></td><td>Identity document numbers.</td></tr>
      <tr><td><code>aliases</code></td><td>Other names: a string or a list of strings.</td></tr>
      <tr><td><code>country</code></td><td>Country of residence, e.g. <code>zw</code>.</td></tr>
    </tbody>
  </table>
  <CodeBlock :tabs="personRequest" />

  <h3>A company</h3>
  <table>
    <thead><tr><th>Field</th><th>Description</th></tr></thead>
    <tbody>
      <tr><td><code>type</code> <span class="req">required</span></td><td><code>"company"</code></td></tr>
      <tr><td><code>name</code> <span class="req">required</span></td><td>The company’s name.</td></tr>
      <tr><td><code>registration_number</code> <span class="opt">recommended</span></td><td>Its registration number.</td></tr>
      <tr><td><code>jurisdiction</code>, <code>country</code></td><td>Where it’s registered or operates, e.g. <code>zw</code>.</td></tr>
      <tr><td><code>aliases</code></td><td>Other names it trades under.</td></tr>
    </tbody>
  </table>
  <CodeBlock :tabs="companyRequest" />

  <DocNote kind="tip" title="Fewer false matches">
    <p>A birth date and nationality for people, or a registration number for companies, make a big difference. Send them whenever you have them.</p>
  </DocNote>

  <h2>Response · 200</h2>
  <CodeBlock :tabs="[{label: 'Response · 200', code: response}]" />
  <table>
    <thead><tr><th>Field</th><th>Description</th></tr></thead>
    <tbody>
      <tr><td><code>hit</code></td><td><code>true</code> if at least one record matched closely enough (scored at or above <code>threshold</code>).</td></tr>
      <tr><td><code>sanctioned</code></td><td><code>true</code> if a match is on a sanctions list.</td></tr>
      <tr><td><code>pep</code></td><td><code>true</code> if a match is a politically exposed person.</td></tr>
      <tr><td><code>matches</code></td><td>The records that matched, best first.</td></tr>
      <tr><td><code>near_matches</code></td><td>Records that scored below the threshold. Not hits, but a person may want to look.</td></tr>
      <tr><td><code>threshold</code></td><td>The score a record needs to count as a match.</td></tr>
      <tr><td><code>dataset</code></td><td>Which lists were searched (<code>default</code>: sanctions, PEPs and other risk lists).</td></tr>
      <tr><td><code>source</code>, <code>checked_at</code></td><td><code>OpenSanctions</code>, and when the check ran.</td></tr>
    </tbody>
  </table>

  <h3>Each match</h3>
  <table>
    <thead><tr><th>Field</th><th>Description</th></tr></thead>
    <tbody>
      <tr><td><code>name</code>, <code>schema</code></td><td>The record’s name, and <code>Person</code> or <code>Company</code>.</td></tr>
      <tr><td><code>score</code></td><td>0 to 1: how sure the match is that this is the same person or company. Not a risk score.</td></tr>
      <tr><td><code>sanctioned</code>, <code>pep</code></td><td>Whether this record is sanctioned or a PEP.</td></tr>
      <tr><td><code>topics</code></td><td>Its tags, e.g. <code>sanction</code>, <code>role.pep</code>, <code>sanction.linked</code> (a relative or associate of a sanctioned party).</td></tr>
      <tr><td><code>datasets</code></td><td>The lists it’s on, e.g. <code>us_ofac_sdn</code>.</td></tr>
      <tr><td><code>url</code></td><td>The record’s page on OpenSanctions, for your team to review.</td></tr>
    </tbody>
  </table>

  <h2>Reading the result</h2>
  <ol class="steps">
    <li><strong><code>hit: false</code></strong>Nothing matched. Carry on.</li>
    <li><strong><code>sanctioned: true</code></strong>Stop and escalate to compliance. Open the match’s <code>url</code> and compare the details you hold.</li>
    <li><strong><code>pep: true</code></strong>Not a reason to refuse by itself, but usually means enhanced due diligence.</li>
    <li><strong>A hit that isn’t either</strong>A match on another risk list. Review it.</li>
  </ol>

  <h2>Errors</h2>
  <table>
    <thead><tr><th>Status</th><th>Error</th><th>Meaning</th></tr></thead>
    <tbody>
      <tr><td>400</td><td><code>type_must_be_person_or_company</code></td><td><code>type</code> is missing or not <code>person</code> or <code>company</code>.</td></tr>
      <tr><td>400</td><td><code>name_or_first_and_last_name_required</code></td><td>A person needs <code>name</code>, or both <code>first_name</code> and <code>last_name</code>.</td></tr>
      <tr><td>400</td><td><code>name_required</code></td><td>A company needs <code>name</code>.</td></tr>
      <tr><td>400</td><td><code>birth_date_must_be_yyyy_mm_dd</code></td><td>Use <code>YYYY-MM-DD</code>, <code>YYYY-MM</code> or <code>YYYY</code>.</td></tr>
      <tr><td>502</td><td><code>screening_unavailable</code></td><td>The sanctions data didn’t answer. Try again shortly.</td></tr>
    </tbody>
  </table>
</template>

<script setup>
import CodeBlock from '../../../components/docs/CodeBlock.vue';
import DocNote from '../../../components/docs/DocNote.vue';
import EndpointLine from '../../../components/docs/EndpointLine.vue';
import {API} from '../docs.js';

const personBody = `{
  "type": "person",
  "first_name": "Jane",
  "last_name": "Moyo",
  "birth_date": "1984-06-02",
  "nationality": "zw",
  "id_number": "63-123456X42"
}`;

const personRequest = [
  {label: 'curl', code: `
curl -X POST ${API}/api/kyc/sanctions \\
  -H "Authorization: Bearer $SMATID_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '${personBody}'`},
  {label: 'Node.js', code: `
const res = await fetch('${API}/api/kyc/sanctions', {
  method: 'POST',
  headers: {
    Authorization: \`Bearer \${process.env.SMATID_TOKEN}\`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(${personBody.replace(/\n/g, '\n  ')}),
});
const screening = await res.json();`},
  {label: 'PHP', code: `
$ch = curl_init('${API}/api/kyc/sanctions');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . getenv('SMATID_TOKEN'), 'Content-Type: application/json'],
    CURLOPT_POSTFIELDS => json_encode([
        'type' => 'person', 'first_name' => 'Jane', 'last_name' => 'Moyo',
        'birth_date' => '1984-06-02', 'nationality' => 'zw',
    ]),
]);
$screening = json_decode(curl_exec($ch), true);`},
  {label: 'Python', code: `
res = requests.post(
    "${API}/api/kyc/sanctions",
    headers={"Authorization": f"Bearer {os.environ['SMATID_TOKEN']}"},
    json={"type": "person", "first_name": "Jane", "last_name": "Moyo",
          "birth_date": "1984-06-02", "nationality": "zw"},
    timeout=30,
)
screening = res.json()`},
];

const companyRequest = [
  {label: 'curl', code: `
curl -X POST ${API}/api/kyc/sanctions \\
  -H "Authorization: Bearer $SMATID_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"type": "company", "name": "EXPRESS SMATPAY (PRIVATE) LIMITED",
       "registration_number": "38043A0242025", "country": "zw"}'`},
];

const response = `
{
  "hit": true,
  "sanctioned": true,
  "pep": true,
  "matches": [
    {
      "id": "Q7747",
      "name": "Vladimir Putin",
      "schema": "Person",
      "score": 1,
      "match": true,
      "topics": ["role.pep", "sanction"],
      "sanctioned": true,
      "pep": true,
      "datasets": ["us_ofac_sdn", "eu_fsf", "gb_hmt_sanctions"],
      "url": "https://www.opensanctions.org/entities/Q7747/"
    }
  ],
  "near_matches": [],
  "dataset": "default",
  "threshold": 0.7,
  "source": "OpenSanctions",
  "checked_at": "2026-11-02T10:12:41.506Z"
}`;
</script>
