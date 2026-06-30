// Snapshot and restore logic saved for later use
// This was previously used for the link tool
// Saved here in case it's needed for other functionality later

export function snapshotSlotsLogic(store: any) {
    const state = store.getState();
    // Convert Maps to arrays for serialization
    const snapshotSlots = Object.fromEntries(
        Object.entries(state.slots).map(([id, slot]: [string, any]) => [
            id,
            {
                ...slot,
                marks: Array.from(slot.marks.entries())
            }
        ])
    );
    store.setState({ slotsSnapshot: snapshotSlots });
}

export function restoreSlotsLogic(store: any) {
    const state = store.getState();
    if (state.slotsSnapshot) {
        // Convert arrays back to Maps
        const restoredSlots = Object.fromEntries(
            Object.entries(state.slotsSnapshot).map(([id, slot]: [string, any]) => [
                id,
                {
                    ...slot,
                    marks: new Map(slot.marks)
                }
            ])
        );
        store.setState({ slots: restoredSlots, slotsSnapshot: null });
    }
}
