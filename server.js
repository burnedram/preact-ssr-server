const { loadConfiguration, startServer } = require('snowpack');
const express = require('express');

const isDev = true;

function addLinkHeader(res, links) {
  let header = res.get('Link') || '';
  links.forEach
  if (header) header += ', ';
  header += '</dist/index.js>; rel="script"; async';
  res.set('Link', header);
}

async function main() {
  // Start a SnowpackDevServer, building files on the fly
  const config = await loadConfiguration({}, 'snowpack.config.js');
  const snowpackServer = await startServer({ config, lockfile: null },
    {
      isDev: isDev,
      isWatch: isDev,
    });
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

  app.use('/render/:module(*)', async (req, res) => {
    const moduleUrl = `/${req.params.module}`;
    // Server-side import our React component
    let importedComponent;
    try {
      importedComponent = await runtime.importModule(moduleUrl);
    } catch (error) {
      if (error.constructor?.name === "NotFoundError") {
        res.status(404).send({ error: { message: error.message } });
      } else {
        console.error(error);
        res.status(500).send({ error: { message: error.message, stack: error.stack }});
      }
      return;
    }

    const moduleExport = req.query.export ?? 'default';
    if (!(moduleExport in importedComponent.exports)) {
        res.status(404).send({ error: { message: `${moduleUrl} does not export ${moduleExport}` } });
        return;
    }
    const MyReactComponent = importedComponent.exports[moduleExport];
    // Render your react component to HTML
    const renderedHtml = render(h(MyReactComponent, null));

    // The Link header is not really supported by browsers, except with rel="prefetch".
    // This is a shame, but we will hijack this header to indicate external resources
    // that will need to be injected by Django.
    res.links({ stylesheet: '/dist/index.css' });
    if (importedComponent.css) {
      importedComponent.css.forEach(css => res.links({ stylesheet: css }));
    }

    let links = res.get('Link') || '';
    if (links) links += ', ';
    links += '</dist/index.js>; rel="script"; async';
    res.set('Link', links);

    res.write('<div id="root" data-ssr>');
    res.write(renderedHtml);
    res.write('</div>');
    res.end();
  });

  //app.use('/', express.static('build'));
  app.use('/', snowpackServer.handleRequest);

  app.listen(8081, '127.0.0.1', () => {
    console.log('Server running at http://127.0.0.1:8081');
  });
}

main();