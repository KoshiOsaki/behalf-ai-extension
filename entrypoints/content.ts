import { injectUI } from "@/src/components/CaptionAssistantUI";

export default defineContentScript({
  matches: ["*://*.meet.google.com/*"],
  main() {
    injectUI();
  },
});
