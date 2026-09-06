export type ErrorCode =
  | 'settingsObject'
  | 'numbers'
  | 'borders'
  | 'labelSize'
  | 'negativeSpacing'
  | 'padding'
  | 'fontRange'
  | 'noLabelsFit'
  | 'tooManySlots'
  | 'skip'
  | 'offset'
  | 'tooManyLabels'
  | 'labelText'
  | 'projectSize'
  | 'projectFormat'
  | 'fileSize'
  | 'canvas'
  | 'copySheet'
  | 'missingElement';

export type MessageParameters = Readonly<Record<string, string | number>>;

/** Stable, language-independent errors for CLI, browser and future API adapters. */
export class LabelError extends Error {
  readonly code: ErrorCode;
  readonly parameters: MessageParameters;

  constructor(code: ErrorCode, parameters: MessageParameters = {}) {
    super(code);
    this.name = 'LabelError';
    this.code = code;
    this.parameters = parameters;
  }
}
