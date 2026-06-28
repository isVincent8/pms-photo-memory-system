// index.json Schema 校验脚本（Task 1.3 验收 + 1.4）
// 使用 ajv + ajv-formats 加载 schema.json 校验 public/data/index.json。
// 校验失败时打印具体错误路径，并以非零退出码退出（便于接入 CI / npm 脚本）。
//
// 用法：node data-process/validate_index.js

import { readJSON } from './utils.js';
import { DIRS } from './config.js';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

function main() {
  const schema = readJSON(DIRS.schemaFile);
  const index = readJSON(DIRS.indexFile);

  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);

  const ok = validate(index);
  if (ok) {
    console.log('✅ index.json 校验通过');
    console.log(`   stages=${index.stages.length} albums=${index.albums.length} people=${index.people.length} places=${index.places.length} photos=${index.photos.length}`);
    return;
  }

  console.error('❌ index.json 校验失败：');
  for (const err of validate.errors) {
    const path = err.instancePath || '(root)';
    console.error(`   - ${path} ${err.message}`);
    if (err.params) console.error(`     ${JSON.stringify(err.params)}`);
  }
  process.exit(1);
}

main();
