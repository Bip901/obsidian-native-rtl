import { Direction, EditorView } from "@codemirror/view";
import { Editor, EditorPosition, MarkdownView, Platform, Plugin } from "obsidian";

export default class NativeRTLPlugin extends Plugin {
	private readonly openingBrackets = ["(", "[", "<", "{"];
	private readonly closingBrackets = [")", "]", ">", "}"];
	private ctrlShiftPending: boolean = false;

	onload(): void {
		this.app.workspace.containerEl.addEventListener("keydown", this.onKeyDown);
		this.app.workspace.containerEl.addEventListener("keyup", this.onKeyUp);
		if (Platform.isMobile) {
			this.app.workspace.containerEl.addEventListener("input", this.onInput);
		}
	}

	onunload(): void {
		this.app.workspace.containerEl.removeEventListener("keydown", this.onKeyDown);
		this.app.workspace.containerEl.removeEventListener("keyup", this.onKeyUp);
		if (Platform.isMobile) {
			this.app.workspace.containerEl.removeEventListener("input", this.onInput);
		}
	}

	private onKeyDown = (event: KeyboardEvent): void => {
		if (event.altKey) {
			return;
		}
		// Pressing a combination like Ctrl+Shift+Tab should NOT trigger the Ctrl+Shift shortcut.
		// Therefore, if any key that is not Shift or Control is pressed down, the event is cancelled.
		this.ctrlShiftPending = (event.key === "Shift" && event.ctrlKey) || (event.key == "Control" && event.shiftKey);
	};

	private onKeyUp = (event: KeyboardEvent): void => {
		if (!this.ctrlShiftPending) {
			return;
		}
		this.ctrlShiftPending = false;
		if (event.key != "Shift" && event.key != "Control") {
			return;
		}
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!activeView) {
			return;
		}
		this.ensureFlowDirectionPerSelectedLine(
			activeView.editor,
			event.location == KeyboardEvent.DOM_KEY_LOCATION_RIGHT ? Direction.RTL : Direction.LTR
		);
	};

	private ensureFlowDirectionPerSelectedLine(editor: Editor, desiredDirection: Direction): void {
		const codeMirror: EditorView = (editor as any).cm;
		for (const selection of editor.listSelections()) {
			const startLine = Math.min(selection.anchor.line, selection.head.line);
			const endLine = Math.max(selection.anchor.line, selection.head.line);
			for (let line = startLine; line <= endLine; line++) {
				const startOfLine: EditorPosition = { line: line, ch: 0 };
				const lineDirection = codeMirror.textDirectionAt(editor.posToOffset(startOfLine));
				if (lineDirection === desiredDirection) {
					continue;
				}
				const tableHeaderIndex = this.getTableHeaderIndex(editor, line);
				if (tableHeaderIndex === -1) {
					this.flipLine(editor, line, desiredDirection);
				} else {
					// A table's flow direction is solely determined by the first header cell.
					const headerLine = editor.getLine(tableHeaderIndex);
					const cellStartInclusive = headerLine.indexOf("|") + 1;
					const cellEndExclusive = headerLine.indexOf("|", cellStartInclusive);
					const cellContents = headerLine.slice(cellStartInclusive, cellEndExclusive);
					this.flipString(
						editor,
						cellContents,
						{ line: tableHeaderIndex, ch: cellStartInclusive },
						desiredDirection,
						/\s*/
					);
					// This table has been handled, skip the next table lines
					while (line <= endLine) {
						if (editor.getRange({ ch: 0, line: line }, { ch: 1, line: line }) !== "|") {
							line--;
							break;
						}
						line++;
					}
				}
			}
		}
	}

	/**
	 * If the given line is part of a table, returns the index of the header line of that table. Otherwise, returns -1.
	 */
	private getTableHeaderIndex(editor: Editor, line: number): number {
		let firstLineAboveTable = line;
		while (firstLineAboveTable >= 0) {
			const firstCharacter = editor.getRange(
				{ line: firstLineAboveTable, ch: 0 },
				{ line: firstLineAboveTable, ch: 1 }
			);
			if (firstCharacter !== "|") {
				break;
			}
			firstLineAboveTable--;
		}
		// Tables must have a blank line above them
		if (
			firstLineAboveTable === line ||
			firstLineAboveTable < 0 ||
			editor.getLine(firstLineAboveTable).trim().length !== 0
		) {
			return -1;
		}
		// Tables must have a header
		const headerSeperatorLineIndex = firstLineAboveTable + 2;
		if (editor.lineCount() <= headerSeperatorLineIndex) {
			return -1;
		}
		if (!editor.getLine(headerSeperatorLineIndex).match(/\|(?:\s*:?-+:?\s*\|)+/)) {
			return -1;
		}
		return firstLineAboveTable + 1;
	}

	private flipLine(editor: Editor, line: number, desiredDirection: Direction) {
		// RTL/LTR marks should be inserted AFTER the following special prefixes:
		// bullet points, checklist items, numbered items, headings, callouts, footnotes.
		const specialPrefixRegex = /^(?:\s*[-*](?:\s+\[[^\[\]]\])?|[1-9][0-9]*[\).]|\#+|\s*>|\[\^[0-9]+\]:\s*)\s+/;
		this.flipString(editor, editor.getLine(line), { line: line, ch: 0 }, desiredDirection, specialPrefixRegex);
	}

	/**
	 * Flips the direction of the given string, assuming it's currently in the wrong direction.
	 * @param editor An editor instance.
	 * @param s The string to examine.
	 * @param start The index of the first character of {@link s} within the entire document.
	 * @param desiredDirection The direction the string would be in after the flip.
	 * @param specialPrefix A regex defining allowed special prefixes, such that RTL/LTR marks should be inserted AFTER them.
	 */
	private flipString(
		editor: Editor,
		s: string,
		start: EditorPosition,
		desiredDirection: Direction,
		specialPrefix: RegExp | null = null
	): void {
		// If there are opposing direction marks near the beginning of the string (after characters which are direction-neutral or of the desired direction),
		// they are the culprit, and removing them should be enough to flip the string's direction.
		let directionMarksMatches = null;
		if (desiredDirection === Direction.LTR) {
			directionMarksMatches = s.match(
				/^([^\p{Script=Hebrew}\p{Script=Arabic}\p{Script=Thaana}\p{Script=Syriac}]*?)(\u200F+)/u
			);
		} else {
			directionMarksMatches = s.match(/^(.*?)(\u200E+)/);
		}
		if (directionMarksMatches) {
			editor.replaceRange(
				"",
				{ line: start.line, ch: start.ch + directionMarksMatches[1].length },
				{ line: start.line, ch: start.ch + directionMarksMatches[1].length + directionMarksMatches[2].length }
			);
			return;
		}
		// Inserting a direction mark in the beginning of the string flips it.
		const LTR_MARK = "\u200E";
		const RTL_MARK = "\u200F";
		const desiredMark = desiredDirection == Direction.LTR ? LTR_MARK : RTL_MARK;
		if (specialPrefix) {
			const specialPrefixMatches = s.match(specialPrefix);
			if (specialPrefixMatches && specialPrefixMatches.length) {
				start.ch += specialPrefixMatches[0].length;
			}
		}
		editor.replaceRange(desiredMark, start);
	}

	private onInput = (event: InputEvent): void => {
		if (event.inputType !== "insertText" || event.data?.length !== 1) {
			return;
		}
		const openingBracketIndex = this.openingBrackets.indexOf(event.data);
		const closingBracketIndex = this.closingBrackets.indexOf(event.data);
		if (openingBracketIndex === -1 && closingBracketIndex === -1) {
			return;
		}
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!activeView) {
			return;
		}
		const codeMirror: EditorView = (activeView.editor as any).cm;
		const lineDirection = codeMirror.textDirectionAt(activeView.editor.posToOffset(activeView.editor.getCursor()));
		if (lineDirection === Direction.LTR) {
			return;
		}
		event.preventDefault();
		event.stopPropagation();
		if (openingBracketIndex !== -1) {
			activeView.editor.replaceSelection(this.closingBrackets[openingBracketIndex]);
		} else {
			const autoPairBrackets = (this.app.vault as any).getConfig("autoPairBrackets");
			if (autoPairBrackets && this.openingBrackets[closingBracketIndex] !== "<") {
				const previousSelection = activeView.editor.listSelections()[0];
				const selectionContent = activeView.editor.getSelection();
				activeView.editor.replaceSelection(
					this.openingBrackets[closingBracketIndex] +
						selectionContent +
						this.closingBrackets[closingBracketIndex]
				);
				previousSelection.anchor.ch++;
				previousSelection.head.ch++;
				activeView.editor.setSelection(previousSelection.anchor, previousSelection.head);
			} else {
				activeView.editor.replaceSelection(this.openingBrackets[closingBracketIndex]);
			}
		}
	};
}
