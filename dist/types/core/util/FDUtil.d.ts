export type FDType = 'file' | 'directory';

export interface FileMap {
    path: string;
    uri: string;
    absolutePath: string;
    absoluteUri: string;
    name: string;
    module: string;
    extension: string;
    isFile: true;
    isDirectory: false;
    directory?: DirMap;
}

export interface DirMap {
    path: string;
    uri: string;
    absolutePath: string;
    absoluteUri: string;
    name: string;
    separator: string;
    isFile: false;
    isDirectory: true;
}

export interface FilenameParts {
    basename: string;
    dirname: string;
    extname: string;
}

export const fdType: Readonly<Record<Uppercase<FDType>, FDType>>;
export const fdTypes: readonly FDType[];

/**
 * Compose a directory map from a path
 *
 * @param directory - The directory
 * @returns A directory object
 */
export function composeDirectory(directory: string): DirMap;
/**
 * Compose a file path from a directory and a file
 *
 * @param directoryNameorObject - The directory
 * @param fileName - The file
 * @returns A file object
 */
export function composeFilename(directoryNameorObject: string | DirMap, fileName: string): FileMap;
/**
 * Deconstruct a filename into parts
 *
 * @param fileName - The filename to deconstruct
 * @returns The filename parts
 */
export function deconstructFilenameToParts(fileName: string): FilenameParts;
/**
 * Fix slashes in a path
 *
 * @param pathName - The path to fix
 * @returns The fixed path
 */
export function fixSlashes(pathName: string): string;
/**
 * Retrieve all files matching a specific glob pattern.
 *
 * @param globPattern - The glob pattern(s) to search.
 * @returns An array of file objects
 * @throws Throws an error for invalid input or search failure.
 */
export function getFiles(globPattern: string | string[]): Promise<FileMap[]>;
/**
 * Lists the contents of a directory.
 *
 * @param directory - The directory to list.
 * @returns The files and sub-directories in the directory.
 */
export function ls(directory: string): Promise<{
    files: FileMap[];
    directories: DirMap[];
}>;
/**
 * Map a directory to a DirMap
 *
 * @param directoryName - The directory to map
 * @returns A directory object
 */
export function mapDirectory(directoryName: string): DirMap;
/**
 * Map a file to a FileMap
 *
 * @param {string} fileName - The file to map
 * @returns A file object
 */

/**
 * Check if a file can be read
 *
 * @param fileObject - The file object to check
 * @returns Whether the file can be read
 */
export function canReadFile(fileObject: FileMap): boolean;

/**
 * Check if a file can be written
 *
 * @param fileObject - The file object to check
 * @returns Whether the file can be written
 */
export function canWriteFile(fileObject: FileMap): boolean;

/**
 * Check if a file exists
 *
 * @param fileObject - The file object to check
 * @returns Whether the file exists
 */
export function fileExists(fileObject: FileMap): boolean;

/**
 * Returns a FileMap object for the specified file.
 *
 * @param fileName - The file to map
 * @returns A file object
 */
export function mapFilename(fileName: string): FileMap;
/**
 * Convert a path to a URI
 *
 * @param pathName - The path to convert
 * @returns The URI
 */
export function pathToUri(pathName: string): string;
/**
 * Reads the content of a file synchronously.
 *
 * @param fileObject - The file map containing the file path
 * @returns The file contents
 */
export function readFile(fileObject: FileMap): string;
/**
 * Resolves a path to an absolute path
 *
 * @param directoryName - The path to resolve
 * @returns The directory object
 */
export function resolveDirectory(directoryName: string): DirMap;
/**
 * Resolves a file to an absolute path
 *
 * @param fileName - The file to resolve
 * @param directoryObject - The directory object to resolve the file in
 * @returns A file object (validated)
 */
export function resolveFilename(fileName: string, directoryObject?: DirMap | null): FileMap;
/**
 * Convert a URI to a path
 *
 * @param pathName - The URI to convert
 * @returns The path
 */
export function uriToPath(pathName: string): string;
/**
 * Writes content to a file synchronously.
 *
 * @param fileObject - The file map containing the file path
 * @param content - The content to write
 */
export function writeFile(fileObject: FileMap, content: string): void;
//# sourceMappingURL=FDUtil.d.ts.map
