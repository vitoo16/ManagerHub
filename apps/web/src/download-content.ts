/** A user-triggered local download with bounded URL lifetime. */
export function downloadContent(content: string, mimeType: string, filename: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
  try {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.hidden = true;
    document.body.append(anchor);
    try { anchor.click(); } finally { anchor.remove(); }
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }
}
