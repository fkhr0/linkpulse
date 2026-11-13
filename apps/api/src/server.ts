import { createApp } from "./app.js";
import { config } from "./config.js";

createApp().listen(config.port, () => {
  console.log(`LinkPulse API on http://localhost:${config.port}`);
});
