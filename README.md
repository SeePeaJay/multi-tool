# multi-tool
The repo for [Multi-Tool](https://multi-tool.app/), an experimental personal note-taking application.

### Built With
* Typescript
* Vue
* TailwindCSS
* Node
* Express
* SQLite

## Project Setup - Frontend
0. make sure [Node](https://nodejs.org/en/), [npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm) and Vue are already installed.
1. run `npm install`

### Compile and Hot-Reload for Development
```sh
npm run dev
```

### Type-Check, Compile and Minify for Production
```sh
npm run build
```

### Run Unit Tests with [Vitest](https://vitest.dev/)
```sh
npm run test:unit
```

### Run End-to-End Tests with [Cypress](https://www.cypress.io/)
```sh
npm run test:e2e:dev
```

This runs the end-to-end tests against the Vite development server.
It is much faster than the production build.

But it's still recommended to test the production build with `test:e2e` before deploying (e.g. in CI environments):

```sh
npm run build
npm run test:e2e
```

### Lint with [ESLint](https://eslint.org/)
```sh
npm run lint
```

### Type Support for `.vue` Imports in TS
TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [TypeScript Vue Plugin (Volar)](https://marketplace.visualstudio.com/items?itemName=Vue.vscode-typescript-vue-plugin) to make the TypeScript language service aware of `.vue` types.

If the standalone TypeScript plugin doesn't feel fast enough to you, Volar has also implemented a [Take Over Mode](https://github.com/johnsoncodehk/volar/discussions/471#discussioncomment-1361669) that is more performant. You can enable it by the following steps:

1. Disable the built-in TypeScript Extension
   1) Run `Extensions: Show Built-in Extensions` from VSCode's command palette
   2) Find `TypeScript and JavaScript Language Features`, right click and select `Disable (Workspace)`
2. Reload the VSCode window by running `Developer: Reload Window` from the command palette.

### Customize configuration
See [Vite Configuration Reference](https://vitejs.dev/config/).

## Project Setup - Backend
0. make sure [Node](https://nodejs.org/en/), [npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm) are already installed.
1. run `npm install`

### Compile and Hot-Reload for Development
```
npm run dev
```

### Type-Check, Compile and Minify for Production
```
npm run build
```

### Run for Production (after building the frontend and backend)
```sh
npm run start
```
