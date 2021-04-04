import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import logo from './logo.png';
import './App.css';
import SimpleClassProps from './Simple';

function App() {
  // Create the count state.
  const [count, setCount] = useState(0);
  // Create the counter (+1 every second).
  useEffect(() => {
    const timer = setTimeout(() => setCount(count + 1), 1000);
    return () => clearTimeout(timer);
  }, [count, setCount]);

  const [show, setShow] = useState(true);

  // Return the App component.
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.jsx</code> and save to reload.
        </p>
        <p>
          Page has been open for <code>{count}</code> seconds.
        </p>
        <p>
          <a
            className="App-link"
            href="https://preactjs.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Learn Preact
          </a>
        </p>
        {show ? <SimpleClassProps message="no ssr"></SimpleClassProps> : null}
        <label>Show SimpleClassProps</label>
        <input
          type="checkbox"
          checked={show}
          onChange={(e) => setShow(e.currentTarget.checked)}
        />
      </header>
    </div>
  );
}

export default App;
