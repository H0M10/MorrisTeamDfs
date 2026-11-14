// Genera src/lib/contract/types.ts desde src/lib/contract/schema.json.
//   npm run gen:types            regenera
//   npm run gen:types -- --check falla si el archivo no está al día
// No edites types.ts a mano: cambia /contracts/schema.json, corre
// `python contracts/sync.py` y luego este guion.
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { compileFromFile } from "json-schema-to-typescript";

const schema = fileURLToPath(new URL("../src/lib/contract/schema.json", import.meta.url));
const output = fileURLToPath(new URL("../src/lib/contract/types.ts", import.meta.url));

const banner = `/* Generado desde contracts/schema.json. No editar a mano.
 * Para regenerar: npm run gen:types */`;

const generated = (
  await compileFromFile(schema, {
    bannerComment: banner,
    additionalProperties: false,
    style: { printWidth: 100 },
  })
).replace(/\r\n/g, "\n");

if (process.argv.includes("--check")) {
  const current = await readFile(output, "utf8").then(
    (text) => text.replace(/\r\n/g, "\n"),
    () => "",
  );
  if (current !== generated) {
    console.error("src/lib/contract/types.ts no coincide con el esquema. Corre: npm run gen:types");
    process.exit(1);
  }
  console.log("Tipos del contrato al día.");
} else {
  await writeFile(output, generated, "utf8");
  console.log("generado src/lib/contract/types.ts");
}
