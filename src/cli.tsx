#!/usr/bin/env node
import { render } from 'ink';
import App from './app.js';

// For CLI Options and Arguments, use meow:
// import meow from 'meow';
//
// const cli = meow(
// 	`
// 	Usage
// 	  $ myApp
//
// 	Examples
// 	  $ myApp
// `,
// 	{
// 		importMeta: import.meta,
// 		flags: {
// 			// name: {
// 			// 	type: 'string',
// 			// },
// 		},
// 	},
// );

render(<App />);

