import { createRequire } from "module";
import { resolve } from "path";

export default class ModuleUtil {
  /**
   * Requires a module
   * @param module - The module to require
   * @returns {Promise<any>}
   */
  static async require(module: string): Promise<any> {
    const resolvedFile = resolve(process.cwd(), module).replace(/\\/g, "/");
    return await createRequire(import.meta.url)(resolvedFile);
  }
}
