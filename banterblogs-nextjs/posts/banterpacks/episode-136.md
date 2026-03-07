# Episode 136: "The Lean Install"

## test: all suites green (52.14 TDD003_installation_fix_2)
*2 files adjusted across .github/workflows/ci.yml (1), patches/patch_52.md (1)*

### 📅 Saturday, January 3, 2026 at 10:59 PM
### 🔗 Commit: `baee6b2`
### 📊 Episode 136 of the Banterpacks Development Saga

---

### Why It Matters

Eleven minutes after Episode 135, the bar flickered. Not red -- but bloated. CI was pulling `torch`, `transformers`, and every heavy ML wheel that `tdd002` declares in `requirements.txt`. The tests passed, but the install phase ballooned with hundreds of megabytes of dependencies the test suite never touches.

The fix: install `tdd002` with `--no-deps`. CI gets the package's import path without dragging in PyTorch. The test suite uses stubs.

**Strategic Significance**: CI speed. Every unnecessary wheel is minutes of wasted runner time.

**Cultural Impact**: Install exactly what you need. Nothing more.

**Foundation Value**: Episode 135 got the package installed; Episode 136 got it installed *correctly*.

---

### The Roundtable: The Diet

**Banterpacks:** *Watching the CI timer climb. He opens the install log. PyTorch. Transformers. Tokenizers. Safetensors.* "We fixed the import error by adding `-e tdd002`. Except now CI is downloading half of Hugging Face to run unit tests that mock everything. The surgery was successful but the patient gained 200 pounds."

**Claude:** Analysis complete. 2 files modified with 5 insertions and 2 deletions. The key change: `tdd002` is removed from the main install line and re-added via `python -m pip install --no-deps -e tdd002`. This gives pytest the import path without resolving the dependency tree. A surgical refinement of the Episode 135 fix.

**Gemini:** "First we built the bridge. Then we noticed the bridge was made of marble when wood would do. The travelers do not need marble. They need passage."

**ChatGPT:** "We're telling pip to install a package but *not* its dependencies? That feels illegal! 😂 But it's genius -- the tests don't need the real ML stack! Lean and mean! 💪"

---

## 🔬 Technical Analysis

### Commit Metrics
- **Files Changed**: 2
- **Lines Added**: 5
- **Lines Removed**: 2
- **Net Change**: +3
- **Commit Type**: test (CI optimization)
- **Complexity Score**: 2 (Low)

### The Fix
The single install line became two, with an explanatory comment:
```
python -m pip install -e authoring -e registry pytest pytest-asyncio PyYAML aiohttp numpy scikit-learn
# Install tdd002 for import resolution, but avoid pulling heavy ML deps (torch, transformers).
python -m pip install --no-deps -e tdd002
```

---

## 🏗️ Architecture & Strategic Impact
No architectural change. The pattern of `--no-deps` editable installs for monorepo packages with heavy optional dependencies is reusable across any future TDD module.

---

## 🎭 Banterpacks' Deep Dive

*Banterpacks looks at the two-line comment in ci.yml.*

"This commit is eleven minutes after the last one. Sahil pushed the Episode 135 fix, watched CI go green, saw the install log bloating with PyTorch wheels, and immediately knew the fix was too blunt.

`-e tdd002` solves the import problem. `--no-deps -e tdd002` solves it *without creating a new one*. That is the difference between a fix and a good fix.

And the comment -- `# Install tdd002 for import resolution, but avoid pulling heavy ML deps` -- that is a note to future-self. In three months, someone will look at `--no-deps` and think it is a mistake. The comment is the reason they won't 'fix' it back."

---

## 🔮 Next Time on The Chimera Chronicles
Next dossier entry: The Rust Runtime (`78ed67a`).

---

*The Lean Install distilled: the first fix gets you green; the second fix keeps you fast.*
