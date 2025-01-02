import fs from "fs";
import Logger from "./logger.js";
import DataUtil from "./util/data.js";
import FileUtil from "./util/fd.js";

const HOOK_TYPES = Object.freeze({
  PRINT: "print",
  PARSE: "parse",
});

const PRINT_HOOKS = Object.freeze({
  START: "start",
  SECTION_LOAD: "load",
  ENTER: "enter",
  EXIT: "exit",
  END: "end",
});

const PARSE_HOOKS = Object.freeze({
});

class HookManager {
  constructor(core) {
    this.core = core;
    this.logger = new Logger();
    this.dataUtil = new DataUtil();
    this.fileUtil = new FileUtil();
    this.hooks = new Map();
  }

  getObjectType(that) {
    if(that.constructor.name === "Printer")
      return HOOK_TYPES.PRINT;
    else if(that.constructor.name === "Parser")
      return HOOK_TYPES.PARSE;
    else
      throw new Error(`[attachHooks] Unknown object type: ${that.constructor.name}`);
  }

  getHooks(type) {
    return this.hooks.get(type) || new Map();
  }

  attachHooks(that) {
    const type = this.getObjectType(that);
    this.logger.debug(`[attachHooks] Type: ${type}`);
    this.logger.debug(`[attachHooks] Hooks: ${JSON.stringify(this.hooks)}`);
    const hooks = this.getHooks(type);
    this.logger.debug(`[attachHooks] Hooks: ${JSON.stringify(hooks)}`);
    if(hooks)
      that.hooks = hooks;
    that.hook = this.on;
    if(type === HOOK_TYPES.PRINT)
      that.HOOKS = this.dataUtil.clone(PRINT_HOOKS, true);
    // TODO: Add parse hooks
    // else if(type === HOOK_TYPES.PARSE)
    //   that.HOOKS = this.dataUtil.clone(PARSE_HOOKS, true);

    this.logger.debug(`[attachHooks] Hooks attached to object \`${type}\``);
    return this;
  }

  /**
   * Loads the hook file, validates the hooks, and registers them.
   *
   * @param {string} hookFile - Path to the hook file.
   */
  async load() {
    const hooks = this.core.options.hooks;
    const hooksFile = await this.fileUtil.resolveFile(hooks);
    const absolutePath = hooksFile.get("absolutePath");
    const absoluteUri = hooksFile.get("absoluteUri");
    if(!fs.existsSync(absolutePath))
      throw new Error(`Hook file not found: ${absolutePath}`);

    this.logger.debug(`[load] Loading hooks from: \`${absoluteUri}\``);
    const {parse, print} = await import(absoluteUri);
    parse && this.validateHooks(parse, PARSE_HOOKS);
    print && this.validateHooks(print, PRINT_HOOKS);
    this.hooks = new Map([
      [HOOK_TYPES.PARSE, parse],
      [HOOK_TYPES.PRINT, print],
    ]);
    this.logger.debug(`[load] Loaded hooks from: \`${absoluteUri}\``);

    return this;
  }

  validateHooks(events, validHooks = {}) {
    if(!events || events.size === 0 || !validHooks || Object.keys(validHooks).length === 0)
      return;
console.log(events)
    console.debug(`[validateHooks] Events: ${JSON.stringify(events, null, 2)}`);
    console.debug(`[validateHooks] Valid hooks: ${JSON.stringify(validHooks, null, 2)}`);

    console.log(HOOK_TYPES);
    console.log()
    const HOOKS = Object.values(validHooks);
    events.forEach((handler, event) => {
      if(!HOOKS.includes(event))
        throw new Error(`Unknown event "${event}"`);

      if(typeof handler !== "function")
        throw new Error(`Handler for "${type} ${event}" is not a function.`);
    });
  }

  /**
   * Triggers a registered hook for the given event.
   *
   * @param {string} event - The name of the event (e.g., onTagStart).
   * @param {...any} args - The arguments to pass to the hook.
   * @returns {Object} - The result of the hook execution, or the default handler (which just returns the incoming context).
   */
  async on(event, ...args) {
    const hook = this.hooks?.has(event) ? this.hooks.get(event) : null;

    if(hook) {
      try {
        const result = await hook(...args);
        if(result?.status === "error")
          throw result.error;
        return result;
      } catch(error) {
        this.logger.error(`[on] Error executing hook "${event}": ${error.message}`);
        throw error;
      }
    }
  }
}

export default HookManager;
