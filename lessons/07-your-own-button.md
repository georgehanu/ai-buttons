---
title: Design your own AI button
lesson: 7
---

# Epilogue · Design your own AI button

You've seen five buttons. Here's the thinking behind all of them, so you can design the sixth for your own app.

## Start from a chore, not from AI

Every button here replaces a small, boring task someone already does by hand:

| Chore | Button |
| --- | --- |
| Rewording a rushed reply | Tidy up |
| Copying details from an email into a form | Fill from email |
| Deciding who handles what | Route it |
| Reading every ticket to spot patterns | This week's themes |
| Writing the same kind of reply again | Draft and check |

Look through your app for the same kind of thing: copy-paste, retyping, reading to find one detail, writing a similar text again. That's where an AI button feels like a normal button.

## Five questions for any AI button

1. **What exactly goes in, and what comes out?** Write the schema first. If you can't, the feature isn't clear yet.
2. **What does "I don't know" look like?** A null, a "not sure" flag, or "send to a person". Design it on purpose.
3. **What does code check?** Formats, ids, counts, "is this quote really in the source?" Anything you can check without AI, check without AI.
4. **Who decides?** The model proposes. Code or a person makes it happen. Nothing irreversible without a click.
5. **What happens when it fails?** The page should work without it.

## Pick the smallest shape that works

From simplest to most complex:

1. **One call** → Tidy up, Fill from email
2. **Route, then specialist** → Route it
3. **Fan out, then combine** → This week's themes
4. **Write, check, revise once, hand over** → Draft and check
5. **An agent loop** → only when you can't write the steps down in advance (see *The Agent Loop*)

Most features stop at 1 or 2. Go one step up only when an eval shows it helps.

## Where to go next

- *The Agent Loop*, the companion to this repo: [build a mini coding agent](https://georgehanu.github.io/the-agent-loop/), for when you really do need step 5.
- Anthropic, [*Building effective agents*](https://www.anthropic.com/engineering/building-effective-agents). The patterns here, explained by the people who make the model.
- Claude docs on [structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs), for the schema details.

Build one button this week. Then tell me about it on X: [@georgehanu](https://x.com/georgehanu). I'd love to see what chore it replaced.
