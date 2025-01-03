import { Engine } from "./engine.js";
import { BaseResponse } from "./common.js";

type ParserMap = { [key in ParserKey]: ParserMeta | ParserClass };
type ParserKey = "meta" | Engine.PARSER;
type ParserValue = ParserMeta | ParserClass;

type ParserMeta = {
  language: string;
  languageExtension: string;
};

/**
 * Response type for parse operations that need file context
 */
type FileResponse = BaseResponse & {
  file?: string;
  line?: string;
  lineNumber?: number;
};

type ParseResponse = FileResponse & {
  result?: any;
};

type ParserClass = {
  new(core: any): {
    parse: (file: string, content: string) => Promise<ParseResponse>;
  };
};

export {
  ParserClass,
  ParseResponse,
  ParserMap,
  ParserMeta,
  ParserKey,
  ParserValue,
};
