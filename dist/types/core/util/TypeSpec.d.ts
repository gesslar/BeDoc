import { DataType } from './DataUtil';

interface TypeSpecification {
    typeName: DataType;
    array: boolean;
}

interface TypeSpecOptions {
    delimiter?: string;
    allowEmpty?: boolean;
}

interface TypeSpecJSON {
    specs: TypeSpecification[];
    length: number;
    stringRepresentation: string;
}

export default class TypeSpec {
    constructor(typeString: string, options?: TypeSpecOptions);

    readonly specs: readonly TypeSpecification[];
    readonly length: number;
    readonly stringRepresentation: string;

    toString(): string;
    toJSON(): TypeSpecJSON;

    forEach(callback: (spec: TypeSpecification) => void): void;
    every(callback: (spec: TypeSpecification) => boolean): boolean;
    some(callback: (spec: TypeSpecification) => boolean): boolean;
    filter(callback: (spec: TypeSpecification) => boolean): TypeSpecification[];
    map<T>(callback: (spec: TypeSpecification) => T): T[];
    reduce<T>(callback: (acc: T, spec: TypeSpecification) => T, initialValue: T): T;
    find(callback: (spec: TypeSpecification) => boolean): TypeSpecification | undefined;

    match(value: unknown, options?: TypeSpecOptions): boolean;

    #specs: TypeSpecification[];
    #parse(typeString: string, options?: TypeSpecOptions): void;
}
//# sourceMappingURL=TypeSpec.d.ts.map
