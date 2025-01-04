import FileUtil from "./util/fd.js";
import {
  HOOK_TYPE,
  CLASS_TO_HOOK_MAP,
  PRINT_HOOKS,
  PARSE_HOOKS,
  Hooks,
  Hook,
  HookPoints,
  Hookable,
}from "./types/hook.js";
import { ICore }from "./types/core.js";
import { FileMap }from "./types/fd.js";

export default class HookManager {
  private core: ICore;
  private fileUtil: FileUtil;
  private hooks: { [key: string]: Hooks };

  constructor(core: ICore) {
    this.core = core;
    this.fileUtil = new FileUtil();
    this.hooks = {};
  }

  /**
   * Load hooks from a file
   *
   * @returns The type of hooks attached
   */
  async load(): Promise<void> {
    const hooksFile = this.core.options.hooks;
    if(!hooksFile)
      return;

    const hooks = await import(hooksFile.absoluteUri);

    this.hooks = hooks;
  }

  /**
   * Trigger a hook
   *
   * @param event - The type of hook to trigger
   * @param args - The hook arguments
   * @returns The result of the hook
   */
  async on(this: Hookable, event: HOOK_TYPE, args: HookPoints): Promise<void> {
    if(!event)
      throw new Error("[on] Event type is required for hook invocation") ;

    const hook = this.hooks?.[CLASS_TO_HOOK_MAP[event]] ;
    if(!hook)
      return ;

    const result = await hook(args) ;
    if(result && typeof result === "object" && "status" in result && result.status === "error" && "error" in result)
      throw result.error ;
    return ;
  }

  /**
   * Attach hooks to a target
   *
   * @param target - The target to attach hooks to
   * @returns The type of hooks attached
   */
  attachHooks(target: Hookable): string {
    if(!target.constructor?.name)
      throw new Error("[attachHooks] Target must have a constructor name");

    const name = target.constructor.name;
    if(name !== HOOK_TYPE.PRINT && name !== HOOK_TYPE.PARSE)
      throw new Error(`[attachHooks] Invalid target type: ${name}`);

    target.hooks = this.hooks[CLASS_TO_HOOK_MAP[name]];
    target.hook = this.on;
    target.HOOKS = name === HOOK_TYPE.PRINT ? PRINT_HOOKS : PARSE_HOOKS;

    return name;
  }
  /*
    validateHooks(events: Hooks, validHooks: Hooks): void {
      if (!events || events.length === 0 || !validHooks || Object.keys(validHooks).length === 0)
        return;

      const HOOKS = Object.values(validHooks);
      events.forEach((handler, event) => {
        if (!HOOKS.includes(event))
          throw new Error(`Unknown event "${event}"`);
      });
    }
  */
}
