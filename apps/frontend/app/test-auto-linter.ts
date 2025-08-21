// Test file to demonstrate auto-linting workflow
export const TestFunction = (param1: string, param2: number) => {
	const badFormatting = param1 + 'test';
	const result = {
		value: param2,
		message: badFormatting,
	};
	return result;
};
