import {test} from 'node:test';
import assert from 'node:assert/strict';
import {clipboardSequence, installInfo} from '../src/ghInstall.js';

test('shows a platform-specific install command and an official guide', () => {
  assert.equal(installInfo('linux', 'ID=ubuntu\nID_LIKE=debian').command, 'sudo apt update && sudo apt install gh');
  assert.equal(installInfo('linux', 'ID=fedora').command, 'sudo dnf install gh');
  assert.equal(installInfo('linux', 'ID=arch').command, 'sudo pacman -S github-cli');
  assert.equal(installInfo('darwin').command, 'brew install gh');
  assert.equal(installInfo('win32').command, 'winget install --id GitHub.cli');
  assert.match(installInfo('linux', 'ID=unknown').guide, /^https:\/\/cli\.github\.com/);
});

test('clipboard request encodes only the selected command', () => {
  assert.equal(clipboardSequence('brew install gh'), '\x1b]52;c;YnJldyBpbnN0YWxsIGdo\x07');
});
