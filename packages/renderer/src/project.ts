/**
 * PLACEHOLDER SHAPE — not the v1 schema.
 *
 * The real `project.json` schema (the block set, the styling fields, versioning) is being
 * decided in issue #3 and is deliberately not written here. This type exists only so the
 * scaffold typechecks and so `render` has a signature to hold. Expect it to be replaced
 * wholesale, not extended.
 */
export interface Project {
  /** The business name shown at the top of the page. */
  title: string;
}
