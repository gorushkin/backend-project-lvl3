install:
	npm install

start:
	npm start

bin:
	npx babel-node src/bin/page-loader.js  https://ru.hexlet.io/courses

prod:
	node dist/bin/page-loader.js --output /var/tmp https://ru.hexlet.io/courses

build:
	npm run build

lint:
	npx eslint .

.PHONY: test