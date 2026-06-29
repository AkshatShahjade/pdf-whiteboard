import React, { useState, useEffect } from 'react';
import { MultiStateToggle } from '../primitives/MultiStateToggle';
import { TextInput } from '../primitives/TextInput';
import { ButtonFlat } from '../primitives/ButtonFlat';

interface SettingsCardProps {
    schema: any;
    currentClassification: 'personalizable' | 'defaulted';
    scopedDefaults: { scope: string, value: any, hash: string }[];
    onUpdateClassification: (key: string, cls: 'personalizable' | 'defaulted') => void;
    onUpdateDefault: (key: string, scope: string, val: any) => void;
    onDeleteDefault: (key: string, scope: string) => void;
}

export function SettingsCard({
    schema,
    currentClassification,
    scopedDefaults,
    onUpdateClassification,
    onUpdateDefault,
    onDeleteDefault
}: SettingsCardProps) {
    const [expanded, setExpanded] = useState(false);
    const [newScope, setNewScope] = useState('');
    const [newValue, setNewValue] = useState('');
    
    // Find the global default
    const globalDefault = scopedDefaults.find(d => d.scope === 'global')?.value ?? schema.seed_default_value;
    
    const [globalVal, setGlobalVal] = useState(JSON.stringify(globalDefault));
    useEffect(() => {
        setGlobalVal(JSON.stringify(globalDefault));
    }, [globalDefault]);
    
    // Filter out global for the table
    const specificDefaults = scopedDefaults.filter(d => d.scope !== 'global');

    return (
        <div style={{ marginBottom: 12, borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}>
            {/* Header */}
            <div 
                style={{ padding: 12, display: 'flex', alignItems: 'center', cursor: 'pointer', gap: 12 }}
                onClick={(e) => {
                    // Prevent toggle if clicking inside inputs or buttons
                    const target = e.target as HTMLElement;
                    if (!target.closest('input, button, select')) {
                        setExpanded(!expanded);
                    }
                }}
            >
                <div style={{ flex: 1, fontWeight: 500, fontSize: 14 }}>{schema.key}</div>
                
                {/* Classification Toggle */}
                <MultiStateToggle 
                    states={['personalizable', 'defaulted']}
                    currentState={currentClassification}
                    variant="compact"
                    onToggle={(newState) => onUpdateClassification(schema.key, newState as 'personalizable' | 'defaulted')}
                />

                {/* Global Default Input */}
                <div style={{ width: 120 }}>
                    <TextInput 
                        value={globalVal}
                        onChange={setGlobalVal}
                        onSubmit={(newVal) => {
                            try {
                                const val = JSON.parse(newVal);
                                if (JSON.stringify(val) !== JSON.stringify(globalDefault)) {
                                    onUpdateDefault(schema.key, 'global', val);
                                }
                            } catch (err) {}
                        }}
                        placeholder="Global Default"
                    />
                </div>
                
                <div style={{ fontSize: 10, opacity: 0.5 }}>{expanded ? '▲' : '▼'}</div>
            </div>

            {/* Expansion Body */}
            {expanded && (
                <div style={{ padding: 12, borderTop: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)' }}>
                    
                    {specificDefaults.length > 0 ? (
                        <table style={{ width: '100%', fontSize: 12, textAlign: 'left', borderCollapse: 'collapse', marginBottom: 12 }}>
                            <thead>
                                <tr style={{ opacity: 0.5 }}>
                                    <th style={{ paddingBottom: 4 }}>Scope</th>
                                    <th style={{ paddingBottom: 4 }}>Value</th>
                                    <th style={{ paddingBottom: 4, width: 30 }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {specificDefaults.map(d => (
                                    <SettingsCardRow 
                                        key={d.scope} 
                                        d={d} 
                                        schema={schema} 
                                        onUpdateDefault={onUpdateDefault} 
                                        onDeleteDefault={onDeleteDefault} 
                                    />
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div style={{ fontSize: 12, opacity: 0.5, marginBottom: 12, fontStyle: 'italic' }}>No scoped defaults defined.</div>
                    )}

                    {/* Add Form */}
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                            <TextInput 
                                placeholder="Scope (e.g. contentType:pdf)" 
                                value={newScope}
                                onChange={setNewScope}
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <TextInput 
                                placeholder="Value (JSON)" 
                                value={newValue}
                                onChange={setNewValue}
                                onSubmit={(val) => {
                                    if (!newScope || !val) return;
                                    try {
                                        const parsed = JSON.parse(val);
                                        onUpdateDefault(schema.key, newScope, parsed);
                                        setNewScope('');
                                        setNewValue('');
                                    } catch (err) {
                                        alert('Value must be valid JSON');
                                    }
                                }}
                            />
                        </div>
                        <ButtonFlat 
                            label="+ Add" 
                            onClick={() => {
                                if (!newScope || !newValue) return;
                                try {
                                    const val = JSON.parse(newValue);
                                    onUpdateDefault(schema.key, newScope, val);
                                    setNewScope('');
                                    setNewValue('');
                                } catch (err) {
                                    alert('Value must be valid JSON');
                                }
                            }} 
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

function SettingsCardRow({ d, schema, onUpdateDefault, onDeleteDefault }: { d: any, schema: any, onUpdateDefault: any, onDeleteDefault: any }) {
    const [val, setVal] = useState(JSON.stringify(d.value));
    
    useEffect(() => {
        setVal(JSON.stringify(d.value));
    }, [d.value]);

    return (
        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <td style={{ padding: '6px 0' }}>{d.scope}</td>
            <td style={{ padding: '6px 0' }}>
                <TextInput 
                    value={val}
                    onChange={setVal}
                    onSubmit={(newVal) => {
                        try {
                            const parsed = JSON.parse(newVal);
                            if (JSON.stringify(parsed) !== JSON.stringify(d.value)) {
                                onUpdateDefault(schema.key, d.scope, parsed);
                            }
                        } catch (err) {}
                    }}
                />
            </td>
            <td style={{ padding: '6px 0', textAlign: 'right' }}>
                <ButtonFlat 
                    label="🗑️" 
                    onClick={() => onDeleteDefault(schema.key, d.scope)}
                />
            </td>
        </tr>
    );
}
