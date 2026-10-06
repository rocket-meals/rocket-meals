/**
 * McpInstructionTranslationKeys.ts – the texts of the instruction "connect an AI assistant via MCP".
 *
 * Every Directus backend in this monorepo has the built-in MCP server (see `McpAccessHelper`), so the
 * instruction is the same wherever it is shown: on the app screen `/public/mcp-instruction` and on the
 * page of the `Rocket Meals` module in the Directus app. Both read their texts from here – spread into
 * {@link CommonTranslationKeys}, the texts into `commonTranslations`.
 */

export const McpInstructionTranslationKeys = {
	mcp_instruction: 'mcp_instruction',
	mcp_instruction_intro: 'mcp_instruction_intro',
	mcp_choose_provider: 'mcp_choose_provider',
	mcp_provider_other: 'mcp_provider_other',
	mcp_access_token: 'mcp_access_token',
	mcp_access_token_personal_hint: 'mcp_access_token_personal_hint',
	mcp_access_token_load_failed: 'mcp_access_token_load_failed',
	mcp_steps_title: 'mcp_steps_title',
	mcp_claude_step_open_connectors: 'mcp_claude_step_open_connectors',
	mcp_claude_step_add_custom: 'mcp_claude_step_add_custom',
	mcp_claude_step_name: 'mcp_claude_step_name',
	mcp_claude_step_url: 'mcp_claude_step_url',
	mcp_claude_step_continue: 'mcp_claude_step_continue',
	mcp_claude_step_authentication: 'mcp_claude_step_authentication',
	mcp_claude_step_header: 'mcp_claude_step_header',
	mcp_claude_step_finish: 'mcp_claude_step_finish',
	mcp_openai_step_open_settings: 'mcp_openai_step_open_settings',
	mcp_openai_step_plugins: 'mcp_openai_step_plugins',
	mcp_openai_step_add: 'mcp_openai_step_add',
	mcp_openai_step_name: 'mcp_openai_step_name',
	mcp_openai_step_url: 'mcp_openai_step_url',
	mcp_openai_step_authentication: 'mcp_openai_step_authentication',
	mcp_openai_step_use: 'mcp_openai_step_use',
	mcp_other_step_url: 'mcp_other_step_url',
	mcp_other_step_header: 'mcp_other_step_header',
	mcp_other_step_url_with_token: 'mcp_other_step_url_with_token',
	mcp_access_choice_question: 'mcp_access_choice_question',
	mcp_access_no_account_hint: 'mcp_access_no_account_hint',
	mcp_connect_with_account: 'mcp_connect_with_account',
	mcp_continue_without_account: 'mcp_continue_without_account',
	mcp_trademark_notice: 'mcp_trademark_notice',
	mcp_access_token_exists_hint: 'mcp_access_token_exists_hint',
	mcp_provider: 'mcp_provider',
	mcp_account: 'mcp_account',
	mcp_step_problems: 'mcp_step_problems',
	mcp_access_token_known_yes: 'mcp_access_token_known_yes',
	mcp_access_token_known_no: 'mcp_access_token_known_no',
	mcp_access_token_placeholder_hint: 'mcp_access_token_placeholder_hint',
	mcp_access_token_unknown_hint: 'mcp_access_token_unknown_hint',
	mcp_tap_to_copy: 'mcp_tap_to_copy',
	mcp_access_token_revoke: 'mcp_access_token_revoke',
	mcp_access_token_revoke_confirm: 'mcp_access_token_revoke_confirm',
	mcp_access_token_revoked: 'mcp_access_token_revoked',
	mcp_access_token_revoke_failed: 'mcp_access_token_revoke_failed',
} as const;

export type McpInstructionTranslationKeys = (typeof McpInstructionTranslationKeys)[keyof typeof McpInstructionTranslationKeys];
