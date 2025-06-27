# Obsidian Native RTL

This plugin utilizes Obsidian's *built-in* bidirectional text support to provide intuitive Right-To-Left and Left-To-Right directionality **per-line**.

* `Left Ctrl + Left Shift`: Make selected lines flow from left to right
* `Right Ctrl + Right Shift`: Make selected lines flow from right to left

If there's no selection, affects the line at the text cursor.

This plugin works by inserting/removing invisible Unicode control characters within the text, which means your documents **render correctly** not only in Obsidian but also in **ANY** markdown/text editor that follows [Unicode BiDi standards](https://en.wikipedia.org/wiki/Bidirectional_text)!

> This plugin only makes sense to use in Obsidian 1.6.0 or newer, since that is when Obsidian added per-line directionality.
