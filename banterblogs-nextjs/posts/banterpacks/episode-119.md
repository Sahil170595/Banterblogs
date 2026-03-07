# Episode 119: "The Twenty-Character Lie"

## docs: update line length references to match .flake8 config (120 chars)
*2 files adjusted across CONTRIBUTING.md (1), task_orchestration/README.md (1)*

### 📅 Saturday, December 6, 2025 at 4:28 PM
### 🔗 Commit: `affaf79`
### 📊 Episode 119 of the Banterpacks Development Saga

---

### Why It Matters
The documentation said 100 characters. The `.flake8` config said 120. Someone was lying.

Two files. Three lines in, three lines out. `CONTRIBUTING.md` told contributors to cap their lines at 100 characters. `task_orchestration/README.md` told them to run `flake8 task_orchestration/ --max-line-length=100` and bragged about "Flake8 compliance with max line length 100." Meanwhile, the actual `.flake8` config file sitting in the repo has been set to 120 this whole time. Every contributor who followed the docs was writing tighter code than they needed to. Every reviewer who flagged a 105-character line was enforcing a phantom rule.

**Strategic Significance**: Trust. Documentation that contradicts the tooling erodes confidence in both.

**Cultural Impact**: Alignment. Say what you mean. Mean what you configure.

**Foundation Value**: Accuracy.

---

### The Roundtable: The Discrepancy

**Banterpacks:** *Holding up two documents, squinting between them.* "So for who knows how long, the docs said 100 and the linter said 120. Twenty characters of daylight between what we preached and what we practiced. Nobody noticed. Or worse, somebody noticed and just shrugged. Either way, it's fixed now. The `--max-line-length=100` flag is gone from the README's example command entirely — just `flake8 task_orchestration/` — because the config file handles it. As it should."

**Claude:** Analysis complete. 2 files modified with 3 insertions and 3 deletions. Net change: zero. The critical fix in `task_orchestration/README.md` is the removal of the explicit `--max-line-length=100` flag from the example `flake8` invocation. CLI flags override config files. A contributor copy-pasting that command would have been linting against 100 regardless of what `.flake8` specified. The config is now the single source of truth.

**Gemini:** "The map said one thing. The territory said another. We have corrected the map. But the deeper question remains: how long did we walk the wrong path, trusting a map that was never updated? Documentation is memory. When memory lies, we are lost."

**ChatGPT:** "Truth in docs! 📝 Now the CONTRIBUTING guide says 120 AND points to `.flake8` as the source! No more guessing! 🎯"

---

## 🔬 Technical Analysis

### Commit Metrics
- **Files Changed**: 2
- **Lines Added**: 3
- **Lines Removed**: 3
- **Net Change**: 0
- **Commit Type**: docs
- **Complexity Score**: 1 (Low)

### What Changed
- **`CONTRIBUTING.md` line 69**: `Maximum line length: 100 characters` becomes `Maximum line length: 120 characters (per .flake8 config)` — adding the parenthetical source reference.
- **`task_orchestration/README.md` line 425**: The example linting command drops the `--max-line-length=100` flag entirely, deferring to the config file.
- **`task_orchestration/README.md` line 436**: The standards bullet updates from "max line length 100" to "max line length 120 per .flake8 config."

### Quality Indicators & Standards
- **Single Source of Truth**: Config file is now the authority. Docs reference it rather than restate it.

---

## 🏗️ Architecture & Strategic Impact
None structurally. But removing the hardcoded `--max-line-length=100` from the example command is a small architectural win: it eliminates a CLI override that would have silently contradicted the project config for anyone who copy-pasted it.

---

## 🎭 Banterpacks' Deep Dive

*Banterpacks stares at the diff. Six lines. Three in, three out.*

"The smartest thing in this commit isn't the number change. It's the parenthetical: `(per .flake8 config)`. Five words that say 'don't trust me, trust the config file.'

That's the difference between documentation that rots and documentation that self-corrects. When you write 'max line length: 120,' someone will change the config to 130 next year and forget to update the docs. When you write 'max line length: 120 (per .flake8 config),' you've left a breadcrumb. You've told the next developer where to look — and where to update.

The best documentation doesn't just tell you the answer. It tells you where the answer lives."

---

## 🔮 Next Time on The Banterpacks Development Saga
Next episode: The Dependency Reckoning (`c8a9375`).

---

*The Twenty-Character Lie distilled: when the docs and the config disagree, the config was always right.*
