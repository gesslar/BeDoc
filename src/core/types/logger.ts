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
