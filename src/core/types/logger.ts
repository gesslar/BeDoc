export type LoggerOptions = {
  debug?: boolean;
  debugLevel?: number;
  name: string;
};

export type VSCodeWindow = {
  showErrorMessage: (message: string) => void;
  showWarningMessage: (message: string) => void;
  showInformationMessage: (message: string) => void;
};

export const LoggerColors = {
  debug: "\x1b[36m", // Cyan
  info: "\x1b[32m",  // Green
  warn: "\x1b[33m",  // Yellow
  error: "\x1b[31m", // Red
  reset: "\x1b[0m",  // Reset
} as const;

export type LoggerColor = keyof typeof LoggerColors;
