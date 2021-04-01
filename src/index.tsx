import { h, render, hydrate } from 'preact';
import 'preact/devtools';
import App from './App.js';
import './index.css';

const main = () => {
  const root = document.getElementById('root')
  if (root) {
    if ('ssr' in root.dataset) {
      console.log('Hydrating...');
      hydrate(<App /> , root);
    } else {
      render(<App />, root);
    }
  }
}

if (document.readyState === 'loading') {
  main();
} else {
  const onReadyStateChanged = () => {
    document.removeEventListener('readystatechange', onReadyStateChanged);
    main();
  };
  document.addEventListener('readystatechange', onReadyStateChanged);
}
