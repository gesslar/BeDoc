const Logger = require('./logger');

class Registry {
  constructor(core) {
    this.core = core;
    this.logger = new Logger(core);
    this.parsers = {};  // Store parsers by language
    this.printers = {}; // Store printers by format
  }

  _testClass(input) {
    return (
      typeof input === "function" &&
      input.prototype &&
      Object.getOwnPropertyDescriptor(input, "prototype").writable === false
    );
  }

  // Validate required parameters
  _validateInput(input, type) {
    if(type === "class") {
      if(!this._testClass(input)) {
        throw new Error(`Invalid input: Expected a class but got ${typeof input}.`);
      }
    } else if(!input || typeof input !== type) {
      throw new Error(`Invalid input: Expected a ${type} but got ${typeof input}.`);
    }
  }

  // Register a parser for a specific language
  registerParser(meta, parser) {
    this._validateInput(parser, 'class');

    if(this.parsers[meta.language]) {
      throw new Error(`Parser for language "${meta.language}" is already registered.`);
    }
    this.parsers[meta.language] = parser;
    this.logger.debug(`Registered parser for language "${meta.language}".`);
  }

  // Register a printer for a specific format
  registerPrinter(meta, printer) {
    this._validateInput(printer, 'class');

    if(this.printers[meta.format]) {
      throw new Error(`Printer for format "${meta.format}" is already registered.`);
    }
    this.printers[meta.format] = printer;
    this.logger.debug(`Registered printer for format "${meta.format}".`);
  }

  // Retrieve a parser for a specific language
  getParser(language) {
    this._validateInput(language, 'string');
    return this.parsers[language] || null;
  }

  // Retrieve a printer for a specific format
  getPrinter(format) {
    this._validateInput(format, 'string');
    return this.printers[format] || null;
  }

  getParsers() {
    return this.parsers;
  }

  getPrinters() {
    return this.printers;
  }
}

module.exports = Registry;
