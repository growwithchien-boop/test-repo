// scripts/validate-pseudo.js
const fs = require("fs");
const path = require("path");
const FW_OPEN = "［", FW_CLOSE = "］";

// same tokenizer as pseudo.js (keep in sync)
function tokenize(str) {
  const tokens = []; let i = 0, buf = "";
  const flush = ()=>{ if (buf) { tokens.push({type:"text", val:buf}); buf=""; } };
  while (i < str.length) {
    if (str[i] === "<") { flush(); const j = str.indexOf(">", i+1); const end = j===-1?str.length-1:j; tokens.push({type:"token", val:str.slice(i,end+1)}); i=end+1; continue; }
    if (str[i] === "{" && str[i+1] === "{") { flush(); const j = str.indexOf("}}", i+2); const end = j===-1?str.length-2:j; tokens.push({type:"token", val:str.slice(i,end+2)}); i=end+2; continue; }
    if (str[i] === "{") { flush(); let d=1, j=i+1; while (j<str.length && d>0){ if (str[j]==="{") d++; else if (str[j]==="}") d--; j++; } tokens.push({type:"token", val:str.slice(i, d===0?j:str.length)}); i = d===0?j:str.length; continue; }
    buf += str[i++]; 
  }
  flush(); return tokens;
}

function flatten(obj, pathParts=[], out={}) {
  const key = pathParts.join(".");
  if (typeof obj === "string") { out[key] = obj; return out; }
  if (Array.isArray(obj)) {
    obj.forEach((v, i) => flatten(v, pathParts.concat(`[${i}]`), out));
    return out;
  }
  if (obj && typeof obj === "object") {
    for (const k of Object.keys(obj)) flatten(obj[k], pathParts.concat(k), out);
  }
  return out;
}

function readJSON(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

const enPath = path.resolve(process.cwd(), "locales/en.json");
const zzPath = path.resolve(process.cwd(), "locales/zz-pseudo.json");
const en = readJSON(enPath);
const zz = readJSON(zzPath);
const E = flatten(en), Z = flatten(zz);

let failures = [];
for (const k of Object.keys(E)) {
  if (!(k in Z)) { failures.push(`${k}: missing in zz-pseudo.json`); continue; }

  const tE = tokenize(E[k]).filter(t=>t.type==="token" && (t.val.startsWith("{") || t.val.startsWith("{{") || t.val.startsWith("<")));
  const tZ = tokenize(Z[k]).filter(t=>t.type==="token" && (t.val.startsWith("{") || t.val.startsWith("{{") || t.val.startsWith("<")));
  const a = tE.map(t=>t.val), b = tZ.map(t=>t.val);

  if (a.length !== b.length || a.some((v,i)=>v!==b[i])) {
    failures.push(`${k}: placeholder/tokens changed  EN=${JSON.stringify(a)}  ZZ=${JSON.stringify(b)}`);
  }

  // heuristic: wrapped & longer
  const wrapped = Z[k].startsWith(FW_OPEN) && Z[k].trimEnd().endsWith(FW_CLOSE);
  const longer  = Z[k].length >= Math.ceil(E[k].length * 1.3);
  if (!wrapped || !longer) {
    failures.push(`${k}: pseudo-loc not applied (wrapped=${wrapped}, longer=${longer})`);
  }
}

if (failures.length) {
  console.error("Validation failed:\n" + failures.map(x=>" - "+x).join("\n"));
  process.exit(1);
} else {
  console.log("✅ Pseudo-loc valid: tokens preserved and strings padded.");
}
