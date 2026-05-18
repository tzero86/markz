import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/animations.css";
import "./styles/editor-theme.css";
import "./styles/components/button.css";
import "./styles/components/input.css";
import "./styles/components/tooltip.css";
import "./styles/components/context-menu.css";
import "./styles/components/badge.css";
import App from "./App.svelte";
import { mount } from "svelte";

const app = mount(App, {
  target: document.getElementById("app")!,
});

export default app;