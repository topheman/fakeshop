# FakeShop

FakeShop is a demo e-commerce website built with Next.js 15, where I
test the latest features of the framework, like React Server Components,
server actions, streaming, and progressive enhancement.

[👀 Checkout the live demo](https://thefakeshop.vercel.app).

[👨‍💻 Read the article I wrote on dev.to for more details about the project](https://dev.to/topheman/react-server-components-in-practice-building-a-fake-e-commerce-site-with-nextjs-15-latest-features-73p).

## Installation

```bash
# Since using react 19, some packages have not yet extended there range of supported versions.
# We need to install all the packages with the --force flag.
npm install --force
```

## Running

- dev mode: `npm run dev`
- production mode: `npm run build && npm run start`

Go to [http://localhost:3000](http://localhost:3000) to see the app running.

## Notes

- If you are using VSCode, the project is already configured to format the code on save using Eslint and Prettier.
- Precommit hooks are configured to run linting, formatting, tests and typechecking on the modified files.
