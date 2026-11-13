// Browser test for the actual comment renderer with fake data; never touches user accounts.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const url=process.env.LOOX_AUDIT_URL||'http://127.0.0.1:8765/';
const me='11111111-1111-4111-8111-111111111111',postId='33333333-3333-4333-8333-333333333333';
const cloud=