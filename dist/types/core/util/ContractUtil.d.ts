declare namespace _default {
    function getSchemaFile(): FileObject;
    /**
     * Takes a schema and returns a validator function
     *
     * @param {object} schema The schema to compile
     * @returns {(data: unknown) => boolean} The schema validator function
     */
    function getValidator(schema: object): (data: unknown) => boolean;
    /**
     * Downloads and preserves a copy of the action schema within the dist/ folder.
     *
     * @returns {object} The schema validator
     */
    function fetchSchema(): object;
    /**
     * Loads a schema from file or fetches it if it is missing.
     *
     * @returns {object} The schema object
     */
    function loadSchema(): object;
    /**
     * Validates that a schema matches the expected structure.
     *
     * TODO get rid of this and all of its uses. We have a new
     *      contract system now.
     *
     * @param {object} schema - The schema to validate.
     * @param {object} definition - The expected structure.
     * @param {Array} stack - The stack trace for nested validation.
     * @param {object} logger - The logger to use.
     * @returns {boolean} - True if valid, throws an error otherwise.
     */
    function schemaCompare(schema: object, definition: object, stack?: any[], logger?: object): boolean;
}
export default _default;
import { FileObject } from "@gesslar/toolkit";
//# sourceMappingURL=ContractUtil.d.ts.map