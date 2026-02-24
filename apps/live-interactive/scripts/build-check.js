const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const roots = [
  path.resolve(__dirname, "../backend/src"),
  path.resolve(__dirname, "../frontend/scripts"),
  path.resolve(__dirname)
];

function collectJsFiles(dir, collected = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules") {
        continue;
      }
      collectJsFiles(fullPath, collected);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".js")) {
      collected.push(fullPath);
    }
  }
  return collected;
}

function checkFileSyntax(filePath) {
  const result = spawnSync(process.execPath, ["--check", filePath], {
    encoding: "utf8"
  });
  if (result.status !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
    throw new Error(`Syntax check failed for ${filePath}\n${output}`);
  }
}

function main() {
  const files = roots.flatMap((root) => collectJsFiles(root));
  const uniqueFiles = Array.from(new Set(files));

  for (const filePath of uniqueFiles) {
    checkFileSyntax(filePath);
  }

  console.log(`Build check passed. Files checked: ${uniqueFiles.length}`);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
