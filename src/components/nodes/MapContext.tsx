"use client";

import { createContext, useContext } from "react";

interface MapCtx {
  owner: string;
  repo: string;
}

export const MapContext = createContext<MapCtx>({ owner: "", repo: "" });
export const useMapCtx = () => useContext(MapContext);
