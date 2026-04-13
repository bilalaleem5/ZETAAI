
const { execSync } = require("child_process");

const pkg = require("./package.json");
const deps = {
    ...pkg.dependencies,
    ...pkg.devDependencies
};

let success = [];
let failed = [];

for (let [name, version] of Object.entries(deps)) {
    try {
        console.log(`Installing: ${name}@${version}`);
        execSync(`npm install ${name}@${version}`, { stdio: "inherit" });
        success.push(name);
    } catch (err) {
        console.log(`❌ Failed: ${name}`);
        failed.push(name);
    }
}

console.log("\n=====================");
console.log("✅ Installed:", success.length);
console.log(success);

console.log("\n❌ Failed:", failed.length);
console.log(failed);