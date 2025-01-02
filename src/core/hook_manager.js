const fs = require('fs');

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

class HookManager {
  constructor(core) {
    core.logger.debug(`[constructor] Starting HookManager`);
    this.core = core;
    this.logger = core.logger;
    this.dataUtil = core.dataUtil;
    this.fileUtil = core.fileUtil;
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
    if(!fs.existsSync(hooksFile.get("path")))
      throw new Error(`Hook file not found: ${hooksFile.path}`);

    const file = hooksFile.get("path");
    this.logger.debug(`[load] Loading hooks from: \`${file}\``);

    const userHooks = require(file);
    this.validateHooks(userHooks);
    this.hooks = userHooks;
    this.logger.debug(`[load] Loaded hooks from: \`${file}\``);

    return this;
  }

  validateHooks(hooks) {
    hooks.forEach((events, type) => {
      if(!HOOK_TYPES[type.toUpperCase()])
        throw new Error(`Unknown hook type "${type}"`);

      const HOOKS = type === HOOK_TYPES.PRINT ? PRINT_HOOKS : {};
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
  async on(event, ...args) {
    const hook = this.hooks?.has(event) ? this.hooks.get(event) : null;

    if(hook) {
      try {
        const result = await hook(...args);
        if(result?.status === 'error')
          throw result.error;
        return result;
      } catch(error) {
        this.logger.error(`[on] Error executing hook "${event}": ${error.message}`);
        throw error;
      }
    }
  }
}

module.exports = HookManager;