import { BackupSaveIndicator } from './BackupSaveIndicator';

export function WorkspaceHeader({ title, onHome, onBackup, savedAt, headerVisible, setHeaderVisible }) {
  return (
    <div
      onMouseEnter={() => setHeaderVisible(true)}
      onMouseLeave={() => setHeaderVisible(false)}
      style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '280px', height: headerVisible ? '48px' : '16px', zIndex: 10000, display: 'flex', flexDirection: 'column', alignItems: 'center' }}
    >
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'linear-gradient(to bottom, rgba(59, 130, 246, 0.08), transparent)',
        borderBottom: '1.5px dashed rgba(59, 130, 246, 0.35)',
        borderRadius: '0 0 8px 8px',
        opacity: headerVisible ? 0 : 1,
        transition: 'opacity 0.2s',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-end',
        cursor: 'pointer',
      }}>
        <div style={{
          width: '36px',
          height: '4px',
          background: 'rgba(59, 130, 246, 0.5)',
          borderRadius: '2px',
          marginBottom: '3px',
          boxShadow: '0 0 6px rgba(59, 130, 246, 0.4)'
        }} />
      </div>
      <div style={{ position: 'relative', zIndex: 10001, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', padding: '0 20px', width: '100%', height: '48px', background: 'rgba(38,42,51,0.65)', backdropFilter: 'blur(10px)', borderRadius: '0 0 12px 12px', border: '1px solid rgba(255,255,255,0.1)', borderTop: 'none', transform: headerVisible ? 'translateY(0)' : 'translateY(-100%)', opacity: headerVisible ? 1 : 0, transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
        <button
          onClick={onHome}
          title="Back to home"
          style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #4b5563', background: 'transparent', color: '#e5e7eb', cursor: 'pointer', fontSize: '13px', transition: 'all 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#e5e7eb'; e.currentTarget.style.background = 'transparent'; }}
        >
          ⌂ Home
        </button>
        <BackupSaveIndicator onBackup={onBackup} savedAt={savedAt} />
      </div>
    </div>
  );
}
