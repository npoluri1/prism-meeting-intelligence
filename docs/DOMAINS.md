# Prism — Industry Domain Reference

All 33 supported industry domains with their extraction targets and compliance flags.

| # | Slug | Name | Category | Compliance Tags |
|---|------|------|----------|----------------|
| 1 | `general` | General Business | Generic | — |
| 2 | `it` | Technology / IT | Technology & Cyber | — |
| 3 | `cybersecurity` | Cybersecurity & InfoSec | Technology & Cyber | SOC 2 |
| 4 | `telecom` | Telecommunications | Technology & Cyber | — |
| 5 | `healthcare` | Healthcare / Hospital | Health & Life Sciences | HIPAA |
| 6 | `pharma` | Pharmaceutical & Life Sciences | Health & Life Sciences | HIPAA, GxP, FDA |
| 7 | `fitness` | Fitness & Wellness | Health & Life Sciences | — |
| 8 | `finance` | Finance / Banking | Financial Services | SOX, PCI |
| 9 | `insurance` | Insurance | Financial Services | SOX |
| 10 | `accounting` | Accounting & Audit | Financial Services | SOX |
| 11 | `legal` | Legal / Compliance | Professional Services | GDPR |
| 12 | `legaltech` | Legal Tech & Litigation | Professional Services | GDPR |
| 13 | `architecture` | Architecture & Design | Professional Services | — |
| 14 | `creative_agency` | Creative Agencies | Professional Services | — |
| 15 | `hr` | Human Resources | People & Talent | GDPR, EU AI Act |
| 16 | `education` | Education | People & Talent | FERPA |
| 17 | `sports` | Sports & Athletics | People & Talent | — |
| 18 | `sales` | Sales & Marketing | Customer-Facing | — |
| 19 | `customer_support` | Customer Support / Service Ops | Customer-Facing | — |
| 20 | `retail` | Retail & E-commerce | Customer-Facing | — |
| 21 | `hospitality` | Hospitality & Tourism | Customer-Facing | — |
| 22 | `realestate` | Real Estate | Customer-Facing | — |
| 23 | `manufacturing` | Manufacturing & Operations | Operations & Industrial | OSHA |
| 24 | `construction` | Construction & Engineering | Operations & Industrial | OSHA |
| 25 | `logistics` | Logistics & Supply Chain | Operations & Industrial | — |
| 26 | `mining` | Mining & Resources | Operations & Industrial | OSHA |
| 27 | `agriculture` | Agriculture & Agritech | Operations & Industrial | — |
| 28 | `automotive` | Automotive | Operations & Industrial | OSHA |
| 29 | `aerospace` | Aerospace & Defense | Operations & Industrial | ITAR, Export Control |
| 30 | `energy` | Energy & Utilities | Operations & Industrial | NERC, EPA |
| 31 | `media` | Media & Entertainment | Media & Public | — |
| 32 | `government` | Government & Public Sector | Media & Public | FOIA |
| 33 | `nonprofit` | Non-Profit & NGO | Media & Public | — |

## Compliance Tag Meanings

| Tag | What it implies |
|-----|----------------|
| `hipaa` | PHI must not be sent to non-BAA AI providers; use HIPAA-mode toggle |
| `gxp` | GMP/GCP documentation standards apply |
| `fda` | FDA regulatory submission awareness required |
| `sox` | Financial controls and audit trail required |
| `pci` | Card data must not appear in summaries |
| `gdpr` | Right to erasure applies; data residency options relevant |
| `ai_act` | EU AI Act disclosure required when used in employment decisions |
| `ferpa` | Student records protected; summaries must not include student PII |
| `osha` | Safety incidents must be flagged as high priority |
| `itar` | ITAR/export-control mentions require immediate legal review |
| `export_control` | Any mention of controlled technology needs legal review |
| `nerc` | NERC reliability standard compliance items |
| `epa` | Environmental compliance and incident reporting |
| `foia` | Content may be subject to public records requests |

## API

```
GET /api/domains            # All 33 domains flat list
GET /api/domains/categories # Grouped by category (for UI picker)
```

## Registry Location

`backend/domains/registry.py` — single source of truth for all domain definitions.
