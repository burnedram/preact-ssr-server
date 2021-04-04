const { loadConfiguration, startServer } = require('snowpack');
const express = require('express');

const isDev = true;

async function main() {
  // Start a SnowpackDevServer, building files on the fly
  const config = await loadConfiguration(
    {
      devOptions: {
        port: 0, // Don't start a HTTP server for SnowpackDevServer
      },
    },
    'snowpack.config.js',
  );
  const snowpackServer = await startServer(
    { config, lockfile: null },
    {
      isDev: isDev,
      isWatch: isDev,
    },
  );
  const runtime = snowpackServer.getServerRuntime();

  async function importPackage(package) {
    const url = await snowpackServer.getUrlForPackage(package);
    const module = await runtime.importModule(url);
    return module;
  }

  // "import" { h } from 'preact';
  // This is not strictly necessary, a normal
  // const { h } = require('preact');
  // also works, but why import it twice :)
  const preact = await importPackage('preact');
  const h = preact.exports.h;

  // "import" render from 'preact-render-to-string';
  // This is necessary, as a normal
  // const render = require('preact-render-to-string');
  // doesn't work for some strange arcane reason.
  const preactRenderToString = await importPackage('preact-render-to-string');
  const render = preactRenderToString.exports.default;

  const app = express();
  app.use(express.json());

  app.use('/render/:module(*)', async (req, res) => {
    let props = null;
    if (req.method === 'GET') {
      props = { ...req.query };
      delete props.export;
      if (Object.keys(props).length === 0) props = null;
    } else if (req.method === 'POST') {
      if (!req.is('application/json')) {
        res.status(400).json({
          error: {
            message: `Content-Type '${req.header(
              'Content-Type',
            )}' is not 'application/json'`,
          },
        });
        return;
      }
      props = req.body;
    } else {
      res.status(405).json({
        error: {
          message: `Method '${req.method}' is neither 'GET' nor 'POST'`,
        },
      });
      return;
    }
    console.log('props:', props);

    const moduleUrl = `/${req.params.module}`;
    console.log('moduleUrl:', moduleUrl);
    if (!moduleUrl) {
      res.status(400).json({
        error: {
          message: 'Please specify a module',
        },
      });
    }

    const moduleExport = req.query.export ?? 'default';
    console.log('moduleExport:', moduleExport);
    if (typeof moduleExport !== 'string') {
      res.status(400).json({
        error: {
          message: "Query parameter 'export' must be a string",
        },
      });
      return;
    }

    // Server-side import our React component
    let componentModule;
    try {
      componentModule = await runtime.importModule(moduleUrl);
    } catch (error) {
      if (error.constructor?.name === 'NotFoundError') {
        res.status(404).json({ error: { message: error.message } });
      } else {
        console.error(error);
        res
          .status(500)
          .json({ error: { message: error.message, stack: error.stack } });
      }
      return;
    }

    if (!(moduleExport in componentModule.exports)) {
      res.status(404).json({
        error: { message: `'${moduleUrl}' does not export '${moduleExport}'` },
      });
      return;
    }
    const component = componentModule.exports[moduleExport];

    if (!(component instanceof Component) && typeof component !== 'function') {
      res.status(404).json({
        error: { message: `'${moduleUrl}#${moduleExport}' is not a component` },
      });
      return;
    }

    // Render your react component to HTML
    const renderedHtml = render(h(component, props));

    // The Link header is not really supported by browsers, except with
    // rel="prefetch", rel="preload" and rel="modulepreload".
    // This is a shame, but we will hijack this header to indicate external resources
    // that will need to be injected in the <head> by the upstream server.
    res.links({ prefetch: '/dist/index.css', stylesheet: '/dist/index.css' });
    console.log('css:', componentModule.css);
    if (componentModule.css) {
      componentModule.css.forEach((css) =>
        res.links({ prefetch: css, stylesheet: css }),
      );
    }

    let links = res.get('Link') || '';
    if (links) links += ', ';
    links += '</dist/index.js>; rel="modulepreload"; async';
    if (links) links += ', ';
    links += `<${moduleUrl}>; rel="modulepreload"; async`;
    res.set('Link', links);

    // ExpressJS is dumb and doesn't default to utf-8 when using .write()
    res.contentType('text/html; charset=utf-8');

    res.send(`<head>
  <script type="module" src="/dist/index.js" async></script>
</head>

<body>
  <h3>This h3 is static content</h3>
  <div>
    <script type="application/json" data-module="${moduleUrl}"${
      moduleExport === 'default' ? '' : ` data-export="${moduleExport}"`
    }>${JSON.stringify(props)}</script>
    ${renderedHtml}
  </div>
</body>`);
  });

  // We could serve statically built files, but for now
  // simply forward 'normal' requests to snowpack.
  //app.use('/', express.static('build'));
  app.use('/', snowpackServer.handleRequest);

  app.listen(8080, '127.0.0.1', () => {
    console.log('Server running at http://127.0.0.1:8080');
  });
}

main();
