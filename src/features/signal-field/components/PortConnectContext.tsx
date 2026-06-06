import { createContext } from "react";
import type { PortRef } from "../types";

type PortConnectContextValue = {
  onPortClick: (port: PortRef) => void;
  pendingPort: PortRef | null;
};

export const PortConnectContext = createContext<PortConnectContextValue>({
  onPortClick: () => undefined,
  pendingPort: null,
});
