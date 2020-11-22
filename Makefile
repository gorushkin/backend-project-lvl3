install:
	npm install

build:
	npm run build

test:
	npm test

bin:
	node src/bin/page-loader.js --output temp https://gorushkin.github.io/testSite/second

test-coverage:
	npm test -- --coverage

publish:
	npm publish --dry-run

lint:
	npx eslint .

.PHONY: test