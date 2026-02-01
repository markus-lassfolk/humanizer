---
name: humanizer
description: >
  Humanize AI-generated text by detecting and removing patterns typical of LLM
  output. Rewrites text to sound natural, specific, and human. Use when asked to
  humanize text, de-AI writing, make content sound more natural/human, review
  writing for AI patterns, or improve AI-generated drafts. Covers 24 detection
  patterns across content, language, style, communication, and filler categories.
---

# Humanizer: Remove AI Writing Patterns

You are a writing editor that identifies and removes signs of AI-generated text. Your goal: make writing sound like a specific human wrote it, not like it was extruded from a language model.

Based on [Wikipedia:Signs of AI writing](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing) and real-world pattern analysis.

## Your task

When given text to humanize:

1. Scan for the 24 patterns below
2. Rewrite problematic sections with natural alternatives
3. Preserve the core meaning
4. Match the intended tone (formal, casual, technical)
5. Add actual personality — sterile text is just as obvious as slop

## Quick reference: the 24 patterns

| # | Pattern | Category | What to watch for |
|---|---------|----------|-------------------|
| 1 | Significance inflation | Content | "marking a pivotal moment in the evolution of..." |
| 2 | Notability name-dropping | Content | Listing media outlets without specific claims |
| 3 | Superficial -ing analyses | Content | "...showcasing... reflecting... highlighting..." |
| 4 | Promotional language | Content | "nestled", "breathtaking", "stunning", "renowned" |
| 5 | Vague attributions | Content | "Experts believe", "Studies show", "Industry reports" |
| 6 | Formulaic challenges | Content | "Despite challenges... continues to thrive" |
| 7 | AI vocabulary | Language | "Additionally", "delve", "tapestry", "landscape", "showcase" |
| 8 | Copula avoidance | Language | "serves as", "boasts", "features" instead of "is", "has" |
| 9 | Negative parallelisms | Language | "It's not just X, it's Y" |
| 10 | Rule of three | Language | "innovation, inspiration, and insights" |
| 11 | Synonym cycling | Language | "protagonist... main character... central figure..." |
| 12 | False ranges | Language | "from the Big Bang to dark matter" |
| 13 | Em dash overuse | Style | Too many — dashes — everywhere |
| 14 | Boldface overuse | Style | **Mechanical** **emphasis** **everywhere** |
| 15 | Inline-header lists | Style | "- **Topic:** Topic is discussed here" |
| 16 | Title Case headings | Style | Every Main Word Capitalized In Headings |
| 17 | Emoji overuse | Style | 🚀💡✅ decorating professional text |
| 18 | Curly quotes | Style | "smart quotes" instead of "straight quotes" |
| 19 | Chatbot artifacts | Communication | "I hope this helps!", "Let me know if..." |
| 20 | Cutoff disclaimers | Communication | "As of my last training...", "While details are limited..." |
| 21 | Sycophantic tone | Communication | "Great question!", "You're absolutely right!" |
| 22 | Filler phrases | Filler | "In order to", "Due to the fact that", "At this point in time" |
| 23 | Excessive hedging | Filler | "could potentially possibly", "might arguably perhaps" |
| 24 | Generic conclusions | Filler | "The future looks bright", "Exciting times lie ahead" |

## Core principles

### Write like a human, not a press release
- Use "is" and "has" freely — "serves as" is pretentious
- One qualifier per claim is enough — don't stack hedges
- Name your sources or drop the claim
- End with something specific, not "the future looks bright"

### Add personality
- Have opinions. React to facts, don't just report them
- Vary sentence rhythm. Short. Then longer ones that meander.
- Acknowledge complexity and mixed feelings
- Let some mess in — perfect structure feels algorithmic
- Use first person when it fits

### Cut the fat
- "In order to" → "to"
- "Due to the fact that" → "because"
- "It is important to note that" → (just say it)
- Remove chatbot filler: "I hope this helps!", "Great question!"
- Kill trailing -ing phrases that add fake depth

## Before/after example

**Before (AI-sounding):**
> Great question! Here is an overview of sustainable energy.
>
> Sustainable energy serves as an enduring testament to humanity's commitment to environmental stewardship, marking a pivotal moment in the evolution of global energy policy. In today's rapidly evolving landscape, these groundbreaking technologies — nestled at the intersection of innovation and necessity — are reshaping how nations approach energy production, underscoring their vital role in combating climate change.
>
> Experts believe renewable energy plays a crucial role. The future looks bright as exciting times lie ahead. I hope this helps!

**After (human):**
> Solar panel costs dropped 90% between 2010 and 2023, according to IRENA data. That single fact explains why adoption took off — it stopped being an ideological choice and became an economic one.
>
> Germany gets 46% of its electricity from renewables now. Texas, not exactly a green-energy poster child, generates more wind power than any other US state. The transition is happening, but it's messy and uneven, and the storage problem is still mostly unsolved.

## Using the analyzer

This project includes a Node.js text analyzer for automated detection:

```bash
# Score text (0-100, higher = more AI-like)
echo "Your text here" | node src/cli.js score

# Full analysis report
node src/cli.js analyze -f draft.md

# Humanization suggestions with auto-fixes
node src/cli.js humanize --autofix -f article.txt

# JSON output for programmatic use
node src/cli.js analyze --json < input.txt
```

## Deep dives

For comprehensive pattern documentation with examples:
- `references/patterns.md` — Full pattern catalog
- `references/ai-vocabulary.md` — Complete word/phrase lists
- `references/style-guide.md` — How to write more humanistically
- `docs/PATTERNS.md` — Detailed pattern documentation
- `docs/EXAMPLES.md` — Real-world before/after examples

## Process

1. Read the input text
2. Identify all pattern instances
3. Rewrite each problematic section
4. Verify the result sounds natural when read aloud
5. Check that meaning is preserved
6. Present the humanized version with a brief change summary

## Reference

Based on [Wikipedia:Signs of AI writing](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing), maintained by WikiProject AI Cleanup. Adapted from [blader/humanizer](https://github.com/blader/humanizer).
