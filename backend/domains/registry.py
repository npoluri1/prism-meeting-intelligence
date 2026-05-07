from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class Domain:
    slug: str
    name: str
    category: str
    industry_context: str
    prompt_hint: str
    compliance_tags: list[str] = field(default_factory=list)


# ── Domain definitions ────────────────────────────────────────────────────────

DOMAINS: list[Domain] = [
    # ── Generic ──────────────────────────────────────────────────────────────
    Domain(
        slug="general",
        name="General Business",
        category="generic",
        industry_context="business organization. Recognize standard corporate vocabulary.",
        prompt_hint="",
        compliance_tags=[],
    ),
    # ── Technology & Cyber ────────────────────────────────────────────────────
    Domain(
        slug="it",
        name="Technology / IT",
        category="technology_cyber",
        industry_context="technology company. Recognize terms like: sprint, OKR, API, CI/CD, roadmap, tech debt, ADR, P0/P1 incidents, SLA, velocity, story points.",
        prompt_hint="Highlight technical decisions, architectural choices, and incident follow-ups.",
        compliance_tags=[],
    ),
    Domain(
        slug="cybersecurity",
        name="Cybersecurity & InfoSec",
        category="technology_cyber",
        industry_context="cybersecurity or information security team. Recognize terms like: CVE, IOC, TTPs, SOC, SIEM, EDR, zero-day, threat actor, incident response, penetration test, vulnerability.",
        prompt_hint="Flag every security incident, IOC, and remediation owner. Note any compliance gaps (SOC 2, NIST, ISO 27001). Mark unresolved threats as high-priority action items.",
        compliance_tags=["soc2"],
    ),
    Domain(
        slug="telecom",
        name="Telecommunications",
        category="technology_cyber",
        industry_context="telecommunications company. Recognize terms like: ARPU, churn, spectrum, SLA, NOC, outage, RAN, MVNO, fiber rollout, regulatory filing.",
        prompt_hint="Capture SLA breaches, outage timelines, and capex decisions. Note spectrum/regulatory mentions.",
        compliance_tags=[],
    ),
    # ── Health & Life Sciences ────────────────────────────────────────────────
    Domain(
        slug="healthcare",
        name="Healthcare / Hospital",
        category="health_life_sciences",
        industry_context="healthcare organization. Recognize terms like: patient outcomes, treatment protocols, clinical pathways, compliance (HIPAA), care coordination, rounds, referrals, EHR.",
        prompt_hint="Flag patient safety concerns as high-priority. Note any regulatory or HIPAA compliance items. Do not include identifiable patient information in the summary.",
        compliance_tags=["hipaa"],
    ),
    Domain(
        slug="pharma",
        name="Pharmaceutical & Life Sciences",
        category="health_life_sciences",
        industry_context="pharmaceutical or life sciences company. Recognize terms like: IND, NDA, clinical trial, Phase I/II/III, IRB, AE, SAE, GCP, GMP, regulatory submission, CRO, biomarker.",
        prompt_hint="Capture regulatory milestones, adverse event reports, and IP discussions. Flag GxP compliance items. Note study endpoints and key dates.",
        compliance_tags=["hipaa", "gxp", "fda"],
    ),
    Domain(
        slug="fitness",
        name="Fitness & Wellness",
        category="health_life_sciences",
        industry_context="fitness or wellness business. Recognize terms like: member retention, class schedule, personal training, equipment maintenance, certification, NPS, studio ops.",
        prompt_hint="Capture member retention action items, scheduling changes, and certification renewals.",
        compliance_tags=[],
    ),
    # ── Financial Services ────────────────────────────────────────────────────
    Domain(
        slug="finance",
        name="Finance / Banking",
        category="financial_services",
        industry_context="financial services firm. Recognize terms like: AUM, fiduciary duty, regulatory compliance, risk-adjusted returns, EBITDA, audit findings, board resolutions, forecast.",
        prompt_hint="Flag regulatory compliance items and any audit findings. Capture budget approvals and financial commitments.",
        compliance_tags=["sox", "pci"],
    ),
    Domain(
        slug="insurance",
        name="Insurance",
        category="financial_services",
        industry_context="insurance company. Recognize terms like: claim, underwriting, actuarial, reserve, reinsurance, loss ratio, premium, policy endorsement, fraud flag, adjuster.",
        prompt_hint="Capture claim decisions, underwriting rule changes, and reserve adjustments. Flag any fraud indicators. Note regulatory or compliance items.",
        compliance_tags=["sox"],
    ),
    Domain(
        slug="accounting",
        name="Accounting & Audit",
        category="financial_services",
        industry_context="accounting or audit firm. Recognize terms like: materiality, control deficiency, management letter, working paper, substantive test, journal entry, going concern, representation letter.",
        prompt_hint="Extract audit risks, control deficiencies, proposed adjustments, and management responses. Capture engagement deadlines.",
        compliance_tags=["sox"],
    ),
    # ── Professional Services ─────────────────────────────────────────────────
    Domain(
        slug="legal",
        name="Legal / Compliance",
        category="professional_services",
        industry_context="legal or compliance organization. Recognize terms like: regulatory requirements, legal risk, counsel advice, contract terms, jurisdiction, indemnification, remediation.",
        prompt_hint="Flag legal risks and compliance gaps as high-priority. Capture all deadlines and commitments. Note any privileged communications.",
        compliance_tags=["gdpr"],
    ),
    Domain(
        slug="legaltech",
        name="Legal Tech & Litigation",
        category="professional_services",
        industry_context="litigation or legal technology team. Recognize terms like: discovery, deposition, exhibit, motion, brief, case strategy, witness, settlement, pleadings.",
        prompt_hint="Capture case milestones, motion deadlines, and witness commitments. Mark all exhibits referenced. Note any privilege or confidentiality concerns.",
        compliance_tags=["gdpr"],
    ),
    Domain(
        slug="architecture",
        name="Architecture & Design",
        category="professional_services",
        industry_context="architecture or design firm. Recognize terms like: schematic design, design development, construction documents, RFI, ASI, change order, owner approval, charrette.",
        prompt_hint="Capture design decisions, client approvals, and change requests. Note deliverable dates and any scope changes.",
        compliance_tags=[],
    ),
    Domain(
        slug="creative_agency",
        name="Creative Agencies",
        category="professional_services",
        industry_context="creative or marketing agency. Recognize terms like: brief, creative review, copy, campaign, deliverable, client feedback, scope, billable hours, retainer, pitch.",
        prompt_hint="Capture brief approvals, client feedback, scope changes, and deliverable dates. Flag billable-hours implications.",
        compliance_tags=[],
    ),
    # ── People & Talent ───────────────────────────────────────────────────────
    Domain(
        slug="hr",
        name="Human Resources",
        category="people_talent",
        industry_context="human resources department. Recognize terms like: performance metrics, headcount, attrition, DEI, talent pipeline, compensation bands, HRBP.",
        prompt_hint="Capture personnel decisions carefully. Flag any equity, compliance, or legal-risk items. Note compensation and headcount commitments.",
        compliance_tags=["gdpr", "ai_act"],
    ),
    Domain(
        slug="education",
        name="Education",
        category="people_talent",
        industry_context="educational institution. Recognize terms like: curriculum, learning outcomes, accreditation, faculty, enrollment, student performance, pedagogical approach.",
        prompt_hint="Capture curriculum decisions, accreditation action items, and faculty commitments. Note student outcome metrics.",
        compliance_tags=["ferpa"],
    ),
    Domain(
        slug="sports",
        name="Sports & Athletics",
        category="people_talent",
        industry_context="sports or athletics organization. Recognize terms like: training plan, player evaluation, scouting report, injury status, game prep, lineup, performance metrics, contract.",
        prompt_hint="Capture player assignments, training plan changes, injury updates, and scouting decisions.",
        compliance_tags=[],
    ),
    # ── Customer-Facing ───────────────────────────────────────────────────────
    Domain(
        slug="sales",
        name="Sales & Marketing",
        category="customer_facing",
        industry_context="sales and marketing organization. Recognize terms like: pipeline, MQL, SQL, ARR, churn, NPS, conversion rate, CAC, LTV, account health.",
        prompt_hint="Capture deal commitments, pipeline updates, and follow-up dates. Note any objections raised and responses given. Flag churn risks.",
        compliance_tags=[],
    ),
    Domain(
        slug="customer_support",
        name="Customer Support / Service Ops",
        category="customer_facing",
        industry_context="customer support or service operations team. Recognize terms like: CSAT, NPS, ticket volume, escalation, SLA, resolution time, churn signal, tooling, QBR.",
        prompt_hint="Capture top customer issues, SLA performance, and tooling gaps. Flag churn signals as high priority. Note training or process improvement needs.",
        compliance_tags=[],
    ),
    Domain(
        slug="retail",
        name="Retail & E-commerce",
        category="customer_facing",
        industry_context="retail or e-commerce company. Recognize terms like: sell-through, inventory, GMV, AOV, promotions, vendor terms, shrink, planogram, peak season, SKU.",
        prompt_hint="Capture sales targets, inventory issues, promotions decisions, and vendor SLAs. Note peak-season planning items.",
        compliance_tags=[],
    ),
    Domain(
        slug="hospitality",
        name="Hospitality & Tourism",
        category="customer_facing",
        industry_context="hospitality or tourism business. Recognize terms like: ADR, RevPAR, occupancy, F&B, MICE, yield, front-of-house, back-of-house, guest satisfaction, event booking.",
        prompt_hint="Capture occupancy and revenue targets, guest experience action items, event bookings, and staffing decisions.",
        compliance_tags=[],
    ),
    Domain(
        slug="realestate",
        name="Real Estate",
        category="customer_facing",
        industry_context="real estate or construction company. Recognize terms like: cap rate, NOI, zoning, entitlement, GMP contract, project milestone, change order, punch list.",
        prompt_hint="Capture property decisions, financing commitments, and milestone dates. Flag entitlement or zoning risks.",
        compliance_tags=[],
    ),
    # ── Operations & Industrial ───────────────────────────────────────────────
    Domain(
        slug="manufacturing",
        name="Manufacturing & Operations",
        category="operations_industrial",
        industry_context="manufacturing or operations organization. Recognize terms like: OEE, downtime, defect rate, cycle time, Kanban, Kaizen, CAPA, safety incident, capex, production target.",
        prompt_hint="Capture production targets, downtime causes, defect rates, safety incidents, and capex requests. Flag safety items as high priority.",
        compliance_tags=["osha"],
    ),
    Domain(
        slug="construction",
        name="Construction & Engineering",
        category="operations_industrial",
        industry_context="construction or engineering firm. Recognize terms like: RFI, change order, GMP, punch list, submittal, site safety, schedule, subcontractor, bid, milestone.",
        prompt_hint="Capture milestones, blockers, safety issues, cost variances, and subcontractor commitments. Flag safety items as high priority.",
        compliance_tags=["osha"],
    ),
    Domain(
        slug="logistics",
        name="Logistics & Supply Chain",
        category="operations_industrial",
        industry_context="logistics or supply chain organization. Recognize terms like: on-time delivery, carrier, S&OP, 3PL, SKU, warehouse utilization, OTIF, freight cost, demand plan, inventory turns.",
        prompt_hint="Capture on-time delivery performance, capacity constraints, freight cost issues, and supplier risks.",
        compliance_tags=[],
    ),
    Domain(
        slug="mining",
        name="Mining & Resources",
        category="operations_industrial",
        industry_context="mining or natural resources company. Recognize terms like: tonnage, grade, ore body, permit, tailings, TRIFR, LTI, exploration, haul, processing plant.",
        prompt_hint="Capture production volumes, safety incidents (flag as high priority), permit status updates, and equipment downtime.",
        compliance_tags=["osha"],
    ),
    Domain(
        slug="agriculture",
        name="Agriculture & Agritech",
        category="operations_industrial",
        industry_context="agriculture or agritech company. Recognize terms like: yield, crop, input cost, certification (organic, GAP), cooperative, weather impact, pest, precision agriculture.",
        prompt_hint="Capture yield forecasts, weather impacts, input cost decisions, supplier commitments, and certification items.",
        compliance_tags=[],
    ),
    Domain(
        slug="automotive",
        name="Automotive",
        category="operations_industrial",
        industry_context="automotive company. Recognize terms like: production volume, OEM, Tier 1/2, PPAP, FMEA, recall, warranty claim, tooling, JIT, IATF 16949.",
        prompt_hint="Capture production targets, recall or quality issues, supplier problems, and warranty data. Flag safety-related items as high priority.",
        compliance_tags=["osha"],
    ),
    Domain(
        slug="aerospace",
        name="Aerospace & Defense",
        category="operations_industrial",
        industry_context="aerospace or defense company. Recognize terms like: program milestone, CDR, PDR, TRL, ITAR, export control, AS9100, test results, cost-plus, FMEA.",
        prompt_hint="Capture program milestones, test results, and risk items. Flag any ITAR or export-control mentions — these require immediate legal review. Note classified or sensitive topics.",
        compliance_tags=["itar", "export_control"],
    ),
    Domain(
        slug="energy",
        name="Energy & Utilities",
        category="operations_industrial",
        industry_context="energy or utilities company. Recognize terms like: EBITDA, load forecast, outage, reliability, PPA, NERC, environmental compliance, capex, asset performance, renewable.",
        prompt_hint="Capture outage reports, load forecast updates, compliance items, and environmental incidents. Flag regulatory items as high priority.",
        compliance_tags=["nerc", "epa"],
    ),
    # ── Media & Public ────────────────────────────────────────────────────────
    Domain(
        slug="media",
        name="Media & Entertainment",
        category="media_public",
        industry_context="media or entertainment company. Recognize terms like: editorial, talent, distribution, IP, licensing, ratings, content calendar, production schedule, exclusivity.",
        prompt_hint="Capture story assignments, deadlines, talent commitments, budget items, and distribution decisions.",
        compliance_tags=[],
    ),
    Domain(
        slug="government",
        name="Government & Public Sector",
        category="media_public",
        industry_context="government or public sector organization. Recognize terms like: resolution, motion, appropriations, compliance, procurement, RFP, constituents, FOIA, public comment.",
        prompt_hint="Capture motions, votes, public comments, compliance items, and budget allocations. Note any FOIA-relevant discussions.",
        compliance_tags=["foia"],
    ),
    Domain(
        slug="nonprofit",
        name="Non-Profit & NGO",
        category="media_public",
        industry_context="non-profit or NGO organization. Recognize terms like: grant, donor, program outcomes, impact metrics, volunteer, board governance, restricted funds, MOU.",
        prompt_hint="Capture program outcomes, donor commitments, grant deadlines, volunteer needs, and governance items.",
        compliance_tags=[],
    ),
]

# ── Lookup helpers ─────────────────────────────────────────────────────────────

_REGISTRY: dict[str, Domain] = {d.slug: d for d in DOMAINS}

CATEGORY_LABELS: dict[str, str] = {
    "generic":               "General",
    "technology_cyber":      "Technology & Cyber",
    "health_life_sciences":  "Health & Life Sciences",
    "financial_services":    "Financial Services",
    "professional_services": "Professional Services",
    "people_talent":         "People & Talent",
    "customer_facing":       "Customer-Facing",
    "operations_industrial": "Operations & Industrial",
    "media_public":          "Media & Public",
}


def get_domain(slug: str) -> Domain:
    return _REGISTRY.get(slug, _REGISTRY["general"])


def list_domains() -> list[dict]:
    return [
        {
            "slug": d.slug,
            "name": d.name,
            "category": d.category,
            "category_label": CATEGORY_LABELS.get(d.category, d.category),
            "compliance_tags": list(d.compliance_tags),
        }
        for d in DOMAINS
    ]


def list_categories() -> list[dict]:
    seen: dict[str, list[dict]] = {}
    for d in DOMAINS:
        seen.setdefault(d.category, []).append({"slug": d.slug, "name": d.name})
    return [
        {"key": cat, "label": CATEGORY_LABELS.get(cat, cat), "domains": domains}
        for cat, domains in seen.items()
    ]
