import { Component, h } from 'preact';
import type { FunctionComponent } from 'preact';
import { useState } from 'preact/hooks';

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
  return (
    <div>
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
    this.setState({
      message: this.props.message,
    });
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
}

export default SimpleClassProps;
