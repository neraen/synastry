import {api} from "./client";

export const fetchEphemeris = () => api.get("/ephemeris");
