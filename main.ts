import { Direction, EditorView } from "@codemirror/view";
import { Editor, EditorPosition, MarkdownView, Plugin } from "obsidian";

const LTR_MARK = "\u200E";
const RTL_MARK = "\u200F";

interface NativeRTLPluginSettings {}

const DEFAULT_SETTINGS: NativeRTLPluginSettings = {};

export default class NativeRTLPlugin extends Plugin {
	private settings: NativeRTLPluginSettings;
	private ctrlShiftPending: boolean = false;

	async onload() {
		await this.loadSettings();
		this.app.workspace.containerEl.addEventListener("keydown", this.onKeyDown);
		this.app.workspace.containerEl.addEventListener("keyup", this.onKeyUp);
	}

	private onKeyDown = (event: KeyboardEvent) => {
		if (event.altKey) {
			return;
		}
		//Pressing a combination like Ctrl+Shift+Tab should NOT trigger the Ctrl+Shift shortcut.
		//Therefore, if any key that is not Shift or Control is pressed down, the event is cancelled.
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
		if (desiredDirection !== lineDirection) {
					this.ensureFlowDirection(editor, startOfLine, desiredDirection);
		}
			}
		}
	}

	private ensureFlowDirection(editor: Editor, startOfLine: EditorPosition, desiredDirection: Direction): void {
		const lineIndex = startOfLine.line;
		const lineContent = editor.getLine(lineIndex);
		const oppositeMark = desiredDirection == Direction.LTR ? RTL_MARK : LTR_MARK;
		const firstOppositeMarkIndex = lineContent.indexOf(oppositeMark);
		if (firstOppositeMarkIndex != -1) {
			editor.replaceRange(
				"",
				{ line: lineIndex, ch: firstOppositeMarkIndex },
				{ line: lineIndex, ch: firstOppositeMarkIndex + 1 }
			);
			return;
		}
		const desiredMark = desiredDirection == Direction.LTR ? LTR_MARK : RTL_MARK;
		// The mark should be inserted AFTER the following special prefixes:
		// bullet points, checklist items, numbered items, headings, callouts, footnotes.
		const matches = lineContent.match(
			/^(?:\s*[-*](?:\s+\[[^\[\]]\])?|[1-9][0-9]*[\).]|\#+|\s*>|\[\^[0-9]+\]:\s*)\s+/
		);
		if (matches && matches.length) {
			startOfLine.ch = matches[0].length;
		}
		editor.replaceRange(desiredMark, startOfLine);
	}

	onunload() {
		this.app.workspace.containerEl.removeEventListener("keydown", this.onKeyDown);
		this.app.workspace.containerEl.removeEventListener("keyup", this.onKeyUp);
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
