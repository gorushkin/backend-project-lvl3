install:
	npm install

build:
	npm run build

test:
	npm test

debug:
	npm run testdebug

test-coverage:
	npm test -- --coverage

publish:
	npm publish --dry-run

lint:
	npx eslint .

.PHONY: test