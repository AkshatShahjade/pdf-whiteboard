export const SCHEMA_SQL = `
-- ==========================================
-- JODO LAYER (The Modding Engine)
-- ==========================================
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

-- ==========================================
-- DATA LAYER (The User's Workspace)
-- ==========================================
CREATE TABLE IF NOT EXISTS SCREEN_INSTANCES (
    id TEXT PRIMARY KEY,
    jodo_screen_type TEXT REFERENCES JODO_SCREEN_TYPES(id),
    label TEXT
);

CREATE TABLE IF NOT EXISTS SLOT_INSTANCES (
    id TEXT PRIMARY KEY,
    screen_id TEXT REFERENCES SCREEN_INSTANCES(id) ON DELETE CASCADE,
    jodo_slot_type TEXT REFERENCES JODO_SLOT_TYPES(id),
    config_json TEXT
);

CREATE TABLE IF NOT EXISTS CONTENTS (
    id TEXT PRIMARY KEY,
    slot_id TEXT REFERENCES SLOT_INSTANCES(id) ON DELETE CASCADE,
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

CREATE TABLE IF NOT EXISTS TOOL_INSTANCES (
    id TEXT PRIMARY KEY,
    jodo_content_type_id TEXT REFERENCES JODO_CONTENT_TYPES(id) ON DELETE CASCADE,
    content_id TEXT REFERENCES CONTENTS(id) ON DELETE CASCADE,
    jodo_slot_id TEXT REFERENCES JODO_SLOT_TYPES(id) ON DELETE CASCADE,
    slot_id TEXT REFERENCES SLOT_INSTANCES(id) ON DELETE CASCADE,
    jodo_screen_type_id TEXT REFERENCES JODO_SCREEN_TYPES(id) ON DELETE CASCADE,
    screen_id TEXT REFERENCES SCREEN_INSTANCES(id) ON DELETE CASCADE,
    jodo_tool_type TEXT REFERENCES JODO_TOOL_TYPES(id) ON DELETE CASCADE,
    config_json TEXT
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

CREATE TABLE IF NOT EXISTS SETTINGS (
    key TEXT PRIMARY KEY,
    value_json TEXT
);
`;
