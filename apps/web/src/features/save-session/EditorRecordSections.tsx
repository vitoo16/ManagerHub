import { useId, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { SectionTabs } from '@managerhub/ui';

export type EditorSection = 'general' | 'contract' | 'personality' | 'attributes' | 'hidden' | 'positions' | 'presets' | 'facilities' | 'development';

interface Props {
  readonly label: string;
  readonly items: readonly { id: EditorSection; label: string }[];
  readonly children: (section: EditorSection) => ReactNode;
}

/** Record-local view state only; the parent owns all draft transactions. */
export function EditorRecordSections({ label, items, children }: Props) {
  const { t } = useTranslation();
  const id = useId();
  const [section, setSection] = useState<EditorSection>('general');
  return <>
    <SectionTabs<EditorSection> id={id} label={t(label)}
      items={items.map(item => ({ ...item, label: t(item.label) }))}
      active={section} onChange={setSection}/>
    <div className="editor-record-panel" role="tabpanel" id={id + '-panel'}
      aria-labelledby={id + '-tab-' + section}>
      {children(section)}
    </div>
  </>;
}
