module.exports = {
	'env': {
		'browser': true,
		'es2021': true,
		'node': true
	},
	'extends': [
		'eslint:recommended',
		'plugin:@typescript-eslint/recommended',
		'plugin:react/recommended'
	],
	'overrides': [
		{
			'env': {
				'node': true
			},
			'files': [
				'.eslintrc.{js,cjs}'
			],
			'parserOptions': {
				'sourceType': 'script'
			}
		}
	],
	'parser': '@typescript-eslint/parser',
	'parserOptions': {
		'ecmaVersion': 'latest',
		'sourceType': 'module'
	},
	'plugins': [
		'@typescript-eslint',
		'react',
		'react-native',
		'unused-imports'
	],
	'rules': {
		'react/jsx-filename-extension': [1, { 'extensions': ['.js', '.jsx'] }],
		'indent': ['error', 'tab'],
		'react/no-unused-prop-types': 'error',
		'react/no-access-state-in-setstate': 'error',
		'react/prop-types': 'error',
		'react/no-array-index-key': 'error',
		'camelcase': 'warn',
		'keyword-spacing': 'error',
		// enforce a space before function parentheses
		'space-before-function-paren': ['error', 'always'],

		// enforce a space before blocks (opening curly braces)
		'space-before-blocks': ['error', 'always'],
		'max-len': ['error', { 'code': 80, 'ignoreUrls': true }],
		'quotes': ['error', 'single'],
		'sort-imports': 'error',
		'no-unused-vars': 'off', // or "@typescript-eslint/no-unused-vars": "off",
		'unused-imports/no-unused-imports': 'error',
		'unused-imports/no-unused-vars': [
			'warn',
			{
				'vars': 'all',
				'varsIgnorePattern': '^_',
				'args': 'after-used',
				'argsIgnorePattern': '^_',
			},
		],
		'padded-blocks': ['error', 'never'],
		'react/jsx-wrap-multilines': ['error', {
			'declaration': 'parens-new-line',
			'assignment': 'parens-new-line',
			'return': 'parens-new-line',
			'arrow': 'parens-new-line',
			'condition': 'parens-new-line',
			'logical': 'parens-new-line',
			'prop': 'parens-new-line'
		}],
		'react/jsx-max-props-per-line': ['error', { 'maximum': 1, 'when': 'multiline' }],
		'react/jsx-closing-bracket-location': ['error', 'tag-aligned'],
		'react/jsx-closing-tag-location': 'error',
	}
}
