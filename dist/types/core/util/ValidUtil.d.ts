import TypeSpec from './TypeSpec';

interface ValidTypeOptions {
    allowEmpty?: boolean;
}

/**
 * Validates a value against a type
 *
 * @throws {Error} If the value does not match the expected type
 */
export function validType(
    value: unknown,
    type: string | TypeSpec,
    options?: ValidTypeOptions,
    depth?: number
): void;

/**
 * Asserts a condition
 *
 * @throws {Error} If the condition is not met, with optional argument in message
 */
export function assert(
    condition: boolean,
    message: string,
    arg?: number | null
): asserts condition;
//# sourceMappingURL=ValidUtil.d.ts.map
