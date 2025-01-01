const fs = require('fs');
const Util = require('./util');

const HOOK_TYPES = Object.freeze({
  PRINT: "print",
  PARSE: "parse",
});

const HOOKS = Object.freeze({
  LOAD: "load",
  ENTER: "enter",
  EXIT: "exit",
});

class HookManager {
  constructor(core) {
    core.logger.debug(`[constructor] Starting HookManager`);
    this.core = core;
    this.logger = core.logger;
    this.hooks = new Map();
  }

  getObjectType(that) {
    if(that.constructor.name === 'Printer')
      return HOOK_TYPES.PRINT;
    else if(that.constructor.name === 'Parser')
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
    that.HOOKS = Util.clone(HOOKS, true);

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
    const hooksFile = await Util.resolveFile(hooks);
    if(!fs.existsSync(hooksFile.get("path")))
      throw new Error(`Hook file not found: ${hooksFile.path}`);

    const file = hooksFile.get("path");
    this.logger.debug(`[load] Loading hooks from: \`${file}\``);

    const userHooks = require(file);
    this.validateHooks(userHooks);
    this.hooks = userHooks;
    this.logger.debug(`[load] Loaded hooks from: \`${file}\``);
    this.logger.debug(`[load] Hooks: ${Util.serializeMap(this.hooks, 2)}`);

    return this;
  }

  validateHooks(hooks) {
    hooks.forEach((events, type) => {
      if(!HOOK_TYPES[type.toUpperCase()])
        throw new Error(`Unknown hook type "${type}"`);

      events.forEach((handler, event) => {
        if(!HOOKS[event.toUpperCase()])
          throw new Error(`Unknown event "${event}"`);

        if(typeof handler !== 'function')
          throw new Error(`Handler for "${type} ${event}" is not a function.`);
      });
    });
  }

  /**
   * Triggers a registered hook for the given event.
   *
   * @param {string} event - The name of the event (e.g., onTagStart).
   * @param {...any} args - The arguments to pass to the hook.
   * @returns {Object} - The result of the hook execution, or the default handler (which just returns the incoming context).
   */
  on(event, ...args) {
    const hook = this.hooks?.has(event) ? this.hooks.get(event) : null;

    if(hook)
      hook(...args);
  }
}

module.exports = HookManager;
