function WhiteboardPane({ regionId, settings }) {
  const [snapshot, setSnapshot] = useState(null);
  const [loaded, setLoaded]     = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadWhiteboard(regionId).then((snap) => {
      if (!cancelled) {
        setSnapshot(snap ?? undefined);
        setLoaded(true);
      }
    });
    return () => { cancelled = true; };
  }, [regionId]);

  if (!loaded) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#1c1f26', color: '#9ca3af', fontSize: '12px', fontFamily: "'IBM Plex Mono', monospace" }}>
        loading workspace…
      </div>
    );
  }

  return <TldrawWithPersistence regionId={regionId} initialSnapshot={snapshot} settings={settings} />;
}




function TldrawWithPersistence({ regionId, initialSnapshot, settings }) {
  const debouncedSave = useMemo(() => debounce((snap) => saveWhiteboard(regionId, snap), 800), [regionId]);

  const handleMount = useCallback((editor) => {
    if (initialSnapshot) {
      try { editor.loadSnapshot(initialSnapshot); } catch (err) { console.warn(err); }
    }
    editor.setCurrentTool(settings?.defaultTool || 'draw');
    editor.updateInstanceState({ exportBackground: false });

    // (The invalid updateUserPreferences call that caused the crash was removed from here)

    const unsub = editor.store.listen(
      () => { debouncedSave(editor.getSnapshot()); },
      { source: 'user', scope: 'document' }
    );
    return () => { unsub(); debouncedSave.flush(editor.getSnapshot()); };
  }, [initialSnapshot, debouncedSave, regionId]);

  const handwritingComponents = {
    Toolbar: (props) => {
      const tools = useTools();
      const isSelected = useIsToolSelected(tools['handwriting']);
      return (
        <DefaultToolbar {...props}>
          <TldrawUiMenuItem {...tools['handwriting']} isSelected={isSelected} />
          <DefaultToolbarContent />
        </DefaultToolbar>
      );
    },
  };

  return (
    <>
      <style>{`
        /* Overrides tldraw's default internal font variables */
        .tl-container {
          --tl-font-draw: 'Helvetica', Arial, sans-serif;
          --tl-font-sans: 'Helvetica', Arial, sans-serif;
          --tl-font-serif: 'Helvetica', Arial, sans-serif;
          --tl-font-mono: 'Helvetica', Arial, sans-serif;
        }
      `}</style>
      <Tldraw
        onMount={handleMount}
        tools={[HandwritingTool]}
        shapeUtils={[HandwritingShapeUtil]}
        overrides={handwritingToolUiOverrides}
        assetUrls={handwritingAssetUrls}
        components={handwritingComponents}
      />
    </>
  );
}
