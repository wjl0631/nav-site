'use client';

import { useEffect } from 'react';

/**
 * 文章阅读上报。
 * 计数逻辑已从服务端渲染期移到这里，目的有两个：
 * 1. 渲染过程不再产生副作用（原先 RSC 每次渲染都直接自增，预取/爬虫/刷新都会虚增）；
 * 2. 真正的去重由 /api/articles/[id]/view 的 Cookie 完成，这里仅用 sessionStorage
 *    做同标签页的快速短路，减少无谓请求。
 */
export function ViewTracker({ articleId }: { articleId: string }) {
  useEffect(() => {
    if (!articleId) return;

    const key = `nav:viewed:${articleId}`;
    try {
      if (sessionStorage.getItem(key)) return;
    } catch {
      // 无痕模式或禁用存储时忽略，交给服务端 Cookie 去重
    }

    fetch(`/api/articles/${encodeURIComponent(articleId)}/view`, {
      method: 'POST',
      keepalive: true,
    })
      .then(() => {
        try {
          sessionStorage.setItem(key, '1');
        } catch {
          // 忽略
        }
      })
      .catch(() => undefined);
  }, [articleId]);

  return null;
}
