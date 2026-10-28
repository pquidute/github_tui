// The entry point connects our React component tree to the terminal.
import { render } from "ink";
import App from "./App.js";

// Keyboard input needs a real terminal: a pipe cannot press the arrow keys.
if (!process.stdin.isTTY) {
  console.error(
    "GitHub TUI needs an interactive terminal. Run npm start in your shell.",
  );
  process.exitCode = 1;
} else {
  // Ink owns rendering and terminal cleanup, including restoring the cursor.
  const app = render(<App />);
  try {
    await app.waitUntilExit();
  } finally {
    // Ink has restored terminal modes by this point. Clear the rendered app
    // and scrollback, then leave a single final line for the shell prompt.
    process.stdout.write("\x1b[2J\x1b[3J\x1b[Hbye.\n");
  }
}
