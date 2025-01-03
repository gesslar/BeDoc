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
  DIR = "dir",
}

export {
  FileMap,
  DirMap,
  TYPE,
};
