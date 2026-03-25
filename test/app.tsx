import test from 'ava';
import { render } from 'ink-testing-library';
import App from '../src/app.js';

test('renders default text', t => {
	const {lastFrame} = render(<App />);
	t.is(lastFrame(), 'TODO: Build App');
});
