import Logger from "./logger.js";
import DataUtil from "./util/data.js";
import FileUtil from "./util/fd.js";
import {
  HOOK_TYPE,
  PRINT_HOOKS,
  PARSE_HOOKS,
  Hooks,
} from "./types/hook.js";

export default class HookManager {
  private core: any;
  private logger: Logger;
  private dataUtil: DataUtil;
  private fileUtil: FileUtil;
  private hooks: { [key: string]: Hooks };

  constructor(core: any) {
    this.core = core;
    this.logger = new Logger(this.core);
    this.dataUtil = new DataUtil();
    this.fileUtil = new FileUtil();
    this.hooks = {};
  }

  async load(): Promise<void> {
    const hooksFile = this.core.options.hooks;
    if (!hooksFile) return;

    const resolvedFile = await this.fileUtil.resolveFile(hooksFile);
    const hooks = await import(resolvedFile.absoluteUri);
    this.hooks = hooks;
  }

  async on(event: HOOK_TYPE, ...args: any[]): Promise<void> {
    const hooks = this.hooks[event] || {};
    const hook = hooks[event];

    if (hook) {
      const result = await hook(...args);
      if (result?.status === "error") {
        throw result.error;
      }
      return result;
    }
  }

  attachHooks(target: Hookable): void {
    if (!target.constructor?.name) {
      throw new Error("[attachHooks] Target must have a constructor name");
    }

    const name = target.constructor.name;
    if (name !== HOOK_TYPE.PRINT && name !== HOOK_TYPE.PARSE) {
      throw new Error(`[attachHooks] Invalid target type: ${name}`);
    }

    target.hooks = this.hooks[name];
    target.hook = this.on.bind(this);
    target.HOOKS = name === HOOK_TYPE.PRINT ? PRINT_HOOKS : PARSE_HOOKS;
  }
}

type Hookable = {
  constructor: { name: string };
  hooks?: Hooks;
  hook?: HookManager["on"];
  HOOKS?: typeof PRINT_HOOKS | typeof PARSE_HOOKS;
};
