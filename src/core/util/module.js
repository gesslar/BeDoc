import {createRequire} from "module";
import {resolve} from "path";

export default class ModuleUtil {
  static async require(module) {
    const resolvedFile = resolve(process.cwd(), module).replace(/\\/g, "/");
    console.debug(`[ModuleUtil.require] resolvedFile: ${resolvedFile}`);
    return await createRequire(import.meta.url)(resolvedFile);
  }
}
