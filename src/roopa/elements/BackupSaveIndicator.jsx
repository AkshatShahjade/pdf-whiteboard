import { useEffect, useRef, useState } from 'react';
import { ButtonFlat } from '../primitives/ButtonFlat';
export function SaveIndicator({ savedAt }) {
  const [visible, setVisible] = useState(false);
  const prev = useRef(null);

  useEffect(() => {
    if (savedAt && savedAt !== prev.current) {
      prev.current = savedAt;
      setVisible(true);
      const t = setTimeout(() => setVisible(false), 1800);
      return () => clearTimeout(t);
    }
  }, [savedAt]);

  return (
    <span style={{ fontSize: '10px', color: visible ? '#34D399' : 'transparent', transition: 'color 0.4s', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>
      ✓ saved
    </span>
  );
}

export function BackupSaveIndicator({ onBackup, savedAt }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', paddingLeft: '8px', borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
      <ButtonFlat label="Backup" icon="💾" onClick={onBackup} />
      <div style={{ minWidth: '55px' }}>
        <SaveIndicator savedAt={savedAt} />
      </div>
    </div>
  );
}
