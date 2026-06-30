import React, { useState, useRef } from 'react';
import { Popover } from './Popover';
import { ButtonFlat } from './ButtonFlat';
import { Text } from './Text';
import { TextInput } from './TextInput';
import { LibrarySearch } from '../elements/LibrarySearch';
import { MarqueeTextButton } from './MarqueeTextButton';

export interface ScopeSelectorProps {
    value: string;
    onChange: (scope: string) => void;
    libraryPath?: string | null;
}

type ScopeType = 'global' | 'content' | 'content_type' | 'slot' | null;

export function ScopeSelector({ value, onChange, libraryPath }: ScopeSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const anchorRef = useRef<HTMLDivElement>(null);

    const [scopeType, setScopeType] = useState<ScopeType>(null);
    const [selectedValue, setSelectedValue] = useState<string>('');

    const handleOpen = () => {
        if (value === 'global') {
            setScopeType('global');
            setSelectedValue('');
        } else if (value.startsWith('content_type:')) {
            setScopeType('content_type');
            setSelectedValue(value.split(':')[1]);
        } else if (value.startsWith('content:')) {
            setScopeType('content');
            setSelectedValue(value.split(':')[1]);
        } else if (value.startsWith('slot:')) {
            setScopeType('slot');
            setSelectedValue(value.split(':')[1]);
        } else {
            setScopeType(null);
            setSelectedValue('');
        }
        setIsOpen(true);
    };

    const handleConfirm = () => {
        if (!scopeType) return;
        let finalScope = '';
        if (scopeType === 'global') finalScope = 'global';
        else if (scopeType === 'content_type') finalScope = `content_type:${selectedValue}`;
        else if (scopeType === 'content') finalScope = `content:${selectedValue}`;
        else if (scopeType === 'slot') finalScope = `slot:${selectedValue}`;

        if (finalScope) {
            onChange(finalScope);
        }
        setIsOpen(false);
    };

    return (
        <>
            <div ref={anchorRef} style={{ width: '100%' }}>
                <MarqueeTextButton
                    value={value}
                    placeholder="Click to select scope..."
                    onClick={handleOpen}
                />
            </div>
            <Popover isOpen={isOpen} onClose={() => setIsOpen(false)} anchorEl={anchorRef.current} width={360}>
                <Text variant="h3">Select Scope</Text>
                
                {!scopeType ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <ButtonFlat label="Global" onClick={() => setScopeType('global')} />
                        <ButtonFlat label="Content" onClick={() => setScopeType('content')} />
                        <ButtonFlat label="Content Type" onClick={() => setScopeType('content_type')} />
                        <ButtonFlat label="Slot" onClick={() => setScopeType('slot')} />
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <ButtonFlat label="← Back" onClick={() => { setScopeType(null); setSelectedValue(''); }} />
                            <Text variant="body2" color="secondary">
                                {scopeType.toUpperCase()}
                            </Text>
                        </div>

                        {scopeType === 'global' && (
                            <Text variant="body2" color="secondary">Applies to the entire application.</Text>
                        )}

                        {scopeType === 'content_type' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <ButtonFlat 
                                    label="pdf" 
                                    onClick={() => setSelectedValue('pdf')} 
                                    active={selectedValue === 'pdf'}
                                />
                                <ButtonFlat 
                                    label="whiteboard" 
                                    onClick={() => setSelectedValue('whiteboard')}
                                    active={selectedValue === 'whiteboard'}
                                />
                            </div>
                        )}

                        {scopeType === 'slot' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <ButtonFlat 
                                    label="left" 
                                    onClick={() => setSelectedValue('left')}
                                    active={selectedValue === 'left'}
                                />
                                <ButtonFlat 
                                    label="right" 
                                    onClick={() => setSelectedValue('right')}
                                    active={selectedValue === 'right'}
                                />
                                <TextInput 
                                    value={selectedValue} 
                                    onChange={setSelectedValue} 
                                    placeholder="Or type custom slot ID..." 
                                    variant="text" 
                                />
                            </div>
                        )}

                        {scopeType === 'content' && (
                            <div style={{ height: '240px', display: 'flex', flexDirection: 'column' }}>
                                <LibrarySearch 
                                    libraryPath={libraryPath || null}
                                    onSelectFile={(path, name) => {
                                        let id = name;
                                        if (id.toLowerCase().endsWith('.pdf')) id = id.slice(0, -4);
                                        if (id.toLowerCase().endsWith('.tldr')) id = id.slice(0, -5);
                                        setSelectedValue(id);
                                    }}
                                />
                                {selectedValue && (
                                    <div style={{ marginTop: '8px', padding: '8px', background: 'rgba(59,130,246,0.1)', border: '1px solid #3B82F6', borderRadius: '4px' }}>
                                        <Text variant="body2" color="primary">Selected: {selectedValue}</Text>
                                    </div>
                                )}
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: 'auto', paddingTop: '12px' }}>
                            <ButtonFlat label="Cancel" onClick={() => setIsOpen(false)} />
                            <ButtonFlat label="Confirm" onClick={handleConfirm} disabled={scopeType !== 'global' && !selectedValue} />
                        </div>
                    </div>
                )}
            </Popover>
        </>
    );
}
