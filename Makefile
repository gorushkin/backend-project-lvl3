install:
	npm install

start:
	npm start

bin:
	npx babel-node src/bin/page-loader.js  https://ru.hexlet.io/courses

build:
	npm run build

test:
	npm test

publish:
	npm publish --dry-run

lint:
	npx eslint .

.PHONY: test