export const deleteCursor = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='%23EF4444'><path d='M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z'/></svg>") 12 12, auto`
export const lassoCursor = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%233B82F6' stroke-width='2'><path d='M8 8c0-3.3 2.7-6 6-6s6 2.7 6 6-2.7 6-6 6M4 20l5-5'/></svg>") 4 20, auto`
export const sectionStartCursor = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23EF4444' stroke-width='3'><path d='M6 20v-8h12v8' /></svg>") 12 16, auto`
export const sectionEndCursor = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2310B981' stroke-width='3'><path d='M6 4v8h12V4' /></svg>") 12 8, auto`
export const pinCursor = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%233B82F6' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M21.17 3.25q.32.33.43.81q.1.48-.06.94l-3.23 9.4c-.1.3-.3.56-.55.74s-.57.26-.88.23l-3.59-.44l-4.24 6.78q-.25.4-.73.49q-.48.09-.89-.17l-1.63-1.02q-.4-.26-.5-.73q-.1-.48.16-.88l4.24-6.79l-3.58-.45q-.31-.03-.57-.22t-.41-.47L5.56 6.81q-.2-.46-.06-.94t.47-.8l4.4-3.13q.33-.24.75-.24t.76.24l3.58 2.5l5.12-1.74q.44-.14.89-.03t.75.46l-.05.12z'/></svg>") 12 12, auto`

export function getSectionCursor(sectionTarget: "start" | "end") {
    return sectionTarget === "start" ? sectionStartCursor : sectionEndCursor
}
