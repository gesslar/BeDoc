import Logger from '../Logger';
import TypeSpec from './TypeSpec';

type PrimitiveType = 'undefined' | 'boolean' | 'number' | 'bigint' | 'string' | 'symbol' | 'object' | 'function';
type ConstructorType = 'object' | 'array' | 'function' | 'date' | 'regexp' | 'error' | 'map' | 'set' | 'weakmap' | 'weakset' | 'promise' | 'int8array' | 'uint8array' | 'float32array' | 'float64array';
type DataType = PrimitiveType | ConstructorType;

export const dataTypes: readonly DataType[];
export const emptyableTypes: readonly ['string', 'array', 'object'];

interface TypeSpecOptions {
    allowEmpty?: boolean;
}

interface SchemaCompareResult {
    status: 'success' | 'error';
    errors: Error[];
}

export function allocateObject<T>(source: string[], spec: T[] | ((source: string[]) => Promise<T[]>)): Promise<Record<string, T>>;
export function appendString(str: string, append: string): string;
export function prependString(str: string, prepend: string): string;
export function arrayIntersection<T>(arr1: T[], arr2: T[]): T[];
export function arrayPad<T>(arr: T[], length: number, value: T, position?: 0 | -1): T[];
export function isArrayUniform(arr: unknown[], type?: string): boolean;
export function isArrayUnique<T>(arr: T[]): T[];

export function cloneObject<T extends Record<string, unknown>>(obj: T, freeze?: boolean): T;
export function deepFreezeObject<T extends Record<string, unknown>>(obj: T): Readonly<T>;
export function isObjectEmpty(obj: Record<string, unknown>): boolean;

export function mapObject<T extends Record<string, unknown>>(
    original: T,
    transformer: (key: string, value: unknown) => Promise<unknown>,
    mutate?: boolean
): Promise<T>;

export function isNothing(value: unknown): value is null | undefined;
export function isEmpty(value: unknown, checkForNothing?: boolean): boolean;
export function isType(value: unknown, type: string | TypeSpec, options: TypeSpecOptions): boolean;
export function isBaseType(value: unknown, type: DataType): boolean;
export function isValidType(type: string): type is DataType;
export function typeOf(value: unknown): DataType;

export function newTypeSpec(str: string, options?: TypeSpecOptions): TypeSpec;

export function schemaCompare(
    schema: Record<string, unknown>,
    definition: Record<string, unknown>,
    stack?: string[],
    logger?: Logger
): SchemaCompareResult;
