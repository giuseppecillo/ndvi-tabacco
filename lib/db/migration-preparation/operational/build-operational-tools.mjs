// Offline compilation only. No tools are executed except synthetic unit tests.
import {createRequire} from "node:module";
import {readFileSync,mkdirSync} from "node:fs";
import {fileURLToPath,pathToFileURL} from "node:url";
import {spawnSync} from "node:child_process";

const require=createRequire(new URL("../../../../artifacts/api-server/package.json",import.meta.url));
const {build}=require("esbuild");
const root=fileURLToPath(new URL("../../../../",import.meta.url));
const output=root+"generated-artifacts/migration-tools/";
mkdirSync(output,{recursive:true});
const names=["import","compare","verify-runtime","release-preparation.test"];
for(const name of names) {
  await build({
    entryPoints:[fileURLToPath(new URL(`./${name}.ts`,import.meta.url))],
    outfile:output+name+".mjs",bundle:true,platform:"node",format:"esm",
    external:["pg-native"],
    plugins:[{name:"retain-source-resource-paths",setup(build) {
      build.onLoad({filter:/\.(ts|mjs)$/},args=>{
        if(!args.path.startsWith(root) || args.path.includes("/node_modules/")) return;
        return {contents:readFileSync(args.path,"utf8").replaceAll(
          "import.meta.url",JSON.stringify(pathToFileURL(args.path).href)),
          loader:args.path.endsWith(".ts")?"ts":"js"};
      });
    }}],
    banner:{js:"import {createRequire as toolRequire} from 'node:module'; globalThis.require=toolRequire(import.meta.url);"},
    logLevel:"warning",
  });
}
console.log("OPERATIONAL_TOOLS_COMPILED; import, comparison and preflight NOT EXECUTED.");
const tests=spawnSync(process.execPath,["--test",output+"release-preparation.test.mjs"],
  {stdio:"inherit",env:{}});
if(tests.status!==0) process.exitCode=1;
