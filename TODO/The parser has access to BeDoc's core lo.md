The parser has access to BeDoc's core logging utilities through `this.log`.
There are four logging functions available:

- `this.log.debug(string[, ...arg])`: Debug messages
  ```javascript
  async parse(file, content) {
    this.log.debug("This will only show in debug mode")
  }

  // [BeDoc] Debug: This will only show in debug mode
  ```
- `this.log.info(string[, ...arg])`: Informational messages
  ```javascript
  async parse(file, content) {
    this.log.info("A wild Happy Fun Ball has appeared.")
  }

  // [BeDoc] Info: A wild Happy Fun Ball has appeared.
  ```
- `this.log.warn(string[, ...arg])`: Warning messages
  ```javascript
  async parse(file, content) {
    this.log.warn("Do not taunt Happy Fun Ball.")
  }

  // [BeDoc] Warn: Do not taunt Happy Fun Ball.
  ```
- `this.log.error(string[, ...arg])`: Error messages
  ```javascript
  async parse(file, content) {
    this.log.error("You have been eaten by Happy Fun Ball. 🙀")
  }

  // [BeDoc] Error: You have been eaten by Happy Fun Ball. 🙀
  ```
