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
      func {state.message}
      <button
        onClick={() => setState({ message: `${state.message}${props.append}` })}
      >
        click me
      </button>
    </div>
  );
};
SimpleFunctionProps.defaultProps = {
  message: 'Tjenna',
  append: '_',
};

export class SimpleClassProps extends Component<SimpleProps, SimpleState> {
  static defaultProps = {
    message: 'Tjenna',
    append: '_',
  };

  constructor(props: SimpleProps) {
    super(props);
    this.setState({
      message: this.props.message,
    });
  }

  render() {
    return (
      <div>
        class {this.state.message ?? 'Tjenna'}
        <button
          onClick={() =>
            this.setState({
              message: `${this.state.message}${this.props.append}`,
            })
          }
        >
          click me
        </button>
        <SimpleFunctionProps message="nä" append="+"></SimpleFunctionProps>
      </div>
    );
  }

  componentDidMount() {
    console.log('mount');
    this.setState({ message: this.state.message + ' ~mounted~' });
  }
}

export default SimpleClassProps;
