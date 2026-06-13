import { createAppStateStore } from './app_state_store';
import { createOutputAPI } from './api/output_api';
import { createInputAPI } from './api/input_api';
import { createQueryAPI } from './api/query_api';

// Concrete store is a private module variable, completely encapsulated
const appStateStore = createAppStateStore();

// Publicly exposed API boundaries
export const outputAPI = createOutputAPI();
export const inputAPI = createInputAPI(appStateStore, outputAPI);
export const queryAPI = createQueryAPI(appStateStore);
