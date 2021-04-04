import { h, render, hydrate, Component } from 'preact';
import type { ComponentType } from 'preact';
import 'preact/devtools';
import './index.css';

const main = async () => {
  const scriptComponents = document.querySelectorAll<HTMLScriptElement>(
    "script[type='application/json'][data-module]",
  );
  for (const scriptComponent of scriptComponents) {
    const componentUrl = scriptComponent.dataset['module'];
    if (componentUrl === undefined) {
      console.error(
        'Missing module\nAssociated script element:',
        scriptComponent,
      );
      throw new Error('Missing module');
    }

    const componentExport = scriptComponent.dataset['export'] ?? 'default';

    const componentElement = scriptComponent.nextElementSibling;
    if (componentElement === null) {
      console.error(
        `'${componentUrl}#${componentExport}' has nothing to hydrate\nAssociated script element:`,
        scriptComponent,
      );
      throw new Error(
        `'${componentUrl}#${componentExport}' has nothing to hydrate`,
      );
    }

    const componentParent = componentElement.parentElement;
    if (componentParent === null) {
      console.error(
        `'${componentUrl}#${componentExport}' is an orphan :(\nAssociated script element:`,
        scriptComponent,
      );
      throw new Error(`'${componentUrl}#${componentExport}' is an orphan :(`);
    }

    let componentModule: { [index: string]: ComponentType<any> };
    try {
      componentModule = await import(componentUrl);
    } catch (error) {
      console.error(
        `Could not import '${componentUrl}'\nAssociated script element:`,
        scriptComponent,
      );
      throw error;
    }
    const component = componentModule[componentExport];
    if (component === undefined) {
      console.error(
        `'${componentUrl}' does not export '${componentExport}'\nAssociated script element:`,
        scriptComponent,
        '\nAssociated module:',
        componentModule,
      );
      throw new Error(`'${componentUrl}' does not export '${componentExport}'`);
    }

    if (!(component instanceof Component) && typeof component !== 'function') {
      console.error(
        `'${componentUrl}#${componentExport}' is not a component\nAssociated script element:`,
        scriptComponent,
        '\nAssociated module:',
        componentModule,
      );
      throw new Error(
        `'${componentUrl}#${componentExport}' is not a component`,
      );
    }

    const props = JSON.parse(scriptComponent.innerHTML);
    scriptComponent.remove();

    if (componentParent.childElementCount !== 1) {
      console.warn(
        `'${componentUrl}#${componentExport}' has siblings, falling back to 'render'\nAssociated script element:`,
        scriptComponent,
      );
      render(h(component, props), componentParent, componentElement);
    } else {
      hydrate(h(component, props), componentParent);
    }
  }
};

if (document.readyState === 'loading') {
  //main();
} else {
  const onReadyStateChanged = () => {
    document.removeEventListener('readystatechange', onReadyStateChanged);
    //main();
  };
  document.addEventListener('readystatechange', onReadyStateChanged);
}

const hydrateBtn = document.createElement('button');
hydrateBtn.onclick = () => {
  hydrateBtn.remove();
  main();
};
hydrateBtn.appendChild(document.createTextNode('Hydrate'));
document.body.appendChild(hydrateBtn);
