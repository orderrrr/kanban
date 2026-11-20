import { createContext } from 'svelte';
import type { Api } from './api';
import type { IsoDate } from './types';

// The root layout sets both once; components below read them. `createContext`
// throws when one is read before it is set, rather than handing back undefined.
export const [getApi, setApi] = createContext<Api>();
export const [getToday, setToday] = createContext<IsoDate>();
