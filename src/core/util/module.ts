import { createRequire } from "module";
import { resolve } from "path";

export default class ModuleUtil {
  /**
   * Requires a module synchronously
   * @param module - The module to require
   * @returns The required module
   */
  static require(module: string): any {
    const resolvedFile = resolve(process.cwd(), module).replace(/\\/g, "/");
    return createRequire(import.meta.url)(resolvedFile);
  }
}
