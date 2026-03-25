import test from 'ava';
import { render } from 'ink-testing-library';
import App from '../src/app.js';

test('renders solitaire game board', (t) => {
	const {lastFrame, unmount} = render(<App />);
	const frame = lastFrame() ?? '';

	t.true(frame.includes('Solitaire'), 'should show game title');
	t.true(frame.includes('Moves:'), 'should show move counter');
	t.true(frame.includes('Stock'), 'should show stock pile');
	t.true(frame.includes('Waste'), 'should show waste pile');
	t.true(frame.includes('quit'), 'should show controls');

	unmount();
});

test('renders all 7 tableau columns', (t) => {
	const {lastFrame, unmount} = render(<App />);
	const frame = lastFrame() ?? '';

	for (let i = 1; i <= 7; i++) {
		t.true(frame.includes(String(i)), `should show column ${String(i)}`);
	}

	unmount();
});

test('renders foundation suit labels', (t) => {
	const {lastFrame, unmount} = render(<App />);
	const frame = lastFrame() ?? '';

	t.true(frame.includes('♥'), 'should show hearts');
	t.true(frame.includes('♦'), 'should show diamonds');
	t.true(frame.includes('♣'), 'should show clubs');
	t.true(frame.includes('♠'), 'should show spades');

	unmount();
});
