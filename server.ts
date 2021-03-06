import { loadConfiguration, ServerRuntimeModule, startServer } from 'snowpack';
import * as express from 'express';

import { Component } from 'preact';
import type preactType from 'preact';
import type * as preactRenderToStringType from 'preact-render-to-string';

type ComponentModule = {
  [index: string]: preactType.ComponentType<any>;
};

interface Import {
  url: string;
  imports?: Import[];
}

const isDev = true;

async function main() {
  // Start a SnowpackDevServer, building files on the fly
  const config = await loadConfiguration(
    {
      devOptions: {
        // Don't start a HTTP server for SnowpackDevServer
        port: 0,

        // Disable HMR, won't work with our custom code
        // Also disables @prefresh/snowpack (https://github.com/JoviDeCroock/prefresh/blob/ba56343d001adf649d4816f9919fcc9e0af85579/packages/snowpack/src/index.js#L17)
        // Disabling prefresh is kind of important, as it would otherwise
        // create multiple transform() steps for our .css.proxy.js remover plugin
        hmr: false,
      },
      plugins: ['./remove-css-proxies.ts'],
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

  async function importPackage<T>(
    pkg: string,
  ): Promise<ServerRuntimeModule<T>> {
    const url = await snowpackServer.getUrlForPackage(pkg);
    const module = await runtime.importModule<T>(url);
    return module;
  }

  // "import" { h } from 'preact';
  // This is not strictly necessary, a normal
  // const { h } = require('preact');
  // also works, but why import it twice :)
  const preact = await importPackage<typeof preactType>('preact');
  const h = preact.exports.h;

  // "import" render from 'preact-render-to-string';
  // This is necessary, as a normal
  // const render = require('preact-render-to-string');
  // doesn't work for some strange arcane reason.
  const preactRenderToString = await importPackage<
    typeof preactRenderToStringType
  >('preact-render-to-string');
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
    if (!req.params.module) {
      res.status(400).json({
        error: {
          message: 'Please specify a module',
        },
      });
      return;
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
    let componentModule: ServerRuntimeModule<ComponentModule>;
    try {
      componentModule = await runtime.importModule<ComponentModule>(moduleUrl);
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
    let indexComponentModule: ServerRuntimeModule<ComponentModule>;
    try {
      indexComponentModule = await runtime.importModule<ComponentModule>(
        '/dist/index.js',
      );
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
    const css = new Set([...indexComponentModule.css, ...componentModule.css]);
    console.log('css:', css);
    css.forEach((css) => res.links({ prefetch: css }));

    const loadImportTree: (url: string) => Promise<Import> = async (url) => {
      const { imports } = await snowpackServer.loadUrl(url, {
        isSSR: true,
        encoding: 'utf-8',
      });
      if (imports.length === 0) return { url };
      return {
        url,
        imports: await Promise.all(
          imports
            // We don't use CSS proxies (remove-css-proxies.ts)
            .filter((imp) => !imp.specifier.endsWith('.css.proxy.js'))
            .map(async (imp) => await loadImportTree(imp.specifier)),
        ),
      };
    };
    const getTreeLayers: (nodes: Import[]) => String[][] = (nodes) => {
      const urls = nodes.map((node) => node.url);
      const imports = nodes.flatMap((node) => node.imports ?? []);
      if (imports.length === 0) return [urls];
      return [urls, ...getTreeLayers(imports)];
    };
    const removeDuplicatesInLayers: (layers: String[][]) => Set<String>[] = (
      layers,
    ) => {
      const all = new Set<String>();
      const wut = layers
        .map((layer) => {
          const layerSet = new Set(layer.filter((node) => !all.has(node)));
          layerSet.forEach((node) => all.add(node));
          return layerSet;
        })
        .filter((layer) => layer.size > 0);
      return wut;
    };

    const moduleTree = await loadImportTree(moduleUrl);
    const indexTree = await loadImportTree('/dist/index.js');
    const moduleLayers = getTreeLayers([indexTree, moduleTree]);
    const uniqueModulesLayers = removeDuplicatesInLayers(moduleLayers);
    const modules = uniqueModulesLayers.flatMap((layer) => [...layer]);
    console.log('modules:', modules);
    modules.forEach((module) => res.links({ modulepreload: module }));

    // ExpressJS is dumb and doesn't default to utf-8 when using .write()
    res.contentType('text/html; charset=utf-8');

    res.send(`<head>
  <script type="module" src="/dist/index.js" async></script>
  ${[...css]
    .map((stylesheet) => `<link rel="stylesheet" href="${stylesheet}">`)
    .join('\n  ')}
</head>

<body>
  <h3>This h3 is static content</h3>
  <div>
    <script type="application/json" data-module="${moduleUrl}"${
      moduleExport === 'default' ? '' : ` data-export="${moduleExport}"`
    }>${(props && JSON.stringify(props)) ?? ''}</script>
    ${renderedHtml}
  </div>
</body>`);
  });

  // We could serve statically built files, but for now
  // simply forward 'normal' requests to snowpack.
  //app.use('/', express.static('build'));
  app.use('/', async (req, res) => {
    await snowpackServer.handleRequest(req, res);
  });

  app.listen(8080, '127.0.0.1', () => {
    console.log('Server running at http://127.0.0.1:8080');
  });
}

main();
