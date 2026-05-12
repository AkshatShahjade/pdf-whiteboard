function WorkWindowHeader({ title, onHome, onBackup, savedAt, headerVisible, setHeaderVisible }) {
  return (
    <div
      onMouseEnter={() => setHeaderVisible(true)}
      onMouseLeave={() => setHeaderVisible(false)}
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: headerVisible ? '48px' : '16px', zIndex: 10000, pointerEvents: 'none', display: 'flex', justifyContent: 'center' }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'auto' }} />
      <div style={{ position: 'relative', zIndex: 10001, display: 'flex', alignItems: 'center', gap: '16px', padding: '0 24px', height: '48px', background: 'rgba(38,42,51,0.65)', backdropFilter: 'blur(10px)', borderRadius: '0 0 12px 12px', border: '1px solid rgba(255,255,255,0.1)', borderTop: 'none', pointerEvents: 'auto', transform: headerVisible ? 'translateY(0)' : 'translateY(-100%)', opacity: headerVisible ? 1 : 0, transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
        <button
          onClick={onHome}
          title="Back to home"
          style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #4b5563', background: 'transparent', color: '#e5e7eb', cursor: 'pointer', fontSize: '13px', transition: 'all 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#e5e7eb'; e.currentTarget.style.background = 'transparent'; }}
        >
          ⌂ Home
        </button>
        <span style={{ fontSize: '13px', color: '#f3f4f6', fontWeight: 500, letterSpacing: '0.02em', padding: '0 8px' }}>{title}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', paddingLeft: '8px', borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
          <button
            onClick={onBackup}
            title="Rolling Backup"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '6px', border: '1px solid #4b5563', background: 'transparent', color: '#d1d5db', cursor: 'pointer', fontSize: '11px', fontFamily: "'IBM Plex Mono', monospace", transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#93C5FD'; e.currentTarget.style.borderColor = '#3B82F6'; e.currentTarget.style.background = 'rgba(59,130,246,0.15)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#d1d5db'; e.currentTarget.style.borderColor = '#4b5563'; e.currentTarget.style.background = 'transparent'; }}
          >
            💾 Backup
          </button>
          <div style={{ minWidth: '55px' }}>
            <SaveIndicator savedAt={savedAt} />
          </div>
        </div>
      </div>
    </div>
  );
}


// Opens initially, just a single slot with the content (doesn't have to be a pdf, can also be any other content type)
// Then based on user actions, can also load other contents on another slot that is then made visible.
// There is single slot mode, and then n-slot mode. Extend the logic for 2-slot into n slots (n-1 dividers, and min width for each slot is 100/(n+4) % screen width).
export function WorkWindow({ pdfPath, pdfLocalPath, settings, onHome }) {

  // Layout & UI State
  const [leftPct, setLeftPct]       = useState(restoredSession?.leftPct ?? settings?.defaultSplit ?? 50);
  const [isResizing, setIsResizing] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(false);
  const containerRef = useRef(null);

  // Focus State: determines which shortcuts fire (updated on hover)
  const [activePane, setActivePane] = useState('pdf');

  // Tools & Regions
  const [tool, setTool]                   = useState('select');
  const [regions, setRegions]             = useState(restoredSession?.regions ?? []);
  const [selectedRegionId, setSelectedRegionId] = useState(restoredSession?.selectedRegionId ?? null);
  const [selectedGlobalToolIdx, setSelectedGlobalToolIdx] = useState(restoredSession?.selectedGlobalToolIdx ?? null);
  const [globalToolCount, setGlobalToolCount] = useState(
    Math.max(1, Math.min(restoredSession?.globalToolCount ?? 1, settings?.maxGlobalPdfTools ?? 8))
  );
  const [globalToolLinks, setGlobalToolLinks] = useState(() => {
    const max = settings?.maxGlobalPdfTools ?? 8;
    const count = Math.max(1, Math.min(restoredSession?.globalToolCount ?? 1, max));
    const restored = Array.isArray(restoredSession?.globalToolLinks) ? restoredSession.globalToolLinks : [];
    return Array.from({ length: count }, (_, i) => restored[i] ?? null);
  });
  const [selectPanelToolIdx, setSelectPanelToolIdx] = useState(null);
  const [activeGlobalToolControlsIdx, setActiveGlobalToolControlsIdx] = useState(null);
  const [globalToolDraftId, setGlobalToolDraftId] = useState(null);
  const [globalToolDraftName, setGlobalToolDraftName] = useState('');
  const [newGlobalWhiteboardName, setNewGlobalWhiteboardName] = useState('');
  const [viewStack, setViewStack] = useState([]);
  const [availableWhiteboards, setAvailableWhiteboards] = useState([]);
  const pdfDirectoryPath = useMemo(() => {
    if (!pdfLocalPath) return null;
    const slash = Math.max(pdfLocalPath.lastIndexOf('/'), pdfLocalPath.lastIndexOf('\\'));
    if (slash < 0) return null;
    return pdfLocalPath.slice(0, slash);
  }, [pdfLocalPath]);

  // Toast State
  const [toast, setToast] = useState(null);
  const showToast = useCallback((msg, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => { dragStateRef.current = { currentDrag, movingRegion, lassoPoints }; }, [currentDrag, movingRegion, lassoPoints]);


  // Keyboard Shortcuts (Capture Phase)
  const handleKeyDown = useCallback((e) => {
    const target = e.target;
    const activeEl = document.activeElement;
    const isTyping = (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      target.isContentEditable ||
      activeEl?.tagName === 'INPUT' ||
      activeEl?.tagName === 'TEXTAREA' ||
      activeEl?.tagName === 'SELECT' ||
      activeEl?.isContentEditable
    );
    if (isTyping) return;

    if (e.key === '\\' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      if (!selectedRegionId && selectedGlobalToolIdx === null) return;
      setLeftPct(55);
      return;
    }

    if (e.key === '0' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      setZoom(1);
      return;
    }

    // Global tool shortcuts: I->1, II->2, III->3, ...
    if (!e.ctrlKey && !e.metaKey && !e.altKey) {
      const n = Number.parseInt(e.key, 10);
      if (!Number.isNaN(n) && n >= 1 && n <= globalToolCount) {
        e.preventDefault();
        const btn = document.querySelector(`button[title="Global Whiteboard Tool ${n}"]`);
        if (btn) btn.click();
        return;
      }
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (editingShapeId) {
         setEditingShapeId(null);
         setShapeBackup(null);
         setTool('select');
      } else if (tool === 'section' && sectionY.start !== null && sectionY.end !== null) {
         const y1 = Math.min(sectionY.start, sectionY.end);
         const y2 = Math.max(sectionY.start, sectionY.end);
         if (editingSectionId) {
             setRegions(prev => prev.map(r => r.id === editingSectionId ? { ...r, y: y1, h: y2 - y1 } : r));
             setSelectedRegionId(editingSectionId);
             setEditingSectionId(null);
         } else {
             const newId = `reg_${Date.now()}`;
             setRegions(prev => [...prev, { id: newId, type: 'section', x: 0, y: y1, w: 16, h: y2 - y1 }]);
             setSelectedRegionId(newId);
         }
         setTool('select');
      }
      return;
    }

    if (e.key === 'Escape') {
      if (editingShapeId) {
         setRegions(prev => prev.map(r => r.id === shapeBackup?.id ? shapeBackup : r));
         setEditingShapeId(null);
         setShapeBackup(null);
         setTool('select');
      } else if (tool === 'section' && (editingSectionId || sectionY.start !== null || sectionY.end !== null)) {
         setEditingSectionId(null);
         setSectionY({ start: null, end: null });
         setSectionTarget('start');
         setTool('select');
      } else if (editingSectionId) {
         setEditingSectionId(null);
         setTool('select');
      } else if (selectPanelToolIdx !== null) {
         setSelectPanelToolIdx(null);
      } else if (selectedGlobalToolIdx !== null) {
         const prevView = viewStack[viewStack.length - 1];
         if (prevView) {
           setViewStack(prev => prev.slice(0, -1));
           if (prevView.type === 'global') {
             setSelectedRegionId(null);
             setSelectedGlobalToolIdx(prevView.idx);
             setActiveGlobalToolControlsIdx(prevView.idx);
           } else if (prevView.type === 'region') {
             setSelectedGlobalToolIdx(null);
             setActiveGlobalToolControlsIdx(null);
             setSelectedRegionId(prevView.id);
           }
         } else {
           setSelectedGlobalToolIdx(null);
           setActiveGlobalToolControlsIdx(null);
         }
      } else {
         setSelectedRegionId(null);
      }
      return;
    }

    if (activePane === 'pdf') {
      const k = e.key.toLowerCase();
      if (k === 'v') setTool('select');
      else if (k === 'r') setTool('rect');
      else if (k === 'c') setTool('lasso');
      else if (k === 's') setTool(t => t === 'section' ? 'select' : 'section');
      else if (k === 'x') setTool('remove');
      e.stopPropagation();
    }
  }, [activePane, selectedRegionId, selectedGlobalToolIdx, editingShapeId, shapeBackup, editingSectionId, sectionY, tool, selectPanelToolIdx, viewStack, globalToolCount]);

  

  const debouncedSaveSession = useMemo(
    () => debounce((data) => {
      saveSession(pdfPath, data);
      setLastSavedAt(Date.now());
    }, 600),
    [pdfPath]
  );

  const leftPctRef          = useRef(leftPct);
  useEffect(() => { leftPctRef.current = leftPct; }, [leftPct]);
  
  const persistSession = useCallback(() => {
    debouncedSaveSession({
      leftPct:          leftPctRef.current,
    })
  });

  useEffect(() => { persistSession(); }, [regions, selectedRegionId, leftPct, persistSession]);

  useEffect(() => {
    const onUnload = () => {
      debouncedSaveSession.flush({
        leftPct:          leftPctRef.current,
      });
    };
  window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, [debouncedSaveSession]);
  

  const handleBackup = async () => {
    try {
      const idx = await performRollingBackup();
      showToast(`Workspace backed up! (backup_${idx}.json)`, 'success');
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  
  const activeWhiteboardId = selectedRegionId ?? (selectedGlobalToolIdx !== null ? globalToolLinks[selectedGlobalToolIdx] : null);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100vh', display: 'flex', overflow: 'hidden', background: '#1c1f26', fontFamily: "'IBM Plex Mono', monospace", userSelect: isResizing ? 'none' : 'auto', maxWidth: '100vw', position: 'relative' }}
    >
      <style>{`
        ::-webkit-scrollbar { width: 14px; height: 14px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.5); border-radius: 7px; border: 4px solid transparent; background-clip: padding-box; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.7); }
      `}</style>

      {/* Global Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
          background: toast.type === 'error' ? 'rgba(239, 68, 68, 0.95)' : 'rgba(16, 185, 129, 0.95)',
          backdropFilter: 'blur(8px)', border: `1px solid ${toast.type === 'error' ? '#F87171' : '#34D399'}`,
          color: '#fff', padding: '10px 20px', borderRadius: '8px', zIndex: 9999,
          fontSize: '12px', fontWeight: '500', boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', gap: '8px', animation: 'fadeInUp 0.3s ease-out forwards'
        }}>
          {toast.type === 'error' ? '⚠' : '✓'} {toast.msg}
        </div>
      )}
      <style>{`@keyframes fadeInUp { from { opacity: 0; transform: translate(-50%, 10px); } to { opacity: 1; transform: translate(-50%, 0); } }`}</style>

      <WorkWindowHeader
        title={decodeURIComponent(pdfPath).split(/[/\\]/).pop()}
        onHome={onHome}
        onBackup={handleBackup}
        savedAt={lastSavedAt}
        headerVisible={headerVisible}
        setHeaderVisible={setHeaderVisible}
      />

      <left_pdf_pane/>

      {/* If right pane is open: */}

      {/* The divider */}
      {activeWhiteboardId && (
        <div onMouseDown={(e) => { e.preventDefault(); setIsResizing(true); }} style={{ width: '6px', flexShrink: 0, cursor: 'col-resize', zIndex: 20, background: isResizing ? '#3B82F6' : '#262a33', borderLeft: '1px solid #374151', borderRight: '1px solid #374151', transition: isResizing ? 'none' : 'background 0.2s', position: 'relative' }} />
      )}

      {/* The right Pane */}

      {activeWhiteboardId && (
        <right_whiteboard_pane/>
      )}

      {/* Most probably unnecesary code: */}

      {!activeWhiteboardId && (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '0px', overflow: 'hidden' }} />
      )}
    </div>
  );
}