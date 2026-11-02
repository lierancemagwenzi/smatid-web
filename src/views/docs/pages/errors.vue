<template>
  <h1>Errors</h1>
  <p class="lead">When something goes wrong, you get an HTTP status and a short code that says what.</p>

  <CodeBlock :tabs="[{label: 'Error body', code: body}]" />

  <h2>Status codes</h2>
  <table>
    <thead><tr><th>Status</th><th>Meaning</th><th>What to do</th></tr></thead>
    <tbody>
      <tr><td>200, 201</td><td>Success (201: something was created)</td><td>Read the body.</td></tr>
      <tr><td>400</td><td>The request isn’t right</td><td>Fix it, using the error code. Retrying won’t help.</td></tr>
      <tr><td>401</td><td>No token, or a wrong or revoked one</td><td>See <RouterLink to="/docs/authentication">Authentication</RouterLink>.</td></tr>
      <tr><td>402</td><td>Not enough credits for this check (<code>insufficient_credits</code>)</td><td>Top up. See <RouterLink to="/docs/credits">Credits &amp; billing</RouterLink>.</td></tr>
      <tr><td>403</td><td>That check is switched off for now (<code>module_disabled</code>)</td><td>See <RouterLink to="/docs/modules">Modules</RouterLink>.</td></tr>
      <tr><td>404</td><td>Not found: a company not on the register, or a session that isn’t yours</td><td>Check the number or ID.</td></tr>
      <tr><td>409, 410</td><td>The session isn’t in a state that allows this</td><td>Read its status.</td></tr>
      <tr><td>502</td><td>A source (the company register or the sanctions data) didn’t answer properly</td><td>Try again in a minute.</td></tr>
      <tr><td>503</td><td>Smatid is briefly unavailable</td><td>Try again shortly, waiting a little longer each time.</td></tr>
    </tbody>
  </table>

  <h2>All error codes</h2>
  <table>
    <thead><tr><th>Code</th><th>Status</th><th>Where</th><th>Meaning</th></tr></thead>
    <tbody>
      <tr v-for="e in codes" :key="e[0]"><td><code>{{ e[0] }}</code></td><td>{{ e[1] }}</td><td>{{ e[2] }}</td><td>{{ e[3] }}</td></tr>
    </tbody>
  </table>

  <DocNote kind="tip" title="Retrying">
    <p>Retry only <code>502</code>, <code>503</code> and network failures: wait about 2 seconds, then 4, then 8, and stop after a few tries. A <code>4xx</code> will fail the same way again.</p>
  </DocNote>
</template>

<script setup>
import CodeBlock from '../../../components/docs/CodeBlock.vue';

const body = `
HTTP/1.1 400 Bad Request
Content-Type: application/json

{"error": "invalid_registration_number"}`;

const codes = [
  ['missing_access_token', 401, 'All', 'No Bearer token was sent.'],
  ['invalid_access_token', 401, 'All', 'The token is wrong or revoked.'],
  ['auth_unavailable', 503, 'All', 'The token couldn’t be checked just then.'],
  ['insufficient_credits', 402, 'All checks', 'Not enough credits. The body also has "credits_needed" and "available_credits".'],
  ['billing_unavailable', 503, 'All checks', 'Credits couldn’t be checked just then. Nothing was charged.'],
  ['module_disabled', 403, 'All checks', 'This check is switched off. The body also has "module".'],
  ['module_check_unavailable', 503, 'All checks', 'Whether the check is on couldn’t be confirmed just then.'],
  ['invalid_registration_number', 400, 'Company', 'The number isn’t 3–30 letters, digits, / or -.'],
  ['registry_unavailable', 502, 'Company', 'The CIPZ register didn’t answer, or changed its page.'],
  ['registry_mismatch', 502, 'Company', 'The register answered about a different number.'],
  ['type_must_be_person_or_company', 400, 'Sanctions', '"type" must be "person" or "company".'],
  ['name_or_first_and_last_name_required', 400, 'Sanctions', 'A person needs "name", or both "first_name" and "last_name".'],
  ['name_required', 400, 'Sanctions', 'A company needs "name".'],
  ['birth_date_must_be_yyyy_mm_dd', 400, 'Sanctions', 'Use YYYY, YYYY-MM or YYYY-MM-DD.'],
  ['screening_unavailable', 502, 'Sanctions', 'The sanctions data didn’t answer.'],
  ['invalid_reference', 400, 'Liveness', '"reference" is empty or longer than 255 characters.'],
  ['invalid_redirect_url', 400, 'Liveness', 'Not an https address, a localhost address, or an app link.'],
  ['invalid_webhook_url', 400, 'Liveness, Webhooks', 'Not a valid web address.'],
  ['webhook_url_must_be_https', 400, 'Liveness, Webhooks', 'Webhook addresses must use https.'],
  ['webhook_url_not_public', 400, 'Liveness, Webhooks', 'The address is private or internal (localhost, 10.x.x.x and the like).'],
  ['webhook_url_required', 400, 'Webhooks', 'PUT /api/kyc/webhook needs "webhook_url" (null to remove).'],
  ['session_not_found', 404, 'Liveness', 'No such session, or it belongs to another account.'],
  ['image_not_available', 404, 'Liveness', 'No picture yet: the person hasn’t finished a try.'],
];
</script>
