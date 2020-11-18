install:
	npm install

start:
	npm start

bin:
	npx babel-node src/bin/page-loader.js  https://ru.hexlet.io/courses

folder:
	npx babel-node src/bin/page-loader.js  --output test222/sdfgsdfg/sdfgs https://ru.hexlet.io/courses

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