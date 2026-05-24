// In TypeScript, this is often over-engineering:

// interface PaneRepository {
//   createPane(pane: Pane): Promise<void>
//   getPaneById(id: string): Promise<Pane | null>
// }

// class IndexedDbPaneRepository implements PaneRepository {
//   // only implementation forever
// }

// If you only have one implementation, you can simply write:

// // repositories/paneRepository.ts

// export const paneRepository = {
//   async createPane(pane: Pane) {
//     // ...
//   },

//   async getPaneById(id: string): Promise<Pane | null> {
//     // ...
//   }
// }