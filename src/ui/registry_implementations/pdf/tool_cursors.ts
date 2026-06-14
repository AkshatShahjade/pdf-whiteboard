export const deleteCursor = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='%23EF4444'><path d='M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z'/></svg>") 12 12, auto`
export const lassoCursor = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%233B82F6' stroke-width='2'><path d='M8 8c0-3.3 2.7-6 6-6s6 2.7 6 6-2.7 6-6 6M4 20l5-5'/></svg>") 4 20, auto`
export const sectionStartCursor = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23EF4444' stroke-width='3'><path d='M6 20v-8h12v8' /></svg>") 12 16, auto`
export const sectionEndCursor = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2310B981' stroke-width='3'><path d='M6 4v8h12V4' /></svg>") 12 8, auto`

export function getSectionCursor(sectionTarget: "start" | "end") {
    return sectionTarget === "start" ? sectionStartCursor : sectionEndCursor
}
