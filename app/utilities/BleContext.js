// BleContext.js
import React, { createContext, useState } from "react";
import bleManager from "./BleService";

export const BleContext = createContext();

export const BleProvider = ({ children }) => {
    const [connectedDevices, setConnectedDevices] = useState([]);

    return (
        <BleContext.Provider value={{ bleManager, connectedDevices, setConnectedDevices }}>
            {children}
        </BleContext.Provider>
    );
};
