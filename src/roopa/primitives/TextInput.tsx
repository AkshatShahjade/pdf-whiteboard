import React, { useState, useEffect, useRef } from 'react';
import { RoopaElement, useRoopaElement } from '../mode_system';
import { UIStateStore } from '../../ui/ui_state_store';

export interface RulesContext {
    key: string;
    scope: string;
}

export interface TextInputRules {
    min?: number;
    max?: number;
    exclusiveMin?: number;
    exclusiveMax?: number;
    pattern?: RegExp;
    custom?: (val: string, ctx: RulesContext) => boolean | string;
}

export interface TextInputProps {
    placeholder?: string;
    value: string;
    autoFocus?: boolean;
    permissionId?: RoopaElement;
    uiStore?: UIStateStore;
    onChange: (val: string) => void;
    onSubmit?: (val: string) => void;
    variant?: 'text' | 'number' | 'email' | 'tel' | 'name';
    rules?: TextInputRules;
    rulesContext?: RulesContext;
    returnJSON?: boolean;
    onValidationError?: (error: string | null) => void;
}

function parseJSONToNatural(value: string): string {
    try {
        const parsed = JSON.parse(value);
        if (parsed === null || parsed === undefined) return '';
        if (typeof parsed === 'object') return JSON.stringify(parsed);
        return String(parsed);
    } catch (e) {
        return value;
    }
}

function naturalToJSON(val: string, variant?: string): string {
    const trimmed = val.trim();
    if (trimmed === '') return JSON.stringify('');

    if (variant === 'number') {
        const num = Number(trimmed);
        if (!isNaN(num)) return JSON.stringify(num);
    }
    if (trimmed.toLowerCase() === 'true') return JSON.stringify(true);
    if (trimmed.toLowerCase() === 'false') return JSON.stringify(false);

    try {
        JSON.parse(trimmed);
        return trimmed;
    } catch (err) {
        return JSON.stringify(trimmed);
    }
}

function validateInput(val: string, variant?: string, rules?: TextInputRules, ctx?: RulesContext): string | null {
    if (variant === 'number') {
        const trimmed = val.trim();
        if (trimmed === '') return 'Number is required';
        const num = Number(trimmed);
        if (isNaN(num)) {
            return 'Must be a valid number';
        }
        if (rules) {
            if (rules.min !== undefined && num < rules.min) {
                return `Must be >= ${rules.min}`;
            }
            if (rules.max !== undefined && num > rules.max) {
                return `Must be <= ${rules.max}`;
            }
            if (rules.exclusiveMin !== undefined && num <= rules.exclusiveMin) {
                return `Must be > ${rules.exclusiveMin}`;
            }
            if (rules.exclusiveMax !== undefined && num >= rules.exclusiveMax) {
                return `Must be < ${rules.exclusiveMax}`;
            }
        }
    } else if (variant === 'email') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (val && !emailRegex.test(val)) {
            return 'Must be a valid email address';
        }
    } else if (variant === 'tel') {
        const telRegex = /^[+]?[0-9\s\-()]{7,20}$/;
        if (val && !telRegex.test(val)) {
            return 'Must be a valid telephone number';
        }
    } else if (variant === 'name') {
        const nameRegex = /^[a-zA-Z\s\-']{2,50}$/;
        if (val && !nameRegex.test(val)) {
            return 'Must be a valid name';
        }
    }

    if (rules) {
        if (rules.pattern && !rules.pattern.test(val)) {
            return 'Does not match the required pattern';
        }
        if (rules.custom && ctx) {
            const customErr = rules.custom(val, ctx);
            if (typeof customErr === 'string') return customErr;
            if (customErr === false) return 'Invalid value';
        }
    }

    return null;
}

export function TextInput({
    placeholder,
    value,
    autoFocus = false,
    permissionId,
    uiStore,
    onChange,
    onSubmit,
    variant = 'text',
    rules,
    rulesContext,
    returnJSON = false,
    onValidationError
}: TextInputProps) {
    const isAllowed = permissionId && uiStore ? useRoopaElement(uiStore, permissionId) : true;
    const [touched, setTouched] = useState(false);

    const naturalVal = returnJSON ? parseJSONToNatural(value) : value;

    // Check JSON validity if returnJSON is false (direct JSON editing)
    const checkJSONValidity = (val: string): string | null => {
        if (returnJSON) return null;
        if (!val || val.trim() === '') return null;
        try {
            JSON.parse(val);
            return null;
        } catch (e: any) {
            return `Invalid JSON: ${e.message}`;
        }
    };

    const validationError = validateInput(naturalVal, variant, rules, rulesContext) || checkJSONValidity(naturalVal);

    const onValidationErrorRef = useRef(onValidationError);
    useEffect(() => {
        onValidationErrorRef.current = onValidationError;
    }, [onValidationError]);

    // Sync validation error with parent
    useEffect(() => {
        if (onValidationErrorRef.current) {
            onValidationErrorRef.current(validationError);
        }
        return () => {
            if (onValidationErrorRef.current) {
                onValidationErrorRef.current(null);
            }
        };
    }, [validationError]);

    const showError = touched && !!validationError;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '4px' }}>
            <input
                type="text"
                placeholder={placeholder}
                value={naturalVal}
                disabled={!isAllowed}
                autoFocus={autoFocus}
                onBlur={() => setTouched(true)}
                onChange={(e) => {
                    setTouched(true);
                    const newVal = e.target.value;
                    const jsonVal = returnJSON ? naturalToJSON(newVal, variant) : newVal;
                    onChange(jsonVal);
                }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && onSubmit && !validationError) {
                        onSubmit(returnJSON ? naturalToJSON(naturalVal, variant) : naturalVal);
                    }
                }}
                style={{
                    width: '100%',
                    background: showError ? 'rgba(239, 68, 68, 0.05)' : 'rgba(0,0,0,0.2)',
                    border: showError ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid rgba(255,255,255,0.1)',
                    color: isAllowed ? '#fff' : '#666',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    fontFamily: 'inherit',
                    fontSize: '13px',
                    outline: 'none',
                    opacity: isAllowed ? 1 : 0.6,
                    cursor: isAllowed ? 'text' : 'not-allowed',
                    transition: 'all 0.2s ease-in-out'
                }}
            />
            {showError && (
                <span style={{ color: '#EF4444', fontSize: '11px', fontWeight: 500, paddingLeft: '2px' }}>
                    ⚠️ {validationError}
                </span>
            )}
        </div>
    );
}
