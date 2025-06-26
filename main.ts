import { Editor, EditorPosition, MarkdownView, Plugin } from "obsidian";

interface NativeRTLPluginSettings { }

const LINE_DIRECTION_LEFT = 0;
const LINE_DIRECTION_RIGHT = 1;
const DEFAULT_SETTINGS: NativeRTLPluginSettings = {}

export default class NativeRTLPlugin extends Plugin {
	private settings: NativeRTLPluginSettings;

	async onload() {
		await this.loadSettings();
		this.app.workspace.containerEl.addEventListener("keydown", this.onKeyDown);
	}

	private onKeyDown = (event: KeyboardEvent) => {
		if (event.key === "Shift" && event.ctrlKey && !event.altKey) {
			const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
			if (!activeView || !activeView.editor) {
				return;
			}
			// event.preventDefault();
			if (event.location == KeyboardEvent.DOM_KEY_LOCATION_LEFT) {
				this.ensureLtr(activeView.editor);
			}
			else if (event.location == KeyboardEvent.DOM_KEY_LOCATION_RIGHT) {
				this.ensureRtl(activeView.editor);
			}
		}
	}

	private ensureLtr(editor: Editor) {
		const codeMirrorInstance = (editor as any).cm;
		let startOfLine: EditorPosition = editor.getCursor();
		startOfLine.ch = 0;
		const lineDirection = codeMirrorInstance.textDirectionAt(editor.posToOffset(startOfLine));
		if (lineDirection == LINE_DIRECTION_RIGHT) {
			const LTR_MARK = "\u200E";
			const lineContent = editor.getLine(startOfLine.line);
			const match = lineContent.match(/^(\s*([-*]|\#+)\s+)/);
			let insertPos: EditorPosition = { ...startOfLine };
			if (match && match[1]) {
				insertPos.ch = match[1].length;
			}
			editor.replaceRange(LTR_MARK, insertPos);
		}
	}

	private ensureRtl(editor: Editor) {

	}

	onunload() {
		this.app.workspace.containerEl.removeEventListener("keydown", this.onKeyDown);
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
