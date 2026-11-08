import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const source = file => readFileSync(new URL(`../src/${file}`,import.meta.url),"utf8");
test("all generic crop options show the variety name only and keep their original value",()=>{
  assert.match(source("components/CatalogueCropParameters.tsx"),
    /<option key=\{v\.name\} value=\{v\.name\}>\{v\.name\}<\/option>/);
});
test("tomato labels show names only without changing compound variety identities",()=>{
  assert.match(source("components/PomodoroParameters.tsx"),
    /<option value=\{v\.id\} key=\{v\.id\}>\{v\.nome\}<\/option>/);
});
test("tobacco and grain options retain their full cultivar names without category/yield suffixes",()=>{
  assert.match(source("App.tsx"),
    /<option key=\{v\.label\} value=\{v\.label\}>\s*\{v\.label\}\s*<\/option>/);
});
