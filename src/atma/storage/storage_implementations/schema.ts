export const SCHEMA_SQL = `

CREATE TABLE IF NOT EXISTS JODO_CONTENT_TYPES (
    id TEXT PRIMARY KEY,
    name TEXT,
    version TEXT,
    author TEXT,
    is_prebuilt BOOLEAN,
    is_enabled BOOLEAN,
    plugin_dir TEXT,
    capabilities_json TEXT
);

CREATE TABLE IF NOT EXISTS JODO_MARK_TYPES (
    id TEXT PRIMARY KEY,
    name TEXT,
    version TEXT,
    author TEXT,
    is_prebuilt BOOLEAN,
    is_enabled BOOLEAN,
    plugin_dir TEXT,
    capabilities_json TEXT
);

CREATE TABLE IF NOT EXISTS JODO_SLOT_TYPES (
    id TEXT PRIMARY KEY,
    name TEXT,
    version TEXT,
    author TEXT,
    is_prebuilt BOOLEAN,
    is_enabled BOOLEAN,
    plugin_dir TEXT,
    capabilities_json TEXT
);

CREATE TABLE IF NOT EXISTS JODO_SCREEN_TYPES (
    id TEXT PRIMARY KEY,
    name TEXT,
    version TEXT,
    author TEXT,
    is_prebuilt BOOLEAN,
    is_enabled BOOLEAN,
    plugin_dir TEXT,
    capabilities_json TEXT
);

CREATE TABLE IF NOT EXISTS JODO_TOOL_TYPES (
    id TEXT PRIMARY KEY,
    name TEXT,
    version TEXT,
    author TEXT,
    is_prebuilt BOOLEAN,
    is_enabled BOOLEAN,
    plugin_dir TEXT,
    capabilities_json TEXT
);

CREATE TABLE IF NOT EXISTS CONTENTS (
    id TEXT PRIMARY KEY,
    jodo_content_type TEXT REFERENCES JODO_CONTENT_TYPES(id),
    file_path TEXT
);

CREATE TABLE IF NOT EXISTS MARKS (
    id TEXT PRIMARY KEY,
    content_id TEXT REFERENCES CONTENTS(id) ON DELETE CASCADE,
    jodo_mark_type TEXT REFERENCES JODO_MARK_TYPES(id),
    payload TEXT
);

CREATE TABLE IF NOT EXISTS LINKS (
    id TEXT PRIMARY KEY,
    source_mark_id TEXT REFERENCES MARKS(id) ON DELETE CASCADE,
    target_mark_id TEXT REFERENCES MARKS(id) ON DELETE CASCADE,
    label TEXT
);



CREATE TABLE IF NOT EXISTS TAGS (
    id TEXT PRIMARY KEY,
    name TEXT,
    color_hex TEXT
);

CREATE TABLE IF NOT EXISTS CONTENT_TAGS (
    content_id TEXT REFERENCES CONTENTS(id) ON DELETE CASCADE,
    tag_id TEXT REFERENCES TAGS(id) ON DELETE CASCADE,
    PRIMARY KEY (content_id, tag_id)
);

CREATE TABLE IF NOT EXISTS MARK_TAGS (
    mark_id TEXT REFERENCES MARKS(id) ON DELETE CASCADE,
    tag_id TEXT REFERENCES TAGS(id) ON DELETE CASCADE,
    PRIMARY KEY (mark_id, tag_id)
);

CREATE TABLE IF NOT EXISTS DOCUMENT_UI_STATES (
    key TEXT PRIMARY KEY,
    value_json TEXT
);

CREATE TABLE IF NOT EXISTS SETTINGS (
    key TEXT PRIMARY KEY,
    value_json TEXT
);

CREATE TABLE IF NOT EXISTS DEFAULT_INITIAL_VALUES (
    key TEXT,
    scope TEXT,
    value_json TEXT,
    value_hash TEXT,
    type TEXT,
    PRIMARY KEY (key, scope)
);

CREATE TABLE IF NOT EXISTS SPECIFIC_INITIAL_VALUES (
    key TEXT,
    scope TEXT,
    value_json TEXT,
    based_on_default_hash TEXT,
    PRIMARY KEY (key, scope)
);

-- Seed built-in content types
INSERT OR IGNORE INTO JODO_CONTENT_TYPES (id, name, is_prebuilt, is_enabled) VALUES ('core.pdf', 'PDF Document', 1, 1);
INSERT OR IGNORE INTO JODO_CONTENT_TYPES (id, name, is_prebuilt, is_enabled) VALUES ('core.whiteboard', 'Whiteboard', 1, 1);

-- Seed built-in mark types
INSERT OR IGNORE INTO JODO_MARK_TYPES (id, name, is_prebuilt, is_enabled) VALUES ('rect', 'Rectangle', 1, 1);
INSERT OR IGNORE INTO JODO_MARK_TYPES (id, name, is_prebuilt, is_enabled) VALUES ('lasso', 'Lasso', 1, 1);
INSERT OR IGNORE INTO JODO_MARK_TYPES (id, name, is_prebuilt, is_enabled) VALUES ('section', 'Section', 1, 1);
`;
