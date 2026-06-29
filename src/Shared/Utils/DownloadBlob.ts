/**
 * Trigger a browser download for an in-memory Blob (e.g. an .xlsx template fetched
 * from the API). Creates a temporary object URL, clicks a hidden anchor, then revokes.
 */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Defer 1 tick: revoke ngay sau click có thể hủy download trên một số engine.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
