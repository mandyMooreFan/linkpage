export { render, escapeHtml, linkHref, mailtoHref, safeUrl, telHref } from "./render.js";
export { SCHEMA_VERSION } from "./project.js";
export { derivePalette } from "./palette.js";
export type { Palette } from "./palette.js";
export {
  DEFAULT_CORNERS,
  DEFAULT_SHAPE,
  DEFAULT_TYPE,
  MODES,
  SHAPES,
  TYPE_PAIRINGS,
  resolveChrome,
} from "./chrome.js";
export type { Chrome } from "./chrome.js";
export { contrastRatio, parseHex, toHex } from "./color.js";
export type { Rgb } from "./color.js";
export {
  FALLBACK_ICON,
  ICON_CLASS,
  ICON_NAMES,
  ICONS,
  SOCIAL_MARKS,
  SOCIAL_PLATFORMS,
  glyphSvg,
  iconSvg,
  isIconName,
  isSocialPlatform,
  socialIconSvg,
  socialLabel,
  socialPlatform,
} from "./icons.js";
export type { Glyph, IconName, SocialGlyph, SocialPlatform } from "./icons.js";
export { formatTime } from "./hours.js";
export { VOCABULARIES, dayName, direction, languageTag, vocabulary } from "./locale.js";
export type { DayNames, Vocabulary } from "./locale.js";
export type {
  Address,
  Advanced,
  Clock,
  ColorOverrides,
  Contact,
  Header,
  Hours,
  Interval,
  Link,
  Logo,
  Mode,
  PlatformId,
  Project,
  Shape,
  SocialLink,
  TimeOfDay,
  TypePairing,
  Weekday,
  WeekStart,
} from "./project.js";
