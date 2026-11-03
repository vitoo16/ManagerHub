import { useTranslation } from 'react-i18next';

const PREPARE_COMMAND = String.raw`npm run research:fm2013:session -- prepare --pid 1234 --ticket "$env:TEMP\fm2013-ticket.json" --script "$env:TEMP\fm2013-capture.js"`;
const EXPORT_COMMAND = String.raw`npm run research:fm2013:session -- export-wire --ticket "$env:TEMP\fm2013-ticket.json" --evidence "$env:TEMP\rea-evidence.json" --evidence-id ev_REPLACE_WITH_64_HEX --output "$env:TEMP\fm2013-wire.json"`;

/**
 * Explains the existing local research handoff. This is intentionally a manual guide,
 * not a browser process bridge or an executable capture action.
 */
export function HistoricalCaptureGuide() {
  const { t } = useTranslation();
  return <details className="historical-capture-guide">
    <summary>{t('How to create a capture file')}</summary>
    <div className="historical-capture-guide__body">
      <p>{t('This is a manual, read-only research workflow on a Windows machine with the supported FM2013 build. The browser cannot find or attach to the game.')}</p>
      <ol>
        <li>
          <strong>{t('Prepare an authorized capture')}</strong>
          <p>{t('From a local ManagerHub checkout with dependencies installed, start the supported FM2013 build and replace PID 1234 with its actual Windows process ID. Run in PowerShell:')}</p>
          <pre><code>{PREPARE_COMMAND}</code></pre>
        </li>
        <li>
          <strong>{t('Run the prepared script manually')}</strong>
          <p>{t('Using your authorized local REA research workflow, load the newly generated script into the selected FM2013 process. Export the complete evidence bundle as rea-evidence.json and note its exact ev_ evidence ID. Complete the handoff before the ten-minute ticket expires.')}</p>
        </li>
        <li>
          <strong>{t('Export the browser-compatible wire JSON')}</strong>
          <p>{t('Replace the evidence ID placeholder with the actual ID and use a fresh output filename:')}</p>
          <pre><code>{EXPORT_COMMAND}</code></pre>
          <p>{t('The export prints a SHA-256 hash. After importing, compare it with Source SHA-256 in the snapshot details.')}</p>
        </li>
        <li>
          <strong>{t('Review and import the historical record')}</strong>
          <p>{t('Select fm2013-wire.json above, declare a career label and capture time, choose Realism or Editor, then validate the import. Both the label and time are unverified declarations.')}</p>
        </li>
      </ol>
      <p className="historical-capture-guide__warning">{t('Privacy: the exported wire file can contain exact observed ratings and biography. Realism hides sensitive fields in the app but does not sanitize that file. Keep the wire and REA evidence private; do not commit or upload them.')}</p>
      <p>{t('This procedure does not establish a live connection, authenticated runtime bytes, career lineage, or permission to edit game data.')}</p>
      <a href="https://github.com/vitoo16/ManagerHub/blob/main/docs/research/fmrte/27-historical-snapshot-consumer.md" target="_blank" rel="noreferrer">{t('Read the complete capture workflow documentation')}</a>
    </div>
  </details>;
}
