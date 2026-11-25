# Prompt Master

A Claude Code mod. It adds a "✨ Prompt Master" button above the prompt box. Type a rough prompt, press the button, and the draft in the box is replaced with a cleaner version: typos fixed, the ask made clear, nothing added or dropped. Nothing is sent. Read it, edit it if you want, then send it yourself. "Undo" puts your original draft back until you send.

The rewrite is one Sonnet call through your own Claude Code session, so it counts toward that session's usage.

## Install

In Claude Code, type at the prompt:

```
/plugin install prompt-master --marketplace zach723apple/prompt-master
```

Answer `y` to add the marketplace, then pick a scope (user scope puts it in every session).
