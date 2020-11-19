install:
	npm install


bin:
	node src/bin/page-loader.js  https://ru.simplesite.com/

temp:
	node src/bin/page-loader.js  --output /tmp/gorushkin https://ru.simplesite.com/

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