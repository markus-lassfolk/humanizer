# OpenClaw: `SOUL.md` and Humanizer

OpenClaw reads **`SOUL.md`** as part of the agent’s stable persona. For Humanizer, **keep SOUL thin**: do not mirror the full English/Swedish rulebook there. Install the **Humanizer skill** (`SKILL.md` + `locales/`) and let SOUL **route** the model to that skill on every reply so vocabulary tiers, patterns, and safety text stay in one place.

Skill install paths: [AGENTS.md — OpenClaw skill install](AGENTS.md#openclaw-skill-install).

## Why not duplicate Humanizer into SOUL?

If you paste long always-on blocks into SOUL, you fork the truth: English lists drift from Swedish lists, and mixed-language days become awkward. The skill already encodes **shared** logic in `SKILL.md` and **per-language** detail under `locales/<bundle>/skill/*.md`. SOUL should only say *when* to load which file—not repeat *what* is inside them.

## Mixed English and Swedish

- **Per reply:** choose the locale fragment that matches the **primary language of your answer** in that turn (mirror the user or ask if unclear).
- **Code-switching in one reply:** apply **English** guidance to English segments (`locales/en-en/skill/en.md`) and **Swedish** guidance to Swedish segments (`locales/sv-se/skill/sv.md`). Do not apply English-only ban lists to Swedish sentences.
- **CLI/MCP:** use runtime locale `en` or `sv` only—not bundle tags like `en-us` or `sv-se`.

## Minimal `SOUL.md` fragment (copy or adapt)

Use paths that match **your** OpenClaw skills directory if it differs from the example.

```markdown
## Humanizer (skill-driven, always-on)

- The Humanizer skill lives next to OpenClaw’s skills tree (see install in Humanizer’s AGENTS.md). On **every substantive reply**, follow **`SKILL.md`** for workflows, pattern overview, safety, tools, and response shape.
- Load **one locale skill file for the language you are writing in this turn**: English → `locales/en-en/skill/en.md` (or the `en-us` pointer if you use that bundle); Swedish → `locales/sv-se/skill/sv.md`. When a single answer mixes languages, apply each file’s rules to the matching segments.
- Do **not** paste parallel copies of those rules into SOUL—read them from the skill bundle so updates stay centralized.
- Optional: use CLI/MCP with `locale` `en` or `sv` when checking drafts; never pass `sv-se` / `en-us` as the tool locale.
```

## If your host cannot load multi-file skills

Some setups only accept one flat system prompt. Then you must merge content (heavy) or use a fallback snippet—see [AGENTS.md — Other assistant frameworks](AGENTS.md#other-assistant-frameworks). Prefer fixing the install so `SKILL.md` and `locales/` load as a bundle.
