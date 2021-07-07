import { writable } from "svelte/store";

export const currentPage = writable("Home");
export const modal = writable(null);
