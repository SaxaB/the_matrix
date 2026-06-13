#!/usr/bin/env python3
"""Runner de evals (diseño §8: evals como GATE, no como métrica decorativa).

Corre el golden set de evals/golden/*.yaml contra el código real de saxa,
sin LLM ni red: todos los casos son deterministas. Exit code != 0 si falla
cualquier caso → sirve de gate en CI y de smoke previo a desplegar.

Uso:
  python evals/run_evals.py            # todo el golden set
  python evals/run_evals.py --only gates
Requiere el paquete saxa instalado (apps/agent: pip install -e .).
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import yaml

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "apps" / "agent"))

from saxa.domains.finance.intent import detect_intent_keywords  # noqa: E402
from saxa.gates import source_gate  # noqa: E402
from saxa.gates.telegram_md_lint import lint  # noqa: E402

GOLDEN_DIR = Path(__file__).resolve().parent / "golden"


def check_gate_case(case: dict) -> list[str]:
    failures = []
    expect = case.get("expect", {})
    if case["gate"] == "source_gate":
        verdict = source_gate.evaluate(case["input"])
        if "ok" in expect and verdict.get("ok") != expect["ok"]:
            failures.append(f"ok={verdict.get('ok')} esperado {expect['ok']}")
        if "gated" in expect and verdict.get("gated") != expect["gated"]:
            failures.append(f"gated={verdict.get('gated')} esperado {expect['gated']}")
        if "gate_name" in expect and verdict.get("gate") != expect["gate_name"]:
            failures.append(f"gate={verdict.get('gate')} esperado {expect['gate_name']}")
        if "gate_name_not" in expect and verdict.get("gate") == expect["gate_name_not"]:
            failures.append(f"gate no debía ser {expect['gate_name_not']}")
    elif case["gate"] == "telegram_md_lint":
        issues = lint(case["input"])
        if "issues_min" in expect and len(issues) < expect["issues_min"]:
            failures.append(f"{len(issues)} issues, esperado >= {expect['issues_min']}")
        if "issues_max" in expect and len(issues) > expect["issues_max"]:
            failures.append(f"{len(issues)} issues, esperado <= {expect['issues_max']}")
    else:
        failures.append(f"gate desconocido: {case['gate']}")
    return failures


def check_intent_case(case: dict) -> list[str]:
    failures = []
    expect = case.get("expect", {})
    intent = detect_intent_keywords(case["message"])
    if "type" in expect and intent.type != expect["type"]:
        failures.append(f"type={intent.type} esperado {expect['type']}")
    if "tickers" in expect and intent.tickers != [str(t) for t in expect["tickers"]]:
        failures.append(f"tickers={intent.tickers} esperado {expect['tickers']}")
    return failures


def run(only: str | None = None) -> int:
    total = passed = 0
    for path in sorted(GOLDEN_DIR.glob("*.yaml")):
        suite = path.stem
        if only and suite != only:
            continue
        with path.open() as f:
            cases = (yaml.safe_load(f) or {}).get("cases", [])
        print(f"\n== {suite} ({len(cases)} casos) ==")
        for case in cases:
            total += 1
            failures = (
                check_gate_case(case) if "gate" in case else check_intent_case(case)
            )
            if failures:
                print(f"  ✗ {case['id']}: {'; '.join(failures)}")
            else:
                passed += 1
                print(f"  ✓ {case['id']}")

    print(f"\n{passed}/{total} casos OK")
    return 0 if passed == total else 1


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--only", help="suite concreta (nombre del yaml sin extensión)")
    args = parser.parse_args()
    sys.exit(run(args.only))
