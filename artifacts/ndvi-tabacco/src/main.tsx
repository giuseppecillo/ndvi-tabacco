import { createRoot } from "react-dom/client";
import SecurityRoot from "./security/SecurityRoot";
import "./index.css";

createRoot(document.getElementById("root")!).render(<SecurityRoot />);
