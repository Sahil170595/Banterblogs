# 📝 Episode Template

This template shows the required structure for creating new Banterblogs episodes. Follow this format to ensure consistency and proper parsing.

## 📋 Required Structure

```markdown
# Episode X: "Your Episode Title"

## Your Subtitle Here
*Brief description of what this episode covers*

### 📅 [Date] at [Time]
### 🔗 Commit: `[commit-hash]`
### 📊 Episode X of the Banterpacks Development Saga

---

### Why It Matters
Explain the significance of this commit. What problem does it solve? What does it enable? Why should readers care?

---

### The Roundtable: [Contextual Title]

**Banterpacks:** *[Opening comment with personality - sarcastic, practical, developer-focused]*

**Claude:** "[Analytical, data-driven perspective with specific metrics or technical details]"

**ChatGPT:** "[Enthusiastic, optimistic response with energy and creativity]"

**Gemini:** "[Philosophical, deep perspective finding meaning in the changes]"

**Banterpacks:** *[Developer's practical response, keeping things grounded]*

**Claude:** "[Follow-up technical analysis or clarification]"

**ChatGPT:** "[Additional enthusiasm or creative suggestions]"

**Banterpacks:** *[Closing developer perspective, often skeptical or realistic]*

---

## 🔬 Technical Analysis

### Commit Metrics
- **Files Changed**: [number]
- **Lines Added**: [number]
- **Lines Removed**: [number]
- **Net Change**: [number]
- **Change Mix**: [A:X, M:Y, D:Z format]
- **Commit Type**: [feature|bugfix|refactor|docs|etc]
- **Complexity Score**: [1-100]

### Code Quality Indicators
- **Has Tests**: ✅/❌
- **Has Documentation**: ✅/❌
- **Is Refactor**: ✅/❌
- **Is Feature**: ✅/❌
- **Is Bugfix**: ✅/❌

### Performance & Surface Impact
- **Lines per File**: [average]
- **Change Ratio**: [added/removed ratio]
- **File Distribution**: [description of what types of files changed]

---

## 🏗️ Architecture & Strategic Impact
Explain the broader architectural implications. How does this change affect the overall system? What strategic decisions were made? What are the long-term implications?

---

## 🎭 Banterpacks' Deep Dive
Developer perspective on the changes. What was the thought process? What challenges were faced? What would be done differently? This should be more personal and practical than the technical analysis.

---

## 🔮 Next Time on Banterpacks Development Story
Teaser for what's coming next. What will the next episode likely cover? What's the next major milestone or challenge?

---

*[Optional closing tagline or quote]*
```

## 🎯 Writing Guidelines

### Episode Titles
- Use descriptive, engaging titles
- Include the episode number
- Use quotes around the main title
- Keep it under 60 characters

### Subtitle
- Brief, one-line description
- Italicized for emphasis
- Should capture the essence of the changes

### Why It Matters
- 2-3 sentences explaining significance
- Focus on user impact or technical importance
- Avoid jargon, make it accessible

### The Roundtable
- Each AI personality should have a distinct voice
- **Banterpacks**: Sarcastic, practical, developer-focused
- **Claude**: Analytical, data-driven, precise
- **ChatGPT**: Enthusiastic, optimistic, creative
- **Gemini**: Philosophical, deep, meaningful
- Keep conversations natural and engaging
- Include technical details but make them accessible

### Technical Analysis
- Use actual metrics from the commit
- Be specific about numbers and changes
- Include quality indicators
- Explain performance implications

### Architecture & Strategic Impact
- Think beyond the immediate changes
- Consider long-term implications
- Explain strategic decisions
- Connect to broader project goals

### Banterpacks' Deep Dive
- Personal developer perspective
- Honest about challenges and trade-offs
- Practical insights and lessons learned
- What would be done differently

## 📊 Metadata Requirements

### Commit Information
- **Date**: When the commit was made
- **Time**: Specific time of day
- **Commit Hash**: Full git commit hash
- **Episode Number**: Sequential episode number

### Metrics
- **Files Changed**: Count of modified files
- **Lines Added**: Total lines added
- **Lines Removed**: Total lines removed
- **Complexity Score**: 1-100 scale based on change complexity

### Tags (Auto-generated)
- `banterpacks` - If related to main project
- `ai` - If involves AI/LLM features
- `development` - General development work
- `architecture` - Architectural changes
- `testing` - Test-related changes
- `deployment` - Deployment/infrastructure changes

## 🚀 Getting Started

1. **Copy this template** to create a new episode file
2. **Fill in all required sections** following the guidelines
3. **Use the correct naming convention**: `episode-XXX.md`
4. **Test locally** before committing
5. **Follow the personality guidelines** for authentic AI conversations

## 💡 Tips for Great Episodes

- **Start with impact**: What does this change enable?
- **Use real metrics**: Include actual commit data
- **Keep personalities distinct**: Each AI should sound different
- **Make it accessible**: Explain technical concepts clearly
- **Add context**: Connect to broader project goals
- **Be honest**: Include challenges and trade-offs
- **End with anticipation**: Tease what's coming next

## 🔍 Example Episode

See `posts/episode-001.md` for a complete example following this template.

---

*Happy episode writing! 🎮*
