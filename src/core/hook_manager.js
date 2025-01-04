import FileUtil from "./util/fd.js";
import DataUtil from "./util/data.js";
import { CLASS_TO_HOOK, HOOK_TO_CLASS, PRINT_HOOKS, PARSE_HOOKS }from "./include/hooks.js";

export default class HookManager {
  constructor(core) {
    this.core = core;
    this.fileUtil = new FileUtil();
    this.hooks = {};
  }

  /**
   * Load hooks from a file
   *
   * @returns The type of hooks attached
   */
  load = async() => {
    const hooksFile = this.core.options.hooks;
    if(!hooksFile)
      return;

    const hooks = await import(hooksFile.absoluteUri);

    this.hooks = hooks;
  }

  getAvailableHooks = () =>
    this.hooks ||
    DataUtil.allocate(Object.keys(CLASS_TO_HOOK), _ => {})

  /**
   * Attach hooks to a target
   *
   * @param target - The target to attach hooks to
   * @returns The type of hooks attached
   */
  attachHooks = target => {
    if(!target.constructor?.name)
      throw new Error("[attachHooks] Target must have a constructor name");

    const name = target.constructor.name;
    if(!(name in CLASS_TO_HOOK))
      throw new Error(`[attachHooks] Invalid target type: ${name}`);

    const hookType = CLASS_TO_HOOK[name];
    target.hooks = target.hooks || {};

    const currHooks = target.hooks[hookType];
    if(currHooks)
      throw new Error(`[attachHooks] Hooks already attached for ${name}`);

    target.hooks[hookType] = this.hooks[hookType];
    target.hook = this.on;
    target.HOOKS = name === HOOK_TO_CLASS.print ? PRINT_HOOKS : PARSE_HOOKS;

    return name;
  }

  /**
   * Trigger a hook
   *
   * @param event - The type of hook to trigger
   * @param ...args - The hook arguments
   * @returns The result of the hook
   */
  async on(event, ...args) {
    if(!event)
      throw new Error("[on] Event type is required for hook invocation");

    const hook = this.hooks?.[event] || null;
    if(!hook)
      return;

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
/*

  validateHooks = (events, validHooks = {}) => {
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
*/
}
