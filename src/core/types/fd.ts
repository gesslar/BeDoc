type FileMap = {
  path: string,
  uri: string,
  absolutePath: string,
  absoluteUri: string,
  name: string,
  module: string,
  extension: string,
}

type DirMap = {
  path: string,
  uri: string,
}

const enum TYPE {
  FILE = "file",
  DIR = "directory",
  DIRECTORY = "directory",
}

type FD_TYPES = typeof TYPE[keyof typeof TYPE] ;

export {
  FileMap,
  DirMap,
  TYPE,
  FD_TYPES,
} ;
