function LazyPage({ pageNumber, width, scale }) {
  const [isVisible, setIsVisible] = useState(pageNumber <= 2);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { rootMargin: '800px 0px' }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const placeholderHeight = width * scale * 1.414;

  return (
    <div ref={ref} style={{ minHeight: placeholderHeight, position: 'relative', borderBottom: '2px solid rgba(0, 0, 0, 0.92)' }}>
      {isVisible && (
        <Page pageNumber={pageNumber} width={width} scale={scale} renderTextLayer={false} renderAnnotationLayer={false} />
      )}
    </div>
  );
}

function left_pdf_pane(){
  const PDF_WIDTH = 800;

  // PDF
  const [numPages, setNumPages]   = useState(null);
  const [pdfReady, setPdfReady]   = useState(false);
  const [pdfData, setPdfData]     = useState(null);
  const pdfScrollRef = useRef(null);
  const documentFile = useMemo(() => pdfData ? { data: pdfData } : null, [pdfData]);
  const restoredSession = useMemo(() => loadSession(pdfPath), [pdfPath]);

  
  return (
    <div
      onMouseEnter={() => setActivePane('pdf')}
      style={{ width: activeWhiteboardId ? `${leftPct}%` : '100%', height: '100%', flexShrink: 0, position: 'relative', transition: activeWhiteboardId ? 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)' : 'width 0.3s ease' }}
    >
      <div ref={pdfScrollRef} onScroll={handleScroll} style={{ width: '100%', height: '100%', overflow: 'auto', textAlign: 'center', background: '#262a33', position: 'relative' }}>
        <div ref={pdfContentRef} onMouseDown={handleDivMouseDown} onMouseMove={handleDivMouseMove} onMouseUp={handleDivMouseUp} style={{ position: 'relative', margin: '24px', background: 'white', display: 'inline-block', textAlign: 'left', cursor: pdfCursor, boxShadow: '0 8px 40px rgba(0,0,0,0.6)' }}>
          {documentFile ? (
            <Document file={documentFile} onLoadSuccess={({ numPages }) => { setNumPages(numPages); setPdfReady(true); }} onLoadError={(error) => console.error("PDF Load Error:", error)}>
              {Array.from({ length: numPages ?? 0 }, (_, i) => (
                <LazyPage key={`${pdfPath}-${i}`} pageNumber={i + 1} width={PDF_WIDTH} scale={zoom} />
              ))}
            </Document>
          ) : (
            <div style={{ padding: '40px', color: '#9ca3af', fontSize: '12px', textAlign: 'center' }}>Loading document into memory...</div>
          )}

          {/* Scaled SVG overlay */}
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', zIndex: 10, pointerEvents: 'none' }}>

            {tool === 'section' && sectionY.start !== null && <line x1={0} x2={PDF_WIDTH * zoom} y1={sectionY.start * zoom} y2={sectionY.start * zoom} stroke="#10B981" strokeWidth={1.5} strokeDasharray="6 4" />}
            {tool === 'section' && sectionY.end !== null && <line x1={0} x2={PDF_WIDTH * zoom} y1={sectionY.end * zoom} y2={sectionY.end * zoom} stroke="#10B981" strokeWidth={1.5} strokeDasharray="6 4" />}

            {regions.map((r, idx) => {
              const color      = regionColor(r.id);
              const isSelected = selectedRegionId === r.id;
              const rx = r.x * zoom, ry = r.y * zoom, rw = r.w * zoom, rh = r.h * zoom;

              if (r.type === 'section') {
                const sw = sectionWidths[r.id];
                const leftW = sw * zoom;
                const rightX = PDF_WIDTH * zoom - leftW;
                return (
                  <g key={r.id}>
                    <g style={{ pointerEvents: 'auto' }} onMouseDown={(e) => { if (e.ctrlKey || e.metaKey) return; if (tool === 'section' || tool === 'rect' || tool === 'lasso') return; e.stopPropagation(); }} onClick={(e) => { if (e.ctrlKey || e.metaKey) return; handleBorderClick(e, r.id); }}>
                      <rect x={0} y={ry} width={Math.max(leftW, 24 * zoom)} height={rh} fill="transparent" style={{ cursor: tool === 'select' ? 'pointer' : 'crosshair' }} />
                    </g>
                    <rect x={0} y={ry} width={leftW} height={rh} fill={color} opacity={isSelected ? 0.66 : 0.33} style={{ transition: 'opacity 0.15s', pointerEvents: 'none' }} />
                    <rect x={leftW + 2} y={ry + 4} width={28} height={15} fill={color} rx={2} style={{ pointerEvents: 'none' }} />
                    <text x={leftW + 16} y={ry + 14} textAnchor="middle" fill="white" fontSize={9} fontWeight="700" style={{ pointerEvents: 'none' }}>{`S${idx + 1}`}</text>

                    <g style={{ pointerEvents: 'auto' }} onMouseDown={(e) => { if (e.ctrlKey || e.metaKey) return; if (tool === 'section' || tool === 'rect' || tool === 'lasso') return; e.stopPropagation(); }} onClick={(e) => { if (e.ctrlKey || e.metaKey) return; handleBorderClick(e, r.id); }}>
                      <rect x={rightX} y={ry} width={Math.max(leftW, 24 * zoom)} height={rh} fill="transparent" style={{ cursor: tool === 'select' ? 'pointer' : 'crosshair' }} />
                    </g>
                    <rect x={rightX} y={ry} width={leftW} height={rh} fill={color} opacity={isSelected ? 0.66 : 0.33} style={{ transition: 'opacity 0.15s', pointerEvents: 'none' }} />
                    <rect x={rightX - 30} y={ry + 4} width={28} height={15} fill={color} rx={2} style={{ pointerEvents: 'none' }} />
                    <text x={rightX - 16} y={ry + 14} textAnchor="middle" fill="white" fontSize={9} fontWeight="700" style={{ pointerEvents: 'none' }}>{`S${idx + 1}`}</text>
                  </g>
                );
              }

              if (r.type === 'lasso') {
                const pointsStr = r.points.map(p => `${rx + (p.x * zoom)},${ry + (p.y * zoom)}`).join(' ');
                return (
                  <g key={r.id}>
                    <g style={{ pointerEvents: 'auto' }} onMouseDown={(e) => { if (e.ctrlKey || e.metaKey) return; if (tool === 'rect' || tool === 'section' || tool === 'lasso') return; e.stopPropagation(); }} onClick={(e) => { if (e.ctrlKey || e.metaKey) return; handleBorderClick(e, r.id); }}>
                      <polygon points={pointsStr} fill="transparent" stroke="transparent" strokeWidth={STROKE_HIT_WIDTH} style={{ pointerEvents: 'stroke', cursor: tool === 'select' ? 'pointer' : 'crosshair' }} />
                    </g>
                    <polygon points={pointsStr} fill={isSelected ? `${color}1A` : 'none'} stroke={color} strokeWidth={isSelected ? 2 : 1.5} strokeDasharray={isSelected ? 'none' : '7 3'} style={{ pointerEvents: 'none', transition: 'fill 0.15s, stroke-width 0.1s' }} />
                    <rect x={rx + 1} y={ry + 1} width={28} height={15} fill={color} rx={2} style={{ pointerEvents: 'none' }} />
                    <text x={rx + 15} y={ry + 11} textAnchor="middle" fill="white" fontSize={9} fontFamily="'IBM Plex Mono', monospace" fontWeight="700" style={{ pointerEvents: 'none' }}>{`R${idx + 1}`}</text>
                  </g>
                );
              }

              return (
                <g key={r.id}>
                  <g style={{ pointerEvents: 'auto' }} onMouseDown={(e) => { if (e.ctrlKey || e.metaKey) return; if (tool === 'rect' || tool === 'section' || tool === 'lasso') return; e.stopPropagation(); }} onClick={(e) => { if (e.ctrlKey || e.metaKey) return; handleBorderClick(e, r.id); }}>
                    <rect x={rx} y={ry} width={rw} height={rh} fill="none" stroke="transparent" strokeWidth={STROKE_HIT_WIDTH} style={{ pointerEvents: 'stroke', cursor: tool === 'select' ? 'pointer' : 'crosshair' }} />
                  </g>
                  <rect x={rx} y={ry} width={rw} height={rh} fill={isSelected ? `${color}1A` : 'none'} stroke={color} strokeWidth={isSelected ? 2 : 1.5} strokeDasharray={isSelected ? 'none' : '7 3'} rx={2} style={{ pointerEvents: 'none', transition: 'fill 0.15s, stroke-width 0.1s' }} />
                  <rect x={rx + 1} y={ry + 1} width={28} height={15} fill={color} rx={2} style={{ pointerEvents: 'none' }} />
                  <text x={rx + 15} y={ry + 11} textAnchor="middle" fill="white" fontSize={9} fontFamily="'IBM Plex Mono', monospace" fontWeight="700" style={{ pointerEvents: 'none' }}>{`R${idx + 1}`}</text>
                </g>
              );
            })}

            {currentDrag && (() => {
              const { x, y, w, h } = rectFromDrag(currentDrag);
              return (
                <rect x={x * zoom} y={y * zoom} width={w * zoom} height={h * zoom} fill="rgba(59,130,246,0.1)" stroke="#3B82F6" strokeWidth={1.5} strokeDasharray="5 4" rx={2} style={{ pointerEvents: 'none' }} />
              );
            })()}

            {lassoPoints && lassoPoints.length > 0 && (
              <polyline points={lassoPoints.map(p => `${p.x * zoom},${p.y * zoom}`).join(' ')} fill="rgba(59,130,246,0.1)" stroke="#3B82F6" strokeWidth={1.5} strokeDasharray="5 4" style={{ pointerEvents: 'none' }} />
            )}
          </svg>
        </div>
      </div>

      {/* ── BOTTOM NAV: Page Control ── */}
      <div style={{ position: 'absolute', bottom: '24px', left: '50%', transform: 'translateX(-50%)', zIndex: 50, display: 'flex', gap: '8px', alignItems: 'center', background: 'rgba(38,42,51,0.65)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', padding: '6px 16px', borderRadius: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', pointerEvents: 'auto' }}>
        <span style={{ fontSize: '11px', color: '#9ca3af' }}>Page</span>
        <input
          id="page-input" type="text" value={pageInput}
          onChange={e => setPageInput(e.target.value)}
          onKeyDown={handlePageSubmit}
          onBlur={() => setPageInput(String(currentPage))}
          style={{ width: '36px', background: 'rgba(0,0,0,0.3)', border: '1px solid #4b5563', color: '#fff', textAlign: 'center', borderRadius: '4px', fontSize: '11px', padding: '2px 0', outline: 'none' }}
        />
        <span style={{ fontSize: '11px', color: '#9ca3af' }}>/ {numPages || '-'}</span>
      </div>

      {/* ── TOOLBOX (Vertical, Bottom Right) ── */}
      <div style={{ position: 'absolute', bottom: '24px', right: '24px', zIndex: 50, display: 'flex', flexDirection: 'column', gap: '8px', pointerEvents: 'auto' }}>
        <div style={{ background: 'rgba(38,42,51,0.65)', backdropFilter: 'blur(10px)', borderRadius: '8px', padding: '6px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
          {[
            { id: 'select', label: 'Select', key: 'V', icon: '↖' },
            { id: 'rect',   label: 'Freeform', key: 'R', icon: '▭' },
            { id: 'lasso',  label: 'Lasso', key: 'C', icon: '∿' },
            { id: 'section',label: 'Section', key: 'S', icon: '⬍' },
            { id: 'remove', label: 'Remove', key: 'X', icon: '✕' },
          ].map(({ id, label, key, icon }) => (
            <div key={id} style={{ position: 'relative' }}>
              <button onClick={() => { setSelectedGlobalToolIdx(null); setActiveGlobalToolControlsIdx(null); setSelectPanelToolIdx(null); if (tool === 'section' && id === 'section') setTool('select'); else setTool(id); }} title={`${label} [${key}]`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '6px', border: `1px solid ${tool === id ? '#3B82F6' : 'transparent'}`, background: tool === id ? 'rgba(59,130,246,0.2)' : 'transparent', color: tool === id ? '#93C5FD' : '#d1d5db', cursor: 'pointer', fontSize: '18px', transition: 'all 0.15s' }} onMouseEnter={e => { if (tool !== id) { e.currentTarget.style.color='#fff'; e.currentTarget.style.background='rgba(255,255,255,0.1)'; } }} onMouseLeave={e => { if (tool !== id) { e.currentTarget.style.color='#d1d5db'; e.currentTarget.style.background='transparent'; } }}>
                {icon}
              </button>

              {/* ── SECTION MINI MENU ── */}
              {tool === 'section' && id === 'section' && (
                <div style={{ position: 'absolute', right: 'calc(100% + 12px)', top: '50%', transform: 'translateY(-50%)', background: 'rgba(38,42,51,0.85)', backdropFilter: 'blur(10px)', borderRadius: '8px', padding: '6px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', alignItems: 'center' }}>
                  {(() => {
                    const color = sectionY.start !== null ? '#10B981' : '#F87171';
                    const isActive = sectionTarget === 'start';
                    return (<button onClick={() => setSectionTarget('start')} style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', border: `1px solid ${color}`, background: isActive ? `${color}40` : 'transparent', color: color, transition: 'all 0.15s' }}>Start</button>);
                  })()}
                  {(() => {
                    const color = sectionY.end !== null ? '#10B981' : '#F87171';
                    const isActive = sectionTarget === 'end';
                    return (<button onClick={() => setSectionTarget('end')} style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', border: `1px solid ${color}`, background: isActive ? `${color}40` : 'transparent', color: color, transition: 'all 0.15s' }}>End</button>);
                  })()}
                  {(() => {
                    const canConfirm = sectionY.start !== null && sectionY.end !== null;
                    return (
                      <>
                        <button disabled={!canConfirm} onClick={() => {
                            const y1 = Math.min(sectionY.start, sectionY.end);
                            const y2 = Math.max(sectionY.start, sectionY.end);
                            if (editingSectionId) {
                              setRegions(prev => prev.map(r => r.id === editingSectionId ? { ...r, y: y1, h: y2 - y1 } : r));
                              setSelectedRegionId(editingSectionId);
                              setSelectedGlobalToolIdx(null);
                              setEditingSectionId(null);
                            } else {
                              const newId = `reg_${Date.now()}`;
                              setRegions(prev => [...prev, { id: newId, type: 'section', x: 0, y: y1, w: 16, h: y2 - y1 }]);
                              setSelectedRegionId(newId);
                              setSelectedGlobalToolIdx(null);
                            }
                            setTool('select');
                          }}
                          style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: canConfirm ? 'pointer' : 'not-allowed', border: `1px solid ${canConfirm ? '#3B82F6' : '#4b5563'}`, background: canConfirm ? 'rgba(59,130,246,0.2)' : 'transparent', color: canConfirm ? '#93C5FD' : '#6b7280', transition: 'all 0.15s' }}
                        >
                          {editingSectionId ? 'Update' : 'Confirm'}
                        </button>

                        <button onClick={() => { setEditingSectionId(null); setSectionY({ start: null, end: null }); setSectionTarget('start'); setTool('select'); }}
                          style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', border: `1px solid #F87171`, background: 'transparent', color: '#F87171', transition: 'all 0.15s' }}
                        >
                          Cancel
                        </button>
                      </>
                    );
                  })()}
                </div>
              )}

              {/* ── SHAPE EDIT MINI MENU (Rect/Lasso) ── */}
              {editingShapeId && tool === id && (id === 'rect' || id === 'lasso') && (
                <div style={{ position: 'absolute', right: 'calc(100% + 12px)', top: '50%', transform: 'translateY(-50%)', background: 'rgba(38,42,51,0.85)', backdropFilter: 'blur(10px)', borderRadius: '8px', padding: '6px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', alignItems: 'center' }}>
                  <button onClick={() => { setRegions(prev => prev.map(r => r.id === shapeBackup?.id ? shapeBackup : r)); setEditingShapeId(null); setShapeBackup(null); setTool('select'); }} style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', border: `1px solid #F87171`, background: 'transparent', color: '#F87171', transition: 'all 0.15s' }}>Cancel</button>
                  <button onClick={() => { setEditingShapeId(null); setShapeBackup(null); setTool('select'); }} style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', border: `1px solid #3B82F6`, background: 'rgba(59,130,246,0.2)', color: '#93C5FD', transition: 'all 0.15s' }}>Update</button>
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ background: 'rgba(38,42,51,0.65)', backdropFilter: 'blur(10px)', borderRadius: '8px', padding: '6px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
          {Array.from({ length: globalToolCount }, (_, idx) => {
            const linkedId = globalToolLinks[idx];
            const isActive = selectedGlobalToolIdx === idx;
            const showControls = activeGlobalToolControlsIdx === idx && !!linkedId;
            const showSelectPanel = selectPanelToolIdx === idx;
            return (
              <div key={`gtool-${idx}`} style={{ position: 'relative' }}>
                <button
                  onClick={() => handleOpenGlobalTool(idx)}
                  title={`Global Whiteboard Tool ${idx + 1}`}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '6px', border: `1px solid ${isActive ? '#3B82F6' : 'transparent'}`, background: isActive ? 'rgba(59,130,246,0.2)' : 'transparent', color: isActive ? '#93C5FD' : '#d1d5db', cursor: 'pointer', fontSize: '16px' }}
                >
                  {toRoman(idx + 1)}
                </button>
                {showControls && (
                  <div style={{ position: 'absolute', right: 'calc(100% + 12px)', top: '50%', transform: 'translateY(-50%)', background: 'rgba(38,42,51,0.9)', backdropFilter: 'blur(10px)', borderRadius: '8px', padding: '6px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: '8px', alignItems: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                    <button onClick={() => {
                      setSelectPanelToolIdx(idx);
                      setActiveGlobalToolControlsIdx(null);
                      const found = allWhiteboards.find((wb) => wb.id === linkedId);
                      setGlobalToolDraftId(linkedId);
                      setGlobalToolDraftName(found?.name || 'Whiteboard');
                    }} style={{ padding: '6px 10px', borderRadius: '6px', fontSize: '11px', border: '1px solid #3B82F6', background: 'rgba(59,130,246,0.2)', color: '#93C5FD', cursor: 'pointer' }}>Update</button>
                    <button onClick={() => {
                      setSelectedGlobalToolIdx(null);
                      setSelectedRegionId(null);
                      setActiveGlobalToolControlsIdx(null);
                      setSelectPanelToolIdx(null);
                      setViewStack([]);
                    }} style={{ padding: '6px 10px', borderRadius: '6px', fontSize: '11px', border: '1px solid #4b5563', background: 'transparent', color: '#d1d5db', cursor: 'pointer' }}>Close</button>
                    {globalToolCount > 1 && (
                      <button onClick={async () => {
                        const yes = await confirm('Delete this global whiteboard tool?', { title: 'Delete Tool', kind: 'warning' });
                        if (!yes) return;
                        setGlobalToolLinks((prev) => prev.filter((_, i) => i !== idx));
                        setGlobalToolCount((c) => Math.max(1, c - 1));
                        setActiveGlobalToolControlsIdx(null);
                        setSelectPanelToolIdx(null);
                        setViewStack([]);
                        if (selectedGlobalToolIdx === idx) setSelectedGlobalToolIdx(null);
                        else if (selectedGlobalToolIdx > idx) setSelectedGlobalToolIdx((prev) => (prev === null ? null : prev - 1));
                      }} style={{ padding: '6px 10px', borderRadius: '6px', fontSize: '11px', border: '1px solid #F87171', background: 'transparent', color: '#F87171', cursor: 'pointer' }}>Delete Tool</button>
                    )}
                  </div>
                )}

                {showSelectPanel && (
                  <div style={{ position: 'absolute', right: 'calc(100% + 12px)', top: '50%', transform: 'translateY(-50%)', zIndex: 80, width: '320px', background: 'rgba(28,31,38,0.96)', border: '1px solid #374151', borderRadius: '8px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <div style={{ fontSize: '10px', color: '#9ca3af', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Tool {toRoman(idx + 1)}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button onClick={handleCreateFromPanel} style={{ padding: '5px 9px', borderRadius: '6px', border: '1px solid #3B82F6', background: 'rgba(59,130,246,0.2)', color: '#93C5FD', cursor: 'pointer', fontSize: '11px' }}>Create</button>
                        <button onClick={() => { setSelectPanelToolIdx(null); setNewGlobalWhiteboardName(''); }} style={{ padding: '5px 9px', borderRadius: '6px', border: '1px solid #F87171', background: 'transparent', color: '#F87171', cursor: 'pointer', fontSize: '11px' }}>Cancel</button>
                        {globalToolCount > 1 && (
                          <button
                            onClick={async () => {
                              const yes = await confirm('Delete this global whiteboard tool?', { title: 'Delete Tool', kind: 'warning' });
                              if (!yes) return;
                              setGlobalToolLinks((prev) => prev.filter((_, i) => i !== idx));
                              setGlobalToolCount((c) => Math.max(1, c - 1));
                              setSelectPanelToolIdx(null);
                              setViewStack([]);
                              if (selectedGlobalToolIdx === idx) setSelectedGlobalToolIdx(null);
                              else if (selectedGlobalToolIdx > idx) setSelectedGlobalToolIdx((prev) => (prev === null ? null : prev - 1));
                            }}
                            style={{ padding: '5px 9px', borderRadius: '6px', border: '1px solid #F87171', background: 'transparent', color: '#F87171', cursor: 'pointer', fontSize: '11px' }}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                    <div style={{ maxHeight: '182px', overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {allWhiteboards.map((wb) => (
                        <button
                          key={wb.id}
                          onClick={() => handleApplyGlobalToolSelection(idx, wb.id, wb.name)}
                          style={{ textAlign: 'left', padding: '8px 10px', borderRadius: '6px', border: `1px solid ${globalToolDraftId === wb.id ? '#3B82F6' : '#374151'}`, background: globalToolDraftId === wb.id ? 'rgba(59,130,246,0.18)' : '#262a33', color: '#e5e7eb', cursor: 'pointer', fontSize: '12px', minHeight: '30px' }}
                        >
                          {wb.name}
                        </button>
                      ))}
                      {allWhiteboards.length === 0 && <span style={{ fontSize: '11px', color: '#9ca3af', textAlign: 'center', padding: '8px' }}>No whiteboards yet.</span>}
                    </div>
                    <input value={newGlobalWhiteboardName} onChange={(e) => setNewGlobalWhiteboardName(e.target.value)} placeholder="New whiteboard name..." style={{ width: '100%', background: '#1c1f26', border: '1px solid #4b5563', color: '#e5e7eb', borderRadius: '6px', padding: '6px 8px', fontSize: '11px', outline: 'none' }} />
                  </div>
                )}
              </div>
            );
          })}
          {globalToolCount < (settings?.maxGlobalPdfTools ?? 8) && (
            <button onClick={() => setGlobalToolCount((c) => c + 1)} title="Add global whiteboard tool" style={{ width: '36px', height: '32px', borderRadius: '6px', border: '1px dashed #4b5563', background: 'transparent', color: '#d1d5db', cursor: 'pointer', fontSize: '16px' }}>+</button>
          )}
        </div>

        <div style={{ background: 'rgba(38,42,51,0.65)', backdropFilter: 'blur(10px)', borderRadius: '8px', padding: '6px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
          <button onClick={() => setZoom(z => Math.min(z + 0.25, 3.0))} title="Zoom In" style={{ width: '32px', height: '32px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#d1d5db', fontSize: '18px', borderRadius: '4px' }} onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.1)'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>+</button>
          <span style={{ fontSize: '11px', color: '#9ca3af', fontWeight: '500', margin: '2px 0' }}>{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.max(z - 0.25, 0.5))} title="Zoom Out" style={{ width: '32px', height: '32px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#d1d5db', fontSize: '18px', borderRadius: '4px' }} onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.1)'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>-</button>
        </div>
      </div>
    </div>
  );
}






