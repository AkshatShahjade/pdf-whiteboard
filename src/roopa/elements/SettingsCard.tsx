import React, { useState, useEffect } from 'react';
import { MultiStateToggle } from '../primitives/MultiStateToggle';
import { TextInput } from '../primitives/TextInput';
import { ButtonFlat } from '../primitives/ButtonFlat';
import { DropdownSelect } from '../primitives/DropdownSelect';
import { FilePathInput } from '../primitives/FilePathInput';
import { ScopeSelector } from '../primitives/ScopeSelector';

interface SettingsCardProps {
    schema: any;
    currentClassification: 'personalizable' | 'defaulted';
    scopedDefaults: { scope: string, value: any, hash: string }[];
    onUpdateClassification: (key: string, cls: 'personalizable' | 'defaulted') => void;
    onUpdateDefault: (key: string, scope: string, val: any) => void;
    onDeleteDefault: (key: string, scope: string) => void;
    onValidationError?: (key: string, scope: string, err: string | null) => void;
    libraryPath?: string;
}

export function SettingsCard({
    schema,
    currentClassification,
    scopedDefaults,
    onUpdateClassification,
    onUpdateDefault,
    onDeleteDefault,
    onValidationError,
    libraryPath
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

    // Initialize dropdown option for add-default form if applicable
    useEffect(() => {
        if (expanded && schema.inputType === 'dropdown' && !newValue) {
            setNewValue(schema.dropdownOptions?.[0]?.value || '');
        }
    }, [expanded, schema.inputType, schema.dropdownOptions, newValue]);
    
    // Filter out global for the table
    const specificDefaults = scopedDefaults.filter(d => d.scope !== 'global');

    return (
        <div style={{ marginBottom: 12, borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}>
            {/* Header */}
            <div 
                style={{ padding: 12, display: 'flex', alignItems: 'center', cursor: 'pointer', gap: 12 }}
                onClick={(e) => {
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
                <div style={{ width: 140 }}>
                    {schema.inputType === 'dropdown' ? (
                        <DropdownSelect 
                            options={schema.dropdownOptions || []}
                            selectedValue={globalVal}
                            onSelect={(newVal) => {
                                setGlobalVal(newVal);
                                try {
                                    const val = JSON.parse(newVal);
                                    onUpdateDefault(schema.key, 'global', val);
                                } catch (err) {
                                    onUpdateDefault(schema.key, 'global', newVal);
                                }
                            }}
                        />
                    ) : schema.inputType === 'filepath' ? (
                        <FilePathInput 
                            value={globalVal}
                            onChange={(newVal) => {
                                setGlobalVal(newVal);
                                try {
                                    const val = JSON.parse(newVal);
                                    onUpdateDefault(schema.key, 'global', val);
                                } catch (err) {
                                    onUpdateDefault(schema.key, 'global', newVal);
                                }
                            }}
                            returnJSON={schema.returnJSON}
                            mode={schema.rules?.mode || 'directory'}
                            extensions={schema.rules?.extensions}
                        />
                    ) : (
                        <TextInput 
                            value={globalVal}
                            onChange={(newVal) => {
                                setGlobalVal(newVal);
                                try {
                                    const val = JSON.parse(newVal);
                                    onUpdateDefault(schema.key, 'global', val);
                                } catch (err) {
                                    onUpdateDefault(schema.key, 'global', newVal);
                                }
                            }}
                            variant={schema.inputType}
                            rules={schema.rules}
                            rulesContext={{ key: schema.key, scope: 'global' }}
                            returnJSON={schema.returnJSON}
                            onValidationError={(err) => {
                                if (onValidationError) {
                                    onValidationError(schema.key, 'global', err);
                                }
                            }}
                            placeholder="Global Default"
                        />
                    )}
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
                                        onValidationError={onValidationError}
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
                            <ScopeSelector 
                                value={newScope}
                                onChange={setNewScope}
                                libraryPath={libraryPath}
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            {schema.inputType === 'dropdown' ? (
                                <DropdownSelect
                                    options={schema.dropdownOptions || []}
                                    selectedValue={newValue}
                                    onSelect={setNewValue}
                                />
                            ) : schema.inputType === 'filepath' ? (
                                <FilePathInput 
                                    value={newValue}
                                    onChange={setNewValue}
                                    returnJSON={schema.returnJSON}
                                    mode={schema.rules?.mode || 'directory'}
                                    extensions={schema.rules?.extensions}
                                />
                            ) : (
                                <TextInput 
                                    placeholder={schema.returnJSON ? "Value" : "Value (JSON)"}
                                    value={newValue}
                                    onChange={setNewValue}
                                    variant={schema.inputType}
                                    rules={schema.rules}
                                    rulesContext={{ key: schema.key, scope: newScope || 'temp_scope' }}
                                    returnJSON={schema.returnJSON}
                                    onValidationError={(err) => {
                                        if (onValidationError) {
                                            onValidationError(schema.key, 'add_new_scope_val', err);
                                        }
                                    }}
                                />
                            )}
                        </div>
                        <ButtonFlat 
                            label="+ Add" 
                            onClick={() => {
                                if (!newScope || !newValue) return;
                                try {
                                    const val = JSON.parse(newValue);
                                    onUpdateDefault(schema.key, newScope, val);
                                    setNewScope('');
                                    setNewValue(schema.inputType === 'dropdown' ? (schema.dropdownOptions?.[0]?.value || '') : '');
                                    if (onValidationError) {
                                        onValidationError(schema.key, 'add_new_scope_val', null);
                                    }
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

function SettingsCardRow({ 
    d, 
    schema, 
    onUpdateDefault, 
    onDeleteDefault, 
    onValidationError 
}: { 
    d: any, 
    schema: any, 
    onUpdateDefault: any, 
    onDeleteDefault: any, 
    onValidationError?: any 
}) {
    const [val, setVal] = useState(JSON.stringify(d.value));
    
    useEffect(() => {
        setVal(JSON.stringify(d.value));
    }, [d.value]);

    return (
        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <td style={{ padding: '6px 0' }}>{d.scope}</td>
            <td style={{ padding: '6px 0' }}>
                {schema.inputType === 'dropdown' ? (
                    <DropdownSelect
                        options={schema.dropdownOptions || []}
                        selectedValue={val}
                        onSelect={(newVal) => {
                            setVal(newVal);
                            try {
                                const parsed = JSON.parse(newVal);
                                onUpdateDefault(schema.key, d.scope, parsed);
                            } catch (err) {
                                onUpdateDefault(schema.key, d.scope, newVal);
                            }
                        }}
                    />
                ) : schema.inputType === 'filepath' ? (
                    <FilePathInput 
                        value={val}
                        onChange={(newVal) => {
                            setVal(newVal);
                            try {
                                const parsed = JSON.parse(newVal);
                                onUpdateDefault(schema.key, d.scope, parsed);
                            } catch (err) {
                                onUpdateDefault(schema.key, d.scope, newVal);
                            }
                        }}
                        returnJSON={schema.returnJSON}
                        mode={schema.rules?.mode || 'directory'}
                        extensions={schema.rules?.extensions}
                    />
                ) : (
                    <TextInput 
                        value={val}
                        onChange={(newVal) => {
                            setVal(newVal);
                            try {
                                const parsed = JSON.parse(newVal);
                                onUpdateDefault(schema.key, d.scope, parsed);
                            } catch (err) {
                                onUpdateDefault(schema.key, d.scope, newVal);
                            }
                        }}
                        variant={schema.inputType}
                        rules={schema.rules}
                        rulesContext={{ key: schema.key, scope: d.scope }}
                        returnJSON={schema.returnJSON}
                        onValidationError={(err) => {
                            if (onValidationError) {
                                onValidationError(schema.key, d.scope, err);
                            }
                        }}
                    />
                )}
            </td>
            <td style={{ padding: '6px 0', textAlign: 'right' }}>
                <ButtonFlat 
                    label="🗑️" 
                    onClick={() => {
                        onDeleteDefault(schema.key, d.scope);
                        if (onValidationError) {
                            onValidationError(schema.key, d.scope, null);
                        }
                    }}
                />
            </td>
        </tr>
    );
}
