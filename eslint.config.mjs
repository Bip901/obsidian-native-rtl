import tsparser from "@typescript-eslint/parser";
import obsidianmd from "eslint-plugin-obsidianmd";
import { defineConfig } from "eslint/config";

export default defineConfig([
	...obsidianmd.configs.recommended,
	{
		files: ["**/*.ts"],
		languageOptions: {
			parser: tsparser,
			parserOptions: {
				project: "./tsconfig.json",
				tsconfigRootDir: import.meta.dirname,
			},
		},
	},
	{
		files: ["**/*.mjs", "**/*.js"],
		languageOptions: {
			parserOptions: {
				project: null,
			},
		},
	},
	{
		ignores: ["node_modules/", "main.js", "version-bump.mjs"],
	},
]);
