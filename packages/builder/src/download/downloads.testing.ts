/**
 * The browser's download machinery, faked well enough to read the file back.
 *
 * **Test support, not shipped code** — the same standing as `src/fixtures.ts`, and it is here
 * rather than in one of the test files because three of them need it: `save.test.ts` for the
 * handover itself, `download/download.test.tsx` for the sheet, and `App.test.tsx` for the whole
 * press from the list's button to the bytes.
 *
 * jsdom implements neither half of what `saveTextFile` uses: there is no `URL.createObjectURL`,
 * and a click on an anchor does not download anything. So this stands in for both and keeps
 * what went past — **which is what makes "a real file comes out" an assertion rather than a
 * hope.** The blob is the actual `Blob` the browser was handed, so its bytes and its type can
 * be read back off it.
 *
 * `restore` puts back whatever was there, by descriptor, rather than deleting: Node has had its
 * own `URL.createObjectURL` since 16.7, so under CI's Node 26 the property being replaced may
 * be a real one rather than an absence.
 */

export interface CaughtDownload {
  /** The name the file would land under. */
  readonly filename: string;
  /** The object URL it was fetched from, so revocation can be observed. */
  readonly url: string;
  /** The bytes, as the browser got them. */
  readonly blob: Blob | undefined;
  /** In the document at the moment of the click — Firefox ignores a click on anything else. */
  readonly attached: boolean;
}

export interface FakeDownloads {
  /** Every file handed to the browser, in order. */
  readonly written: CaughtDownload[];
  /** Every object URL released. */
  readonly revoked: string[];
  restore(): void;
}

export function installDownloads(): FakeDownloads {
  const blobs = new Map<string, Blob>();
  const written: CaughtDownload[] = [];
  const revoked: string[] = [];
  let next = 0;

  const target = URL as unknown as object;
  const before = {
    create: Object.getOwnPropertyDescriptor(target, "createObjectURL"),
    revoke: Object.getOwnPropertyDescriptor(target, "revokeObjectURL"),
  };

  Object.defineProperty(target, "createObjectURL", {
    configurable: true,
    writable: true,
    value: (blob: Blob): string => {
      const url = `blob:linkpage-test/${next++}`;
      blobs.set(url, blob);
      return url;
    },
  });
  Object.defineProperty(target, "revokeObjectURL", {
    configurable: true,
    writable: true,
    value: (url: string): void => void revoked.push(url),
  });

  const click = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function caught(this: HTMLAnchorElement) {
    const url = this.getAttribute("href") ?? "";
    written.push({
      filename: this.download,
      url,
      blob: blobs.get(url),
      attached: this.isConnected,
    });
  };

  return {
    written,
    revoked,
    restore() {
      HTMLAnchorElement.prototype.click = click;
      put("createObjectURL", before.create);
      put("revokeObjectURL", before.revoke);
    },
  };

  function put(name: string, descriptor: PropertyDescriptor | undefined): void {
    if (descriptor === undefined) {
      Reflect.deleteProperty(target, name);
    } else {
      Object.defineProperty(target, name, descriptor);
    }
  }
}
