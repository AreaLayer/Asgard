// const client_lib = require("client");
// console.log(client_lib);
// console.log(client_lib.helloWorld());
// import 'hello_world';

// const addon = require("hello_world");
// console.log(addon);
// console.log(addon.helloWorld());

import React from 'react';
import Header from '../components/header'
import Body from '../components/body'

import './App.css';

class App extends React.Component {
  render() {
    return (
      <div className="App">
        <Header />
        <Body />
      </div>
    );
  }
}

export default App;
