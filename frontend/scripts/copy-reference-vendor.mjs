import { cp, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
// Local, locked Three.js assets for the user-provided reference animation.
const destination = resolve("public/visuals/vendor");
await mkdir(destination, { recursive: true });
await cp(resolve("node_modules/three/build"), resolve(destination, "build"), {
  recursive: true,
});
await cp(
  resolve("node_modules/three/examples/jsm"),
  resolve(destination, "addons"),
  { recursive: true },
);
console.log("Reference visualization dependencies copied locally.");
