/**
 * Silences THREE.Clock deprecation warning. @react-three/fiber still uses
 * Clock; the warning will go away when R3F migrates to THREE.Timer.
 */
const fs = require("fs");
const path = require("path");

const threeDir = path.join(__dirname, "..", "node_modules", "three");
const warnLine =
  "\t\twarn( 'THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.' ); // @deprecated, r183";
const commentLine =
  "\t\t// Deprecation warning silenced: @react-three/fiber still uses Clock until it migrates to Timer";

for (const file of ["build/three.core.js", "build/three.cjs"]) {
  const filePath = path.join(threeDir, file);
  if (!fs.existsSync(filePath)) continue;
  let content = fs.readFileSync(filePath, "utf8");
  if (content.includes(warnLine)) {
    content = content.replace(warnLine, commentLine);
    fs.writeFileSync(filePath, content);
    console.log("[patch-three-clock] Patched", file);
  }
}
