import { AttributeInput } from '@managerhub/ui';

interface EditorAttributeField<Key extends string> {
  readonly key: Key;
  readonly label: string;
  readonly value: number | null | undefined;
}

interface EditorAttributeGroupProps<Key extends string> {
  readonly title: string;
  readonly fields: readonly EditorAttributeField<Key>[];
  readonly onChange: (key: Key, raw: string, previous: number) => void;
}

/** Presentation only: callers retain authorization, validation and transaction ownership. */
export function EditorAttributeGroup<Key extends string>({
  title, fields, onChange
}: EditorAttributeGroupProps<Key>) {
  return <fieldset className="editor-attribute-group">
    <legend>{title}</legend>
    {fields.map(field => (
      <label className="editor-field editor-attribute-row" key={field.key}>
        <span>{field.label}</span>
        <AttributeInput
          min={1}
          max={20}
          value={field.value}
          disabled={field.value == null}
          onChange={event => {
            if (field.value == null) return;
            onChange(field.key, event.currentTarget.value, field.value);
          }}
        />
      </label>
    ))}
  </fieldset>;
}
