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
 * @param {string} directory - The directory
 * @returns {DirMap} A directory object
 */
export function composeDirectory(directory: string): DirMap;
/**
 * Compose a file path from a directory and a file
 *
 * @param {string|DirMap} directoryNameorObject - The directory
 * @param {string} fileName - The file
 * @returns {FileMap} A file object
 */
export function composeFilename(directoryNameorObject: string | DirMap, fileName: string): FileMap;
/**
 * Deconstruct a filename into parts
 *
 * @param {string} fileName - The filename to deconstruct
 * @returns {FilenameParts} The filename parts
 */
export function deconstructFilenameToParts(fileName: string): FilenameParts;
/**
 * Fix slashes in a path
 *
 * @param {string} pathName - The path to fix
 * @returns {string} The fixed path
 */
export function fixSlashes(pathName: string): string;
/**
 * Retrieve all files matching a specific glob pattern.
 *
 * @param {string|string[]} globPattern - The glob pattern(s) to search.
 * @returns {Promise<FileMap[]>} An array of file objects
 * @throws {Error} Throws an error for invalid input or search failure.
 */
export function getFiles(globPattern: string | string[]): Promise<FileMap[]>;
/**
 * Lists the contents of a directory.
 *
 * @param {string} directory - The directory to list.
 * @returns {Promise<{files: FileMap[], directories: DirMap[]}>} The files and
 * directories in the directory.
 */
export function ls(directory: string): Promise<{
    files: FileMap[];
    directories: DirMap[];
}>;
/**
 * Map a directory to a DirMap
 *
 * @param {string} directoryName - The directory to map
 * @returns {DirMap} A directory object
 */
export function mapDirectory(directoryName: string): DirMap;
/**
 * Map a file to a FileMap
 *
 * @param {string} fileName - The file to map
 * @returns {FileMap} A file object
 */
export function mapFilename(fileName: string): FileMap;
/**
 * Convert a path to a URI
 *
 * @param {string} pathName - The path to convert
 * @returns {string} The URI
 * @throws {Error} If the path is not a valid file path
 */
export function pathToUri(pathName: string): string;
/**
 * Reads the content of a file synchronously.
 *
 * @param {FileMap} fileObject - The file map containing the file path
 * @returns {string} The file contents
 */
export function readFile(fileObject: FileMap): string;
/**
 * Resolves a path to an absolute path
 *
 * @param {string} directoryName - The path to resolve
 * @returns {DirMap} The directory object
 * @throws {Error}
 */
export function resolveDirectory(directoryName: string): DirMap;
/**
 * Resolves a file to an absolute path
 *
 * @param {string} fileName - The file to resolve
 * @param {DirMap} [directoryObject] - The directory object to resolve the
 *                                     file in
 * @returns {FileMap} A file object (validated)
 * @throws {Error}
 */
export function resolveFilename(fileName: string, directoryObject?: DirMap | null): FileMap;
/**
 * Convert a URI to a path
 *
 * @param {string} pathName - The URI to convert
 * @returns {string} The path
 * @throws {Error} If the URI is not a valid file URL
 */
export function uriToPath(pathName: string): string;
/**
 * Writes content to a file synchronously.
 *
 * @param {FileMap} fileObject - The file map containing the file path
 * @param {string} content - The content to write
 */
export function writeFile(fileObject: FileMap, content: string): void;
//# sourceMappingURL=FDUtil.d.ts.map
