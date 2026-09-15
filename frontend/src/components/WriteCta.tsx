/**
 * @file WriteCta.tsx
 * @description 首页"开始写作" CTA — 始终指向 /write，由 AuthGate 拦截未登录访客并跳转登录页
 */
'use client';

import { Button } from './ui/Button';

/**
 * WriteCta 首页开始写作入口
 */
export function WriteCta() {
  return (
    <Button href="/write" variant="ghost" size="lg">
      开始写作
    </Button>
  );
}
