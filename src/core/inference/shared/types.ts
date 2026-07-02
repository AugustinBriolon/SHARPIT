/**
 * A localizable item: a stable code key plus optional interpolation params.
 * The inference domain emits these; the presentation layer resolves them via i18n.
 */
export type I18nItem = {
  code: string;
  params?: Record<string, number | string>;
};
