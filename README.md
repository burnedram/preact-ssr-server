# Preact component render server

> ✨ Bootstrapped with Create Snowpack App (CSA).

This toy-project aims to create a transparent Preact render server.  
By leveraging the capabilities of Snowpack's and Preact's server-side rendering capabilites, it is possible to render specific components on our server.  
These can then be used by upstream frameworks to interleave static content with dynamic Preact components.

## What's implemented

### Individual server-side rendered components

Components are server-side rendered by using the `/render/` endpoint.

Example: View the original bootstrapped application by visiting  
[/render/dist/App.js](http://localhost:8081/render/dist/App.js)
with the server running.

Tip: Add an `export` query parameter to specify which exported component to render. By default the `default` export is used.

Example: View the `SimpleFunctionProps` component by visiting  
[Simple.js?export=SimpleFunctionProps](http://localhost:8081/render/dist/Simple.js?export=SimpleFunctionProps)
with the server running.

### Client-side hydration

Components rendered by the `/render/` endpoint are hydrated by `index.ts` on the client by leveraging dynamic `import()`s.

### Component properties

Component properties are correctly used when server-side rendering, and when hydrating on the client.  
Properties can be defined by either using query parameters on `GET` requests, or by JSON on `POST` requests.

Example: Change the `message` property of the `SimpleClassProps` component by visiting  
[Simple.js?message=Hello world!](http://localhost:8081/render/dist/Simple.js?message=Hello%20world!)
with the server running.

Note: Due to the `export` query parameter being used for a specific purpose,  
you must pass properties containing `export` via a JSON `POST` request.

### Basic module and CSS preloading

A HTTP `Link` header is generated hinting the browser to preload the component's module and CSS.  
`index.js` is also present in the header, as it is required for hydration.

## What's left to implement

### Module dependency tree preloading

Although `rel="modulepreload"` might trigger a preload of the complete dependency tree, this is up to the browser.  
We could use `es-module-lexer` or something similair to generate of flat list of all dependencies.  
Unclear if this would work for CSS.

### Remove .css.proxy.js files

We want CSS to be loaded from the original source files, not injected by JavaScript on the client side.  
Will probably need some kind of Snowpack plugin that removes `.css.proxy.js` files and all related imports.

### Break free from SnowpackDevServer

In theory, we should only need the output from `npm run build` to do server-side rendering.  
However, SnowpackDevServer does come with very many nice things, such as handling imports in a NodeJS environment.  
SnowpackDevServer also exposes components' CSS files for us.

### Redux

Not yet tested, but we will probably have to handle server-side changes on the store so that they are propagated to the client.

## Available Scripts

### npm run server

Runs the server-side renderer server on port `8081`.  
Currently, Snowpack's dev server also runs along side it on port `8080`, serving the same content as `npm start` does.

Test it out by using the `/render/` endpoint.

### npm run build

Builds the app for production to the `build/` folder.  
In the future, it will correctly bundle Preact in production mode and optimizes the build for the best performance.

### npm start

> This is somewhat broken currently, you won't get any content since `index.ts` doesn't render a `<App />` on the `root` element.

Runs the app in the development mode.
Open http://localhost:8080 to view it in the browser.

The page will reload if you make edits.
You will also see any lint errors in the console.

### npm test

> Don't expect this to work, or if it does it won't actually test anything as of now.

Launches the test runner in the interactive watch mode.
See the section about running tests for more information.
