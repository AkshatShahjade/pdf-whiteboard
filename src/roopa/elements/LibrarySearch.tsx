import React, { useState, useEffect, useCallback } from 'react';
import { readDir } from '../../atma/storage/storage_adapter/switch';
import { joinPath } from '../../atma/platform_adapter/switch';
import { TextInput } from '../primitives/TextInput';
import { ButtonFlat } from '../primitives/ButtonFlat';

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
export function useLibrarySearch(
  libraryPath: string | null,
  externalQuery?: string,
  externalSetQuery?: (q: string) => void
) {
  const [localQuery, setLocalQuery] = useState('');
  const query = externalQuery !== undefined ? externalQuery : localQuery;
  const setQuery = externalSetQuery !== undefined ? externalSetQuery : setLocalQuery;
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
  query?: string;
  setQuery?: (q: string) => void;
}

export function LibrarySearch({ libraryPath, onSelectFile, query, setQuery }: LibrarySearchProps) {
  const { query: activeQuery, setQuery: activeSetQuery, results, scanning } = useLibrarySearch(libraryPath, query, setQuery);

  if (!libraryPath) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '12px' }}>
      <div style={{ position: 'relative', width: '100%' }}>
        <TextInput
          placeholder="Search library..."
          value={activeQuery}
          onChange={activeSetQuery}
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
              <div key={file.path} style={{ display: 'flex', width: '100%' }}>
                <div style={{ flex: 1, display: 'flex' }}>
                  <ButtonFlat
                    label={file.name.toLowerCase().endsWith('.tldr') ? file.name.replace(/\.tldr$/i, '') : file.name}
                    icon={file.name.toLowerCase().endsWith('.tldr') ? '🧠' : '📄'}
                    onClick={() => onSelectFile(file.path, file.name)}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
