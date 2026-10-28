import {test} from 'node:test';
import assert from 'node:assert/strict';
import {companionFrame} from '../src/Companion.js';

test('block robot changes pixels for navigation and app state', () => {
  assert.equal(companionFrame('idle', null, 1).split('\n')[1], '  ▄███▄  ');
  assert.match(companionFrame('idle', 'left', 1), /█ ▄/);
  assert.match(companionFrame('idle', 'right', 1), /▄ █/);
  assert.match(companionFrame('busy', null, 1), /  █▄ ██  /);
  assert.match(companionFrame('error', null, 1), /  █▀▄▀█  /);
  assert.match(companionFrame('success', null, 1), /  ██ ██  /);
  assert.match(companionFrame('idle', null, 1), /^[\s▄▀█]+$/u);
  assert.notEqual(companionFrame('idle', null, 1), companionFrame('idle', null, 2));
});
