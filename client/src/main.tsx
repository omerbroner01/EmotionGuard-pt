import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import ErrorBoundary from "./components/ui/error-boundary";

createRoot(document.getElementById("root")!).render(
	<ErrorBoundary>
		<App />
	</ErrorBoundary>
);
