import { injectUI } from "@/src/contentUi";

export default defineContentScript({
  matches: ["*://*.meet.google.com/*"],
  main() {
    console.log("hello meet");
    injectUI();
  },
});
