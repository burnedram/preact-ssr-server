import { Component, h, Ref } from 'preact';
import type { FunctionComponent } from 'preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';

import './Simple.css';

type SimpleProps = {
  message: string;
  append: string;
};

type SimpleState = {
  message: string;
};

export const SimpleFunctionProps: FunctionComponent<SimpleProps> = function SimpleFunctionProps(
  props,
) {
  const [state, setState] = useState<SimpleState>({ message: props.message });
  const [ref, setRef] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (ref !== null) {
      console.log('Function component mounting', ref);
      ref.style.background = 'turquoise';
    }
    return () => {
      if (ref !== null) {
        console.log('Function component unmounting', ref);
        ref.style.background = '';
      }
    };
  }, [ref, setRef]);
  return (
    <div ref={setRef}>
      This is a <i>functional</i> component: {state.message}
      <button
        onClick={() => setState({ message: `${state.message}${props.append}` })}
      >
        click me
      </button>
    </div>
  );
};
SimpleFunctionProps.defaultProps = {
  message: 'Default message',
  append: '.',
};

export class SimpleClassProps extends Component<SimpleProps, SimpleState> {
  static defaultProps = {
    message: 'Default message',
    append: '.',
  };

  constructor(props: SimpleProps) {
    super(props);
    this.state = {
      message: this.props.message,
    };
  }

  ref: HTMLDivElement | null = null;
  setRef = (ref: HTMLDivElement | null) => (this.ref = ref);

  render() {
    return (
      <div ref={this.setRef}>
        This is a <i>class</i> component: {this.state.message}
        <button
          onClick={() =>
            this.setState({
              message: `${this.state.message}${this.props.append}`,
            })
          }
        >
          click me
        </button>
        <SimpleFunctionProps
          message="And i'm nested!"
          append="+"
        ></SimpleFunctionProps>
      </div>
    );
  }

  componentDidMount() {
    console.log('componentDidMount', this.ref);
    // Stupid side effect, but it get componentDidMount() across.
    if (this.ref !== null) this.ref.style.background = 'beige';
  }

  componentWillUnmount() {
    console.log('componentWillUnmount', this.ref);
    if (this.ref !== null) this.ref.style.background = '';
  }
}

export default SimpleClassProps;
