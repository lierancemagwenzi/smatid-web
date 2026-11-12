<template>
  <h1>Document proofreader</h1>
  <p class="lead">
    Send a PDF (a bank statement, payslip, utility bill or any other document) and get back what looks wrong with it:
    signs it was edited after it was issued, fonts that don’t belong, text off its row or hidden under a box, and
    figures that don’t add up.
  </p>

  <EndpointLine method="POST" path="/api/kyc/document" auth="Bearer token" />

  <h2>Request body</h2>
  <table>
    <thead><tr><th>Field</th><th>Description</th></tr></thead>
    <tbody>
      <tr><td><code>file</code> <span class="req">required</span></td><td>The PDF, base64-encoded (a <code>data:</code> prefix is fine). Up to 15 MB and 50 pages.</td></tr>
      <tr><td><code>filename</code></td><td>Its name, shown back to you in the result and on your usage page.</td></tr>
      <tr><td><code>type</code></td><td><code>bank_statement</code>, <code>payslip</code>, <code>utility_bill</code> or <code>other</code>. Leave it out and the type is worked out from the document. It decides which sums are checked.</td></tr>
      <tr><td><code>reference</code></td><td>Your own ID for the document or applicant.</td></tr>
    </tbody>
  </table>
  <CodeBlock :tabs="request" />

  <DocNote kind="tip" title="The file isn’t kept">
    <p>The PDF is read in memory and thrown away. Only the report and the file’s SHA-256 are stored, so <code>checked_before</code> can tell you when the same file was sent before.</p>
  </DocNote>

  <h2>Response · 201</h2>
  <CodeBlock :tabs="[{label: 'Response · 201', code: response}]" />
  <table>
    <thead><tr><th>Field</th><th>Description</th></tr></thead>
    <tbody>
      <tr><td><code>verdict</code></td><td><code>clean</code> (nothing of note), <code>review</code> (a person should look) or <code>suspicious</code> (signs of tampering: any serious finding, or a high score).</td></tr>
      <tr><td><code>score</code></td><td>0–100. The findings’ weight added up, capped per category.</td></tr>
      <tr><td><code>document</code></td><td>The <code>type</code> it was checked as, the <code>type_detected</code>, the number of <code>pages</code>, and whether it’s a <code>scanned</code> picture with no text.</td></tr>
      <tr><td><code>findings</code></td><td>What was found, most serious first (below).</td></tr>
      <tr><td><code>metadata</code></td><td>The software that made it (<code>creator</code>) and last saved it (<code>producer</code>), when it was <code>created</code> and <code>modified</code>, and the software of every save (<code>producers_over_time</code>).</td></tr>
      <tr><td><code>structure</code></td><td>How many times it was saved on top of the original (<code>incremental_updates</code>), whether it’s <code>signed</code>, and whether it has scripts, attachments or form fields.</td></tr>
      <tr><td><code>fonts</code></td><td>Every font, whether it’s embedded, and how much text uses it.</td></tr>
      <tr><td><code>figures</code></td><td>The totals read for its type: for a statement the transactions, debits, credits and closing balance; for a payslip gross, deductions and net; for a bill the previous balance, charges and amount due.</td></tr>
      <tr><td><code>model</code></td><td>The trained tamper classifier’s view: <code>tampered_probability</code> (0–1), its <code>version</code>, and whether it’s <code>active</code> (weighs in on the verdict). <code>null</code> if there’s no model.</td></tr>
      <tr><td><code>image</code></td><td>For scanned documents: how many pages were examined, the forgery model’s version (or <code>null</code> if it isn’t installed) and its highest score.</td></tr>
      <tr><td><code>check_id</code>, <code>sha256</code>, <code>checked_before</code></td><td>The check’s ID (look it up again with <code>GET /api/kyc/document/&lt;check_id&gt;</code>), the file’s fingerprint, and how many times you checked the same file before.</td></tr>
    </tbody>
  </table>

  <h3>Each finding</h3>
  <table>
    <thead><tr><th>Field</th><th>Description</th></tr></thead>
    <tbody>
      <tr><td><code>category</code></td><td><code>content</code>, <code>layout</code>, <code>fonts</code>, <code>structure</code>, <code>metadata</code>, <code>image</code> (scanned pages) or <code>model</code>.</td></tr>
      <tr><td><code>severity</code></td><td><code>high</code>, <code>warning</code> or <code>info</code>.</td></tr>
      <tr><td><code>code</code>, <code>title</code>, <code>detail</code></td><td>What it is, for code and for people.</td></tr>
      <tr><td><code>page</code>, <code>box</code></td><td>Where it is: the page (from 1), and <code>[left, top, width, height]</code> as fractions of the page. <code>null</code> for findings about the whole file.</td></tr>
      <tr><td><code>evidence</code></td><td>The values behind it, e.g. the expected and found balance.</td></tr>
    </tbody>
  </table>

  <h3>Codes</h3>
  <table>
    <thead><tr><th>Code</th><th>What it means</th></tr></thead>
    <tbody>
      <tr v-for="c in CODES" :key="c[0]"><td><code>{{ c[0] }}</code></td><td>{{ c[1] }}</td></tr>
    </tbody>
  </table>

  <h2>Errors</h2>
  <p>None of these are charged.</p>
  <table>
    <thead><tr><th>Status</th><th>Code</th><th>Meaning</th></tr></thead>
    <tbody>
      <tr><td>400</td><td><code>file_required</code>, <code>invalid_file</code>, <code>not_a_pdf</code>, <code>invalid_type</code></td><td>No file, not base64, not a PDF, or an unknown <code>type</code>.</td></tr>
      <tr><td>413</td><td><code>file_too_large</code></td><td>Over 15 MB.</td></tr>
      <tr><td>422</td><td><code>pdf_encrypted</code>, <code>pdf_unreadable</code>, <code>too_many_pages</code>, <code>pdf_timeout</code></td><td>Password-protected, damaged, over 50 pages, or too slow to read.</td></tr>
    </tbody>
  </table>

  <DocNote kind="note" title="What a clean result means">
    <p>A clean result means none of these signs were found, not that the document is certainly genuine. A forgery made from scratch with the issuer’s own tools can pass. For high-value decisions, confirm with the issuer.</p>
  </DocNote>
</template>

<script setup>
import CodeBlock from '../../../components/docs/CodeBlock.vue';
import DocNote from '../../../components/docs/DocNote.vue';
import EndpointLine from '../../../components/docs/EndpointLine.vue';
import {API} from '../docs.js';

const CODES = [
  ['incremental_updates', 'The file was saved again on top of the original (an editor’s save).'],
  ['producer_changed', 'Different software wrote different versions of the file.'],
  ['changed_after_signing', 'Content was added after the digital signature.'],
  ['pdf_editor', 'A PDF editor (iLovePDF, Smallpdf, Sejda, Foxit, Canva, …) is named in the metadata.'],
  ['image_editor', 'An image editor (Photoshop, GIMP, …) is named in the metadata.'],
  ['office_software', 'Made in a word processor: odd for a statement, payslip or bill.'],
  ['modified_after_creation', 'Modified some time after it was created.'],
  ['date_in_future', 'A creation or modification date in the future.'],
  ['metadata_disagrees', 'The Info dictionary and the XMP metadata name different software.'],
  ['metadata_missing', 'No creator, producer or dates at all.'],
  ['font_out_of_place', 'A figure, date or name in a font used nowhere else in the document.'],
  ['font_embedded_twice', 'The same font embedded twice: text added later brought its own copy.'],
  ['font_size_out_of_line', 'A figure in a different size from the rest of its row.'],
  ['off_baseline', 'Text a little above or below the rest of its row.'],
  ['column_misaligned', 'A figure that doesn’t line up with the rest of its column.'],
  ['text_over_text', 'Two different pieces of text in the same place.'],
  ['text_covered', 'A white box drawn over text that was already there.'],
  ['annotation_covers_text', 'An annotation (white box, stamp, typed text) laid over the page.'],
  ['field_mismatch', 'The same field (name, account number, address, …) given differently in two places.'],
  ['impossible_date', 'A date that doesn’t exist, such as 31/02.'],
  ['id_number_check_letter', 'A Zimbabwean ID number with the wrong check letter.'],
  ['balance_mismatch', 'A statement’s running balance doesn’t follow from the transaction.'],
  ['closing_balance_mismatch', 'The closing balance doesn’t follow from the last transaction.'],
  ['total_mismatch', 'A total doesn’t match the figures it adds up.'],
  ['dates_out_of_order', 'A transaction out of date order.'],
  ['date_outside_period', 'A transaction outside the statement period.'],
  ['gross_mismatch', 'A payslip’s earnings don’t add up to gross pay.'],
  ['deductions_mismatch', 'A payslip’s deductions don’t add up to their total.'],
  ['net_pay_mismatch', 'Net pay isn’t gross pay less deductions.'],
  ['ytd_below_period', 'Year-to-date gross below this period’s.'],
  ['charges_mismatch', 'A bill’s charges don’t add up to their total.'],
  ['amount_due_mismatch', 'A bill’s amount due doesn’t follow from the balance, payments and charges.'],
  ['period_backwards', 'A billing period that ends before it starts.'],
  ['scanned_image_only', 'The pages are pictures with no text, so the text checks couldn’t run; the picture is examined instead.'],
  ['image_edited_region', 'The image forgery model marks part of a scanned page as changed (retyped, pasted, smudged or moved). Boxed on the page.'],
  ['image_model_unavailable', 'A scanned page couldn’t be examined because the forgery model isn’t installed.'],
  ['model_suspects_tampering', 'The trained tamper classifier, weighing every sign together, rates the document likely changed. Only once it’s in use.'],
];

const request = [
  {label: 'curl', code: `
curl -X POST ${API}/api/kyc/document \\
  -H "Authorization: Bearer $SMATID_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d "{\\"file\\": \\"$(base64 < statement.pdf | tr -d '\\n')\\", \\"filename\\": \\"statement.pdf\\", \\"reference\\": \\"loan-77\\"}"`},
  {label: 'Node.js', code: `
const file = (await fs.promises.readFile('statement.pdf')).toString('base64');
const res = await fetch('${API}/api/kyc/document', {
  method: 'POST',
  headers: {Authorization: \`Bearer \${process.env.SMATID_TOKEN}\`, 'Content-Type': 'application/json'},
  body: JSON.stringify({file, filename: 'statement.pdf', reference: 'loan-77'}),
});
const report = await res.json();`},
  {label: 'Python', code: `
with open("statement.pdf", "rb") as f:
    file = base64.b64encode(f.read()).decode()
res = requests.post(
    "${API}/api/kyc/document",
    headers={"Authorization": f"Bearer {os.environ['SMATID_TOKEN']}"},
    json={"file": file, "filename": "statement.pdf", "reference": "loan-77"},
    timeout=60,
)
report = res.json()`},
];

const response = `
{
  "check_id": "dc_h-UmukOZor7d5tahsBn2arse-BI7qbf_",
  "reference": "loan-77",
  "filename": "statement.pdf",
  "verdict": "suspicious",
  "score": 70,
  "document": {"type": "bank_statement", "type_detected": "bank_statement", "pages": 1, "scanned": false},
  "findings": [
    {
      "category": "content",
      "code": "balance_mismatch",
      "severity": "high",
      "title": "A running balance doesn't add up",
      "detail": "1,197.18 + 363.49 is 1,560.67, but the balance on this row is 1,460.67. Either the transaction amount or the balance was changed.",
      "page": 1,
      "box": [0.7319, 0.3519, 0.1924, 0.0128],
      "evidence": {"expected": 1560.67, "found": 1460.67, "difference": -100}
    }
  ],
  "counts": {"high": 1, "warning": 0, "info": 0},
  "metadata": {"creator": "HB Core Banking", "producer": "Harbour Bank Statements 5.2", "created": "2026-10-01T08:30:00.000Z", "modified": "2026-10-01T08:30:00.000Z"},
  "structure": {"revisions": 1, "incremental_updates": 0, "signed": false, "javascript": false, "embedded_files": false, "forms": false},
  "fonts": [{"name": "Helvetica", "base": "Helvetica", "subset": null, "embedded": false, "items": 74, "pages": [1]}],
  "figures": {"transactions": 14, "total_debits": 1111.12, "total_credits": 1632.35, "closing_balance": 1771.63},
  "sha256": "9f2c…",
  "checked_before": 0,
  "created_at": "2026-11-12T11:49:02.000Z"
}`;
</script>
