// The documentation's sections, in reading order. Each has its own page under /docs/<slug>.
export const SECTIONS = [
  {group: 'Getting started', slug: 'introduction', title: 'Introduction'},
  {group: 'Getting started', slug: 'quickstart', title: 'Quick start'},
  {group: 'Getting started', slug: 'authentication', title: 'Authentication'},
  {group: 'Getting started', slug: 'credits', title: 'Credits & billing'},
  {group: 'Getting started', slug: 'errors', title: 'Errors'},
  {group: 'Getting started', slug: 'modules', title: 'Modules'},
  {group: 'Checks', slug: 'company', title: 'Company registration'},
  {group: 'Checks', slug: 'sanctions', title: 'Sanctions & PEP'},
  {group: 'Checks', slug: 'liveness', title: 'Liveness'},
  {group: 'Getting results', slug: 'results', title: 'Overview'},
  {group: 'Getting results', slug: 'webhooks', title: 'Webhooks'},
  {group: 'Getting results', slug: 'redirects', title: 'Redirects & popups'},
  {group: 'Reference', slug: 'endpoints', title: 'All endpoints'},
];

/** The API's address in examples: the configured one, or the live one. */
export const API = (import.meta.env.VITE_API_URL || 'https://dev-api.smatid.com').replace(/\/$/, '');
