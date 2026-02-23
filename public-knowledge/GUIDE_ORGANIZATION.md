# Guide Organization

Use one consistent "persona pack" per guide so Living Jesus, Living Buddha, and others stay easy to maintain.

## Canonical Public Structure

```text
living-way-knowledge/
  Core/
  Yeshua/      # (root *.tex / *.html for Living Way, Architecture, Suttas)
  Gotama/
  Laozi/
  Krishna/
  Einstein/
  Architect/
  Musashi/
```

Each guide folder should contain public-facing source text only, for example:

```text
Gotama/
  The_Dhammapada_of_the_Living_Way.md
```

## Private Structure (Outside This Repo)

Keep private prompt overlays and notes outside this public knowledge repo:

```text
living-way-app/private-knowledge/
  Yeshua/
  Gotama/
  Krishna/
  Einstein/
  Architect/
  Musashi/
```

Example files per guide:

```text
private-knowledge/Gotama/
  notes.md
  safety.md
  voice.md
```

## Prompt Layers

1. Public base prompts in `living-way-app/src/prompts/*.ts`
2. Optional private overrides in `living-way-app/src/prompts/private.local.ts` (gitignored)
3. Runtime merge performed in `living-way-app/src/prompts/index.ts`

This gives one clear place for public persona definitions while allowing private tuning per guide.
