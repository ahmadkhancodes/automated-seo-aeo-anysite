#!/usr/bin/env node
// Build dist/automated-seo-aeo-anysite.zip from skill/automated-seo-aeo-anysite (zip root = the skill folder).
// Uses the system `zip` command when present, otherwise Python's zipfile. Output is deterministic enough to diff.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "dist", "automated-seo-aeo-anysite.zip");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.rmSync(out, { force: true });
const skillParent = path.join(root, "skill");
let r = spawnSync("zip", ["-r", "-X", "-q", out, "automated-seo-aeo-anysite", "-x", "*.DS_Store"], { cwd: skillParent });
if (r.error || r.status !== 0) {
  const py = `import zipfile,os,sys
out,base=sys.argv[1],sys.argv[2]
with zipfile.ZipFile(out,"w",zipfile.ZIP_DEFLATED) as z:
    for d,_,fs in sorted(os.walk(base)):
        for f in sorted(fs):
            if f==".DS_Store": continue
            p=os.path.join(d,f); z.write(p,os.path.relpath(p,os.path.dirname(base)))
`;
  r = spawnSync("python3", ["-c", py, out, path.join(skillParent, "automated-seo-aeo-anysite")]);
  if (r.status !== 0) { console.error("Could not build the zip (need `zip` or python3):", r.stderr?.toString()); process.exit(1); }
}
console.log(`Built ${path.relative(root, out)} (${fs.statSync(out).size} bytes)`);
