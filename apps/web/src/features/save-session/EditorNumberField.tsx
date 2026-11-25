import type { ReactNode } from 'react';
import { clampInt } from './editor-number';

interface Props {
  readonly label: ReactNode;
  readonly value: number | null | undefined;
  readonly min: number;
  readonly max: number;
  readonly step?: number;
  readonly onChange: (value: number) => void;
}

/** A numeric draft property. Missing native fields remain unknown and cannot be edited. */
export function EditorNumberField({ label, value, min, max, step, onChange }: Props) {
  return <label className="editor-field">
    <span>{label}</span>
    <input type="number" min={min} max={max} step={step} value={value ?? ''} placeholder="—"
      disabled={value == null} onChange={event => {
        if (value == null) return;
        onChange(clampInt(event.currentTarget.value, value, min, max));
      }}/>
  </label>;
}
