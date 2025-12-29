# Chimeraforge Technical Reports
## LLM Performance Research & Cross-Language Analysis

This publish-ready index summarizes the authoritative reports and benchmark artifacts that power the live Reports pages.

This directory contains the full research journey for Chimeraforge: benchmarking LLM agents, comparing Rust vs. Python implementations, and optimizing multi-agent runtimes. Assets include markdown reports, structured data exports, and derived visualizations.

---

## Research Phases

- **TR108-TR109:** Single-agent baselines and workflow optimization (Python).
- **TR110:** Python multi-agent performance baseline.
- **TR111_v2-TR112_v2:** Production-grade Rust single-agent and Rust vs. Python comparison.
- **TR114_v2:** Rust multi-agent analysis (Dual Ollama) with corrected statistics.
- **TR115_v2:** Runtime optimization across async runtimes (Tokio, Smol, async-std).
- **TR116-TR122:** Extended series (see full index below).
- **Conclusive 117-122:** Summary and whitepaper deliverables.

---

## Core Series File Index (TR108-TR115)

| Report File |
| --- |
| Technical_Report_108.md |
| Technical_Report_109.md |
| Technical_Report_110.md |
| Technical_Report_111.md |
| Technical_Report_111_v2.md |
| Technical_Report_112.md |
| Technical_Report_112_v2.md |
| Technical_Report_113.md |
| Technical_Report_114.md |
| Technical_Report_114_v2.md |
| Technical_Report_115.md |
| Technical_Report_115_v2.md |

---

## Current Production-Ready Reports (v2)

| Report | Title | Status | Key Finding |
| --- | --- | --- | --- |
| TR108 | Single-Agent LLM Performance Analysis | Complete | Optimal configs for single-agent inference |
| TR109 | Agent Workflow Optimization | Complete | GPU=60, CTX=512, TEMP=0.8 optimal for workflows |
| TR110 | Concurrent Multi-Agent Performance (Python) | Complete | 99.25% parallel efficiency achieved |
| TR111_v2 | Rust Single-Agent Performance | Complete | 114.54 tok/s baseline, 15.2% faster than Python |
| TR112_v2 | Rust vs Python Comparison | Complete | Rust: +15.2% throughput, -58% TTFT, -67% memory |
| TR114_v2 | Rust Multi-Agent Performance | Complete | 98.281% mean efficiency, 99.992% peak run |
| TR115_v2 | Rust Runtime Optimization | Complete | Tokio-default recommended (98.72% mean, 1.21pp IQR) |

### Historical Reports (Superseded)

| Report | Superseded By | Reason |
| --- | --- | --- |
| TR111 | TR111_v2 | Micro-benchmark replaced with full workflow parity |
| TR112 | TR112_v2 | Corrected comparison methodology |
| TR114 | TR114_v2 | Corrected statistics and broader run set |
| TR115 | TR115_v2 | Expanded runtime analysis (30 -> 150 runs) |

---

## Extended Series (TR113-TR122)

| Report File |
| --- |
| Technical_Report_113.md |
| Technical_Report_116.md |
| Technical_Report_117.md |
| Technical_Report_117_multi_agent.md |
| Technical_Report_118.md |
| Technical_Report_118_v2.md |
| Technical_Report_118_v2.1.md |
| Technical_Report_118_v2.2.md |
| Technical_Report_119.md |
| Technical_Report_119v1.md |
| Technical_Report_120.md |
| Technical_Report_121.md |
| Technical_Report_121v1.md |
| Technical_Report_122.md |

### Versioned Variants

- **TR111:** `Technical_Report_111.md`, `Technical_Report_111_v2.md`
- **TR112:** `Technical_Report_112.md`, `Technical_Report_112_v2.md`
- **TR114:** `Technical_Report_114.md`, `Technical_Report_114_v2.md`
- **TR115:** `Technical_Report_115.md`, `Technical_Report_115_v2.md`
- **TR117:** `Technical_Report_117.md`, `Technical_Report_117_multi_agent.md`
- **TR118:** `Technical_Report_118.md`, `Technical_Report_118_v2.md`, `Technical_Report_118_v2.1.md`, `Technical_Report_118_v2.2.md`
- **TR119:** `Technical_Report_119.md`, `Technical_Report_119v1.md`
- **TR121:** `Technical_Report_121.md`, `Technical_Report_121v1.md`

---

## Conclusive Reports (TR117-TR122)

| Report File |
| --- |
| Technical_Report_Conclusive_117-122.md |
| Technical_Report_Conclusive_117-122_Extended_Appendices.md |
| Technical_Report_Conclusive_117-122_Whitepaper.md |

---

## Key Findings

### Single-Agent (TR111_v2, TR112_v2)
- Rust throughput **+15.2%** vs Python; TTFT **-58%**; memory **-67%**.
- Startup 0.2s vs Python 1.5s; variance 46% lower (CV).

### Multi-Agent (TR110, TR114_v2)
- Python baseline peak efficiency 99.25%; mean 95.8% (150 runs).
- Rust (Dual Ollama) peak 99.396%, mean 98.281% (+2.48pp vs Python); contention 0.74%.

### Runtime Optimization (TR115_v2)
- **Use Tokio-default**: 98.72% mean efficiency, 1.21pp IQR.
- Smol-1KB is a compact alternative; async-std conflicts with Tokio bridge (50% catastrophic).

---

## Directory Notes

- Each `TR###` directory can contain `meta.json` plus exported charts/tables.
- Markdown reports live alongside these folders (e.g., `Technical_Report_112_v2.md`).
- Benchmarks are under `PublishReady/benchmarks/`.
- The compendium/whitepaper is `PublishReady/research_compendium.md`.
