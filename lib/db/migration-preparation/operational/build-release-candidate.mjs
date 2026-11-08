// Compile-only rehearsal. Does not execute the candidate, publish or connect.
import {createRequire} from "node:module";
import {readFileSync,mkdirSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {preparedAppSource,preparedDatabaseSource,preparedStartupSource} from "./prepared-wiring.mjs";

const require=createRequire(new URL("../../../../artifacts/api-server/package.json",import.meta.url));
globalThis.require=require;
const {build}=require("esbuild");
const pinoModule=require("esbuild-plugin-pino");
const pinoPlugin=pinoModule.default??pinoModule;
const api=fileURLToPath(new URL("../../../../artifacts/api-server/",import.meta.url));
const db=fileURLToPath(new URL("../../src/index.ts",import.meta.url));
const app=api+"src/app.ts";
const startup=api+"src/index.ts";
const output=fileURLToPath(new URL("../../../../generated-artifacts/migration-release-candidate/",import.meta.url));
mkdirSync(output,{recursive:true});
const originalBuild=readFileSync(api+"build.mjs","utf8");
const external=JSON.parse(originalBuild.match(/external:\s*(\[[\s\S]*?\]),/)[1].replace(/,\s*\]/g,"]"));
await build({
  entryPoints:[api+"src/index.ts"],bundle:true,platform:"node",format:"esm",
  outdir:output,outExtension:{".js":".mjs"},external,sourcemap:false,
  plugins:[
    {name:"inactive-migration-wiring",setup(build) {
      build.onLoad({filter:/\.ts$/},args=>{
        if(args.path!==db && args.path!==app && args.path!==startup) return;
        const source=readFileSync(args.path,"utf8");
        return {contents:args.path===db?preparedDatabaseSource(source):
          args.path===app?preparedAppSource(source):preparedStartupSource(source),loader:"ts"};
      });
    }},
    pinoPlugin({transports:["pino-pretty"]}),
  ],
  banner:{js:"import {createRequire as candidateRequire} from 'node:module'; globalThis.require=candidateRequire(import.meta.url);"},
  logLevel:"warning",
});
console.log("CANDIDATE_COMPILED_NOT_EXECUTED_OR_PUBLISHED; active source wiring unchanged.");
