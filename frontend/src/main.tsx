import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "./styles/index.css";
import { registrarApp } from "./app/lib/appInstalable";
import { iniciarTablasMovil } from "./app/lib/tablasMovil";

// Van antes de montar React: el service worker y el observador de tablas
// escuchan al documento, no al árbol de componentes.
registrarApp();
iniciarTablasMovil();

createRoot(document.getElementById("root")!).render(<App />);
