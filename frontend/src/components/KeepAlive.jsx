import React from 'react';

export default class KeepAlive extends React.Component {
  state = { visited: false };

  componentDidUpdate(prevProps) {
    if (this.props.active && !this.state.visited) {
      this.setState({ visited: true });
    }
  }

  render() {
    if (!this.state.visited && !this.props.active) return null;
    return (
      <div className={this.props.active ? '' : 'hidden'}>
        {this.props.children}
      </div>
    );
  }
}
