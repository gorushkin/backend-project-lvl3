install:
	npm install

build:
	npm run build

test:
	npm test

test-coverage:
	npm test -- --coverage

publish:
	npm publish --dry-run

lint:
	npx eslint .

.PHONY: test