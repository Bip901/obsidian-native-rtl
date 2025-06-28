# Obsidian Native RTL

This plugin utilizes Obsidian's *built-in* bidirectional text support to provide intuitive Right-To-Left and Left-To-Right directionality **per-line**.

* `Left Ctrl + Left Shift`: Make selected lines flow from left to right
* `Right Ctrl + Right Shift`: Make selected lines flow from right to left

If there's no selection, affects the line at the text cursor.

This plugin works by inserting/removing invisible Unicode control characters within the text, which means your documents **render correctly** not only in Obsidian but also in **ANY** markdown/text editor that follows [Unicode BiDi standards](https://en.wikipedia.org/wiki/Bidirectional_text)!

> This plugin only makes sense to use in Obsidian 1.6.0 or newer, since that is when Obsidian added per-line directionality.

## Bonus Feature: Fixes Reverse Parentheses On Mobile

Obsidian for Android has a bug where if you type `(` in a right-to-left line (that is, a line beginning with a strong RTL character such as `א`), Obsidian types `)` and vice versa. Same goes for `[]`, `{}`, and `<>`.

When installing this plugin on Mobile, it **fixes** the reverse parentheses issue by overriding the `input` event 😀
