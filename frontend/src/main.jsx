import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { testAppwriteConnection } from "./services/appwrite";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Test Appwrite connection after React mounts (non-blocking)
testAppwriteConnection();