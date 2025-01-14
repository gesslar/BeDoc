export const LoggerColors = {
  debug: [
    "\x1b[38;5;19m",  // Debug level 0: Dark blue
    "\x1b[38;5;27m",  // Debug level 1: Medium blue
    "\x1b[38;5;33m",  // Debug level 2: Light blue
    "\x1b[38;5;39m",  // Debug level 3: Teal
    "\x1b[38;5;51m",  // Debug level 4: Bright cyan
  ],
  info: "\x1b[32m",  // Green
  warn: "\x1b[33m",  // Yellow
  error: "\x1b[31m", // Red
  reset: "\x1b[0m",  // Reset
}
