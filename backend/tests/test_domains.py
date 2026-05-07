from __future__ import annotations

import pytest

from domains.registry import DOMAINS, CATEGORY_LABELS, get_domain, list_categories, list_domains


def test_all_33_domains_registered() -> None:
    assert len(DOMAINS) == 33


def test_every_domain_has_required_fields() -> None:
    for domain in DOMAINS:
        assert domain.slug, f"Missing slug on domain {domain}"
        assert domain.name, f"Missing name on domain {domain.slug}"
        assert domain.category, f"Missing category on domain {domain.slug}"
        assert domain.industry_context, f"Missing industry_context on domain {domain.slug}"


def test_no_duplicate_slugs() -> None:
    slugs = [d.slug for d in DOMAINS]
    assert len(slugs) == len(set(slugs)), "Duplicate domain slugs found"


def test_get_domain_known_slug() -> None:
    d = get_domain("healthcare")
    assert d.slug == "healthcare"
    assert "hipaa" in d.compliance_tags


def test_get_domain_unknown_falls_back_to_general() -> None:
    d = get_domain("nonexistent_slug_xyz")
    assert d.slug == "general"


def test_list_domains_returns_all() -> None:
    domains = list_domains()
    assert len(domains) == 33
    for item in domains:
        assert "slug" in item
        assert "name" in item
        assert "category" in item
        assert "category_label" in item
        assert "compliance_tags" in item


def test_list_categories_covers_all_domains() -> None:
    categories = list_categories()
    total = sum(len(c["domains"]) for c in categories)
    assert total == 33


def test_every_category_has_label() -> None:
    categories = list_categories()
    for cat in categories:
        assert cat["label"] in CATEGORY_LABELS.values(), f"Unknown category key: {cat['key']}"


def test_compliance_tags_are_lists() -> None:
    for domain in DOMAINS:
        assert isinstance(domain.compliance_tags, list)


def test_hipaa_tag_on_healthcare_and_pharma() -> None:
    healthcare = get_domain("healthcare")
    pharma = get_domain("pharma")
    assert "hipaa" in healthcare.compliance_tags
    assert "hipaa" in pharma.compliance_tags


def test_itar_tag_on_aerospace() -> None:
    aerospace = get_domain("aerospace")
    assert "itar" in aerospace.compliance_tags


def test_general_has_no_compliance_tags() -> None:
    general = get_domain("general")
    assert general.compliance_tags == []


def test_all_category_keys_in_label_map() -> None:
    for domain in DOMAINS:
        assert domain.category in CATEGORY_LABELS, (
            f"Domain '{domain.slug}' has category '{domain.category}' not in CATEGORY_LABELS"
        )
