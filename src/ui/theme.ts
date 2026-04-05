const hexColorPattern = /^#(?:[0-9a-fA-F]{3}){1,2}$/;
const rgbColorPattern =
  /^rgb\(\s?\d{1,3},\s?\d{1,3},\s?\d{1,3}\s?\)$/;
const namedColorPattern = /^[a-zA-Z]+$/;

const defaultAccentColor = "#d6b3ff";
const defaultSurfaceColor = "gray";
const defaultMutedColor = "gray";
const defaultErrorColor = "red";

export interface UiThemeInput {
  accentColor?: string;
}

/**
 * Stable read model consumed by the Ink UI. Components receive a typed theme
 * object instead of sprinkling raw color literals throughout the tree.
 */
export interface UiTheme {
  accentColor: string;
  surfaceColor: string;
  mutedColor: string;
  errorColor: string;
}

const isSupportedInkColor = (value: string) =>
  hexColorPattern.test(value) ||
  rgbColorPattern.test(value) ||
  namedColorPattern.test(value);

/**
 * UI domain defaults and validation for CLI theming. Bootstrap composes this
 * typed object; the UI simply renders from it.
 */
export const resolveUiTheme = (input: UiThemeInput = {}): UiTheme => {
  const accentColor = input.accentColor?.trim() || defaultAccentColor;

  if (!isSupportedInkColor(accentColor)) {
    throw new Error(
      `Unsupported theme accent color: ${accentColor}. Use a named color, #hex, or rgb(r,g,b).`
    );
  }

  return {
    accentColor,
    surfaceColor: defaultSurfaceColor,
    mutedColor: defaultMutedColor,
    errorColor: defaultErrorColor
  };
};
