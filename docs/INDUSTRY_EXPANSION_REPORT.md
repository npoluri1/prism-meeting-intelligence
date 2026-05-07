# Industry Domain Expansion Report

_2026-05-07 — Expanded from 9 to 33 domains_

---

## Summary

The platform now supports 33 industry domains (up from 9), organized into 9 categories. All domains share the same plugin architecture via `backend/domains/registry.py`.

## Domains added (24 new)

| Slug | Name | Category | Key extraction additions |
|------|------|----------|--------------------------|
| `cybersecurity` | Cybersecurity & InfoSec | Technology & Cyber | IOCs, CVEs, incident timelines, remediation owners |
| `telecom` | Telecommunications | Technology & Cyber | Outage timelines, SLA breaches, spectrum items |
| `pharma` | Pharmaceutical & Life Sciences | Health & Life Sciences | Clinical milestones, AE reports, regulatory submissions |
| `fitness` | Fitness & Wellness | Health & Life Sciences | Member retention, class schedules, certifications |
| `insurance` | Insurance | Financial Services | Claim decisions, fraud flags, reserve adjustments |
| `accounting` | Accounting & Audit | Financial Services | Audit risks, control deficiencies, adjustments |
| `legaltech` | Legal Tech & Litigation | Professional Services | Case milestones, motion deadlines, exhibits |
| `architecture` | Architecture & Design | Professional Services | Design decisions, client approvals, change requests |
| `creative_agency` | Creative Agencies | Professional Services | Brief approvals, scope changes, deliverables |
| `sports` | Sports & Athletics | People & Talent | Player assignments, training plans, injury status |
| `customer_support` | Customer Support / Service Ops | Customer-Facing | Top issues, churn signals, SLA performance |
| `retail` | Retail & E-commerce | Customer-Facing | Sales targets, inventory, promotions, vendor SLAs |
| `hospitality` | Hospitality & Tourism | Customer-Facing | Occupancy, ADR/RevPAR, guest complaints, event bookings |
| `manufacturing` | Manufacturing & Operations | Operations & Industrial | OEE, downtime causes, safety incidents, capex |
| `construction` | Construction & Engineering | Operations & Industrial | Milestones, RFIs, change orders, safety issues |
| `logistics` | Logistics & Supply Chain | Operations & Industrial | OTIF, carrier performance, freight costs |
| `mining` | Mining & Resources | Operations & Industrial | Tonnage, grade, safety incidents, permit status |
| `agriculture` | Agriculture & Agritech | Operations & Industrial | Yield forecasts, weather impacts, input costs |
| `automotive` | Automotive | Operations & Industrial | Production volumes, recalls, supplier issues |
| `aerospace` | Aerospace & Defense | Operations & Industrial | Program milestones, ITAR flags, test results |
| `energy` | Energy & Utilities | Operations & Industrial | Outage reports, compliance items, environmental incidents |
| `media` | Media & Entertainment | Media & Public | Story assignments, deadlines, distribution decisions |
| `government` | Government & Public Sector | Media & Public | Motions, votes, public comments, budget allocations |
| `nonprofit` | Non-Profit & NGO | Media & Public | Program outcomes, donor commitments, grant deadlines |

## Compliance tag matrix

| Tag | Domains |
|-----|---------|
| `hipaa` | healthcare, pharma |
| `gxp` | pharma |
| `fda` | pharma |
| `sox` | finance, insurance, accounting |
| `pci` | finance |
| `gdpr` | legal, legaltech, hr |
| `ai_act` | hr |
| `ferpa` | education |
| `osha` | manufacturing, construction, mining, automotive |
| `itar` | aerospace |
| `export_control` | aerospace |
| `nerc` | energy |
| `epa` | energy |
| `foia` | government |

## UI changes

- **Grouped industry picker** — 9 categories, each collapsible
- **Search filter** — type to filter all 33 domains instantly
- Both modes (transcript paste + upload) use the same picker

## API endpoints

```
GET /api/domains            → flat list of all 33 domains
GET /api/domains/categories → grouped by category (for UI)
```

## Migration

No DB migration needed — domain slug is stored as a text column (`industry`) that already existed. All 33 slugs are backward-compatible with existing meetings.

## Deferred (stretch goals)

- Per-tenant custom domain cloning (workspace admin edits a template)
- Community template marketplace
- Multi-language prompt variants (EN, ES, HI, JA, DE, FR)
- Domain-specific output schemas (e.g. SOAP notes for Healthcare, CRM fields for Sales)
