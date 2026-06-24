import { createAppStateStore } from './app_state_store';
import { createOutputAPI } from './api/output_api';
import { createInputAPI } from './api/input_api';
import { createQueryAPI } from './api/query_api';
import { stateSyncService } from './services/state_sync_service';

// Concrete store is a private module variable, completely encapsulated
const appStateStore = createAppStateStore();

// Publicly exposed API boundaries
export const outputAPI = createOutputAPI();

// Start the background sync service BEFORE InputAPI is created so it catches all mutations
stateSyncService.startSubscriber(appStateStore, outputAPI);

export const inputAPI = createInputAPI(appStateStore, outputAPI);
export const queryAPI = createQueryAPI(appStateStore);
