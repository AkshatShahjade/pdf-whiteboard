import React, { useState, useEffect, useCallback } from 'react';
import { readDir } from '../../atma/storage/storage_adapter/switch';
import { joinPath } from '../../atma/platform_adapter/switch';

// --- Recursive scanner helper ---
async function scanDirectory(dir: string): Promise<Array<{ name: string; path: string }>> {
  const results: Array<{ name: string; path: string }> = [];
  try {
    const items = await readDir(dir);
    for (const item of items) {
      const fullPath = await joinPath(dir, item.name);
      if (item.isDirectory) {
        const subItems = await scanDirectory(fullPath);
        results.push(...subItems);
      } else if (item.isFile) {
        const lower = item.name.toLowerCase();
        if (lower.endsWith('.pdf') || lower.endsWith('.tldr')) {
          results.push({ name: item.name, path: fullPath });
        }
      }
    }
  } catch (err) {
    console.error("Error scanning directory:", dir, err);
  }
  return results;
}

// --- Capability Hook ---
export function useLibrarySearch(libraryPath: string | null) {
  const [query, setQuery] = useState('');
  const [allFiles, setAllFiles] = useState<Array<{ name: string; path: string }>>([]);
  const [results, setResults] = useState<Array<{ name: string; path: string }>>([]);
  const [scanning, setScanning] = useState(false);

  const rescan = useCallback(async () => {
    if (!libraryPath) return;
    setScanning(true);
    try {
      const files = await scanDirectory(libraryPath);
      setAllFiles(files);
    } catch (e) {
      console.error(e);
    } finally {
      setScanning(false);
    }
  }, [libraryPath]);

  // scan on mount or when libraryPath changes
  useEffect(() => {
    rescan();
  }, [libraryPath, rescan]);

  // filter files whenever query or allFiles changes
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const q = query.toLowerCase().trim();
    const filtered = allFiles.filter(f => f.name.toLowerCase().includes(q));
    setResults(filtered);
  }, [query, allFiles]);

  return {
    query,
    setQuery,
    results,
    scanning,
    rescan,
  };
}

// --- Renderer Component ---
interface LibrarySearchProps {
  libraryPath: string | null;
  onSelectFile: (filePath: string, name: string) => void;
}

export function LibrarySearch({ libraryPath, onSelectFile }: LibrarySearchProps) {
  const { query, setQuery, results, scanning } = useLibrarySearch(libraryPath);

  if (!libraryPath) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '12px' }}>
      <div style={{ position: 'relative', width: '100%' }}>
        <input
          type="text"
          placeholder="Search library..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            width: '100%',
            background: '#1c1f26',
            border: '1px solid #4b5563',
            color: '#e5e7eb',
            borderRadius: '8px',
            padding: '10px 12px 10px 36px',
            fontSize: '13px',
            outline: 'none',
            fontFamily: 'inherit',
            transition: 'border-color 0.2s, box-shadow 0.2s',
          }}
          onFocus={e => {
            e.currentTarget.style.borderColor = '#3B82F6';
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.25)';
          }}
          onBlur={e => {
            e.currentTarget.style.borderColor = '#4b5563';
            e.currentTarget.style.boxShadow = 'none';
          }}
        />
        <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: '14px', pointerEvents: 'none' }}>
          🔍
        </span>
      </div>

      {scanning && (
        <div style={{ fontSize: '11px', color: '#9ca3af', textAlign: 'center', margin: '4px 0' }}>
          Scanning library directory...
        </div>
      )}

      {query.trim() && (
        <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '320px' }}>
          <div style={{ fontSize: '10px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
            Search Results ({results.length})
          </div>
          {results.length === 0 ? (
            <span style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center', padding: '16px 0' }}>
              No matches found.
            </span>
          ) : (
            results.map(file => (
              <button
                key={file.path}
                onClick={() => onSelectFile(file.path, file.name)}
                style={{
                  textAlign: 'left',
                  padding: '12px',
                  borderRadius: '6px',
                  background: '#262a33',
                  border: '1px solid #374151',
                  color: '#e5e7eb',
                  cursor: 'pointer',
                  fontSize: '13px',
                  transition: 'all 0.15s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = '#3B82F6';
                  e.currentTarget.style.background = 'rgba(59,130,246,0.1)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = '#374151';
                  e.currentTarget.style.background = '#262a33';
                }}
              >
                <span style={{ fontSize: '16px', opacity: 0.9 }}>
                  {file.name.toLowerCase().endsWith('.tldr') ? '🧠' : '📄'}
                </span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {file.name.toLowerCase().endsWith('.tldr') ? file.name.replace(/\.tldr$/i, '') : file.name}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
