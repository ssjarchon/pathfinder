import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";


export default [
	{files: ["**/*.{js,mjs,cjs,ts}", "!**/node_modules/**", "!**/dist/**"]},
	{languageOptions: { globals: {...globals.browser, ...globals.node} }},
	pluginJs.configs.recommended,
	...tseslint.configs.recommended,
	{
		rules: {
			"indent": ["error", "tab"],
		}
	}
];