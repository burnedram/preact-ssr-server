import { init, parse } from 'es-module-lexer';
import type { SnowpackPluginFactory } from 'snowpack';

/**
 * Creates a Snowpack plugin that removes all CSS related imports.
 * .css.proxy.js files will not be generated with this plugin.
 * However, server-side rendered components (using SnowpackDevServer.importModule()}}
 * will still be compiled with these CSS imports present.
 * This enables us to access ServerRuntimeModule.css,
 * containing a list of CSS imports.
 * @returns A SnowpackPluginFactory for this plugin
 */
const RemoveCssProxiesFactory: SnowpackPluginFactory<void> = function RemoveCssProxiesFactory() {
  return {
    name: 'RemoveCssProxies',
    async transform(options) {
      const { contents, isPackage, fileExt, isSSR } = options;

      // When isSSR is set we leave CSS proxies alone,
      // this allows our server to be notified about imported CSS
      // Don't bother with packages (node_modules)
      // We are only interested in code (.js)
      if (isSSR || isPackage || fileExt !== '.js') return;

      if (typeof contents !== 'string')
        throw new Error("Expected 'contents' to be typeof 'string'");

      await init;
      const [rawImports] = parse(contents);

      const imports = rawImports
        // Remove import.meta entries
        .filter((imp) => imp.d !== -2)
        // Remove actual dynamic imports (import(someVariable))
        // You can't blame us if you shoot yourself in the foot
        .filter((imp) => imp.n !== undefined)
        // We only care about css imports
        .filter((imp) => imp.n!.endsWith('.css'))
        // Sort them, probably already sorted but can't be to cautious
        .sort((leftImp, rightImp) => leftImp.ss - rightImp.ss);

      // No css imports, nothing to do
      if (imports.length === 0) return;

      let idx = 0;
      const transformedContents = imports
        .map((imp) => {
          const code = contents.substring(idx, imp.ss);

          // This is very crude, we actually need to parse the AST to fully cover
          // all possible ways a closing parenthesis or semicolon can be written
          // But that seems like too much work
          if (imp.d > -1) {
            idx = imp.se !== 0 ? imp.se : imp.e;
            // Remove closing parenthesis
            const parenMatch = contents.substring(idx).match(/^s*\)/);
            if (parenMatch !== null) idx += parenMatch[0].length;
          } else {
            idx = imp.se;
          }
          // Remove semicolon
          const semicolonMatch = contents.substring(idx).match(/^s*;/);
          if (semicolonMatch !== null) idx += semicolonMatch[0].length;

          return `${code}/* [remove-css-proxies] ${contents.substring(
            imp.ss,
            idx,
          )} */`;
        })
        .join('')
        .concat(contents.substring(idx));

      return transformedContents;
    },
  };
};

export default RemoveCssProxiesFactory;
