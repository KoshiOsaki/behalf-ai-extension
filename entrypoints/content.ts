export default defineContentScript({
  matches: ["*://*.meet.google.com/*"],
  main() {
    console.log("hello meet");
  },
});
