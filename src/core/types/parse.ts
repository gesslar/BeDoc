import { Engine } from "./engine.js";

type ParserMap = { [key in ParserKey]: ParserMeta | ParserClass };
type ParserKey = "meta" | Engine.PARSER;
type ParserValue = ParserMeta | ParserClass;

type ParserMeta = {
  language: string;
  languageExtension: string;
};

type ParseResponse = {
  success: boolean;
  result?: any;
  error?: boolean;
  file?: string;
  line?: string;
  lineNumber?: number;
  message?: string;
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
