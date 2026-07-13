# V Welfare SEO Audit

**SEO score:** **76/100**  
**Scope:** public production responses plus source metadata, sitemap, robots, structured data, and bilingual handling

## Live verified strengths

- `/`, `/login`, `/register`, `/clinicians`, `/contact`, `/privacy`, `/terms`, and `/sample-result` returned HTTP 200.
- `robots.txt` allows public pages and blocks patient, clinician, admin, auth-recovery, and API paths.
- `sitemap.xml` uses `https://app.vwelfare.com`.
- Sitemap includes English/Arabic alternates.
- Production `/logo.png` and `/og-image.png` returned image/png HTTP 200.
- Root metadata includes Open Graph fields.
- Landing page includes JSON-LD.
- Authenticated layout is marked noindex.

## Findings

| ID | Severity | Location | Finding | Recommendation | Effort |
|---|---|---|---|---|---:|
| SEO-01 | Medium | `app/sitemap.ts` / live sitemap | `/clinicians` and `/contact` omitted | include all indexable public pages | 1–2h |
| SEO-02 | Medium | locale strategy | alternates use `?lang=ar` while language is cookie-driven; query URL may not reliably render/index Arabic | implement stable locale URLs or server-honor locale query with self-canonicals | 6–12h |
| SEO-03 | Medium | source defaults | layout and sitemap historically used different fallback origins; env example omits site URL | require one canonical origin in config | 1–2h |
| SEO-04 | Medium | contact/clinician pages in checkout | no page-specific metadata export | localized titles/descriptions/OG metadata | 2–4h |
| SEO-05 | Low | privacy/terms | titles are English-only despite bilingual content | localized metadata via locale-aware generation | 2–4h |
| SEO-06 | Low | JSON-LD | organization/medical context should be reviewed for claim accuracy | validate schema and avoid unsupported healthcare claims | 2–4h |
| SEO-07 | Low | public performance | landing TTFB sample was 2.66s and response 144KB | investigate middleware/session and bundle/content size | covered in performance |

## International SEO

The HTML `lang`/`dir` implementation is strong. The indexable URL strategy is not. Cookie-selected language and `?lang=ar` alternates can produce:

- the same response language at both alternate URLs;
- unstable canonical/hreflang relationships;
- crawlers that do not retain the language cookie;
- duplicate content.

Preferred approach: stable `/en/...` and `/ar/...` routes, or a rigorously tested query-locale implementation where the server response, canonical, `lang`, and alternate links all match the requested URL without relying on prior cookies.

## Content and healthcare trust

Public pages should clearly disclose:

- not an emergency service;
- not a diagnosis;
- clinician verification meaning and limits;
- AI involvement;
- data processor/subprocessor information;
- country/jurisdiction scope;
- contact/legal entity details.

Structured data must not imply clinical accreditation or service capability that has not been independently verified.

## Technical checklist

| Control | Result |
|---|---|
| HTTPS/canonical host | Pass live |
| robots exclusions for PHI | Pass |
| sitemap | Partial |
| hreflang | Partial—URL behavior needs validation |
| OG image | Pass live |
| Twitter cards | Present in root metadata; validate rendering |
| JSON-LD | Present; claim review needed |
| per-page metadata | Partial |
| broken public routes sampled | None |
| Core Web Vitals | Not certified |

## SEO release conditions

SEO is not itself a launch blocker, but public marketing must not launch ahead of privacy/security readiness. Fix sitemap coverage, canonical configuration, and locale URL behavior before broad indexing.

