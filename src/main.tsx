import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./lib/runtime"; // Initialize function registry before app loads
import "./lib/tools"; // Initialize tool registry before app loads

createRoot(document.getElementById("root")!).render(<App />);
