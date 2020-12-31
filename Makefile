install:
	npm ci

test:
	npm test

debug:
	npm run test:debug

test-coverage:
	npm test -- --coverage

publish:
	npm publish --dry-run

lint:
	npx eslint .

.PHONY: test