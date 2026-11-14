// Run before every build: stops it when something has drifted off the style guide.
import { contrastFailures, designContrastFailures, rawStyleValuesInProject } from "@/theme/checks";

const problems = [
  ...rawStyleValuesInProject().map((found) => `${found.file}:${found.line} writes out "${found.value}"; use a theme token (src/theme/tokens.ts).`),
  ...contrastFailures(),
  ...designContrastFailures(),
];
if (problems.length > 0) {
  console.error(["The style guide check failed:", ...problems.map((problem) => `  ${problem}`)].join("\n"));
  process.exit(1);
}
console.log("Style guide check passed.");
