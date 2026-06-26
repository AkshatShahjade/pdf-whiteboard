import React, { useState, useEffect } from 'react';
import { MarkRepository } from '../../atma/storage/repositories/MarkRepository';
import { LastUIStateRepository } from '../../atma/storage/repositories/LastUIStateRepository';

// --- Capability Hook ---
export function useRecentCardData(path: string) {
  const [marksCount, setMarksCount] = useState(0);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    if (!path || path.startsWith('whiteboard:')) return;
    MarkRepository.loadMarksByContentId(path).then(m => setMarksCount(m?.length || 0)).catch(() => {});
    LastUIStateRepository.loadSessionState(path).then(s => setSession(s)).catch(() => {});
  }, [path]);

  return { marksCount, session };
}

// --- Renderer Component ---
interface RecentCardProps {
  entry: { path: string; name?: string; openedAt?: number };
  onOpen: (entry: any) => void;
  onRemove: (path: string) => void;
}

export function RecentCard({ entry, onOpen, onRemove }: RecentCardProps) {
  const [hovered, setHovered] = useState(false);
  const { marksCount, session } = useRecentCardData(entry.path);
  const name = entry.name || entry.path.split('/').pop() || '';

  const timeAgo = (ts?: number) => {
    if (!ts) return '';
    const d = Math.floor((Date.now() - ts) / 1000);
    if (d < 60)   return 'just now';
    if (d < 3600) return `${Math.floor(d / 60)}m ago`;
    if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
    return `${Math.floor(d / 86400)}d ago`;
  };

  return (
    <div
      onMouseEnter={() => setHovered(true)} 
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative', 
        border: `1px solid ${hovered ? '#3B82F6' : '#2a2e39'}`, 
        borderRadius: '8px', 
        padding: '16px 18px', 
        cursor: 'pointer', 
        background: hovered ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.03)', 
        transition: 'all 0.15s', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '6px',
      }}
      onClick={() => onOpen(entry)}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(entry.path); }}
        style={{ 
          position: 'absolute', 
          top: '10px', 
          right: '10px', 
          background: 'none', 
          border: 'none', 
          cursor: 'pointer', 
          color: '#6b7280', 
          fontSize: '13px', 
          padding: '2px 5px', 
          opacity: hovered ? 1 : 0, 
          transition: 'opacity 0.15s', 
          borderRadius: '4px' 
        }}
        title="Remove from recents"
      >✕</button>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '18px', opacity: 0.8 }}>
          {entry.path.startsWith('whiteboard:') ? '🧠' : '📄'}
        </span>
        <span style={{ fontSize: '12px', fontWeight: '600', color: '#f3f4f6', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>
          {name}
        </span>
      </div>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <span style={{ fontSize: '10px', color: '#9ca3af' }}>{timeAgo(entry.openedAt)}</span>
        {marksCount > 0 && (
          <span style={{ fontSize: '9px', padding: '1px 6px', borderRadius: '10px', background: 'rgba(59,130,246,0.15)', color: '#93C5FD', border: '1px solid rgba(59,130,246,0.3)' }}>
            {marksCount} mark{marksCount !== 1 ? 's' : ''}
          </span>
        )}
        {session?.scrollTop > 0 && (
          <span style={{ fontSize: '9px', color: '#6b7280' }}>
            p.{Math.ceil(session.scrollTop / 1100) + 1}
          </span>
        )}
      </div>
    </div>
  );
}
