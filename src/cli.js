#!/usr/bin/env node

(async() => {
  try {
    const { program } = require('commander');
    const Core = require('./core/core');
    const fs = require('fs');
    const packageJson = require('../package.json');
    const Environment = require('./core/env');

    program
      .name('bedoc')
      .description('Pluggable documentation engine for any language and format')
      .option('-l, --language <lang>', 'Language parser to use')
      .option('-f, --format <format>', 'Output format')
      .option('-i, --input <file>', 'Input file')
      .option('-d, --directory <dir>', 'Directory to process')
      .option('-e, --extension <ext>', 'File extension to filter by', '.c')
      .option('-o, --output [dir]', 'Output directory (optional, stdout if omitted)')
      .option('-m, --mock <path>', 'Use mock parsers and printers')
      .option('-lpa, --list-parsers', 'List available parsers')
      .option('-lpr, --list-printers', 'List available printers')
      .option(`--debug`, 'Enable debug mode', false)
      .version(packageJson.version, '-v, --version', 'Output version')
      .parse(process.argv);

    const options = program.opts();

    // Validate input options
    if(!options.input && !options.directory)
      throw new Error('You must specify either --input or --directory.');

    if(options.input && options.directory)
      throw new Error('You cannot specify both --input and --directory.');

    options.env = Environment.CLI;
    const core = new Core(options);

    if(options.input) {
      if(!Array.isArray(options.input))
        options.input = [options.input];
      const result = await core.processFiles(options);
      console.info(result);
    } else if(options.directory) {
      const result = await core.processDirectory(options);
      console.info(result);
    } else {
      throw new Error('No input or directory specified');
    }
  } catch(e) {
    console.error(`Error: ${e.message}`);
    console.error(e.stack);
    process.exit(1);
  }
})();
