import assert from "node:assert/strict";
import test from "node:test";

import { normalizeSupabaseUrl } from "../lib/supabase-url";

test("Supabase 프로젝트 URL은 그대로 사용한다", () => {
  assert.equal(
    normalizeSupabaseUrl("https://project.supabase.co"),
    "https://project.supabase.co"
  );
});

test("잘못 포함된 REST 경로와 마지막 슬래시를 제거한다", () => {
  assert.equal(
    normalizeSupabaseUrl(" https://project.supabase.co/rest/v1/ "),
    "https://project.supabase.co"
  );
});
