install:
	npm ci

test:
	npm test

debug:
	npm run test:debug

bin2:
	node bin/page-loader.js -o temp https://gorushkin.github.io/testSite/second/

bin3:
	node bin/page-loader.js -o temp https://ru.simplesite.com/

test-coverage:
	npm test -- --coverage

publish:
	npm publish --dry-run

lint:
	npx eslint .

.PHONY: test