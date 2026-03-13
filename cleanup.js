#!/usr/bin/env node
/**
 * cleanup.js — Supabase上の重複繰り返しタスクを削除するスクリプト
 *
 * 実行前に環境変数をセットしてください:
 *   export SUPABASE_URL=https://xxxx.supabase.co
 *   export SUPABASE_KEY=your_service_role_key   # service_role キー推奨（RLSをバイパス）
 *
 * 実行:
 *   node cleanup.js          # 実際に削除
 *   node cleanup.js --dry-run # ドライラン（削除せず確認のみ）
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const DRY_RUN = process.argv.includes('--dry-run');

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Error: SUPABASE_URL と SUPABASE_KEY を環境変数にセットしてください');
  process.exit(1);
}

if (DRY_RUN) console.log('[DRY RUN] 保存は行いません\n');

const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

// 全ユーザー行を取得
const { data: rows, error: fetchErr } = await sb.from('user_data').select('user_id, tasks');
if (fetchErr) { console.error('fetch error:', fetchErr); process.exit(1); }
if (!rows?.length) { console.log('データなし（RLSでブロックされている場合は service_role キーを使ってください）'); process.exit(0); }

for (const row of rows) {
  const userId = row.user_id;
  const tasks = row.tasks || [];
  console.log(`\n=== user: ${userId} / tasks: ${tasks.length}件 ===`);

  const nonRecurring = tasks.filter(t => !t.repeat || t.repeat === 'none');
  const recurring    = tasks.filter(t => t.repeat && t.repeat !== 'none');

  // 繰り返しタスクの重複排除
  // キー: name|clientId|repeat
  // 残す優先順位: 未完了 > 最新 dueDate > 最新 createdAt
  const best = new Map();
  for (const t of recurring) {
    const key = `${t.name}|${t.clientId}|${t.repeat}`;
    if (!best.has(key)) {
      best.set(key, t);
    } else {
      const score = t => (t.completed ? 0 : 1e15)
        + new Date(t.dueDate    || '1970-01-01').getTime()
        + new Date(t.createdAt  || '1970-01-01').getTime() / 1e3;
      if (score(t) > score(best.get(key))) best.set(key, t);
    }
  }

  const keptRecurring = [...best.values()];
  const finalTasks    = [...nonRecurring, ...keptRecurring];
  const removed       = recurring.filter(t => !keptRecurring.find(k => k.id === t.id));

  console.log(`  非繰り返し: ${nonRecurring.length}件 (変更なし)`);
  console.log(`  繰り返し:   ${recurring.length}件 → ${keptRecurring.length}件 (削除: ${removed.length}件)`);

  if (removed.length) {
    console.log('\n  [削除対象]');
    for (const r of removed) {
      console.log(`    - "${r.name}" / repeat:${r.repeat} / due:${r.dueDate} / completed:${r.completed}`);
    }
  }

  console.log('\n  [保持する繰り返しタスク]');
  for (const k of keptRecurring) {
    console.log(`    + "${k.name}" / repeat:${k.repeat} / due:${k.dueDate} / completed:${k.completed}`);
  }

  if (DRY_RUN) {
    console.log(`\n  → [DRY RUN] スキップ (保存後: ${finalTasks.length}件になる予定)`);
    continue;
  }

  const { error: saveErr } = await sb.from('user_data').upsert({
    user_id: userId,
    tasks: finalTasks,
  });
  if (saveErr) {
    console.error(`  save error:`, saveErr);
  } else {
    console.log(`\n  → 保存完了 ✓ (${tasks.length}件 → ${finalTasks.length}件)`);
  }
}
