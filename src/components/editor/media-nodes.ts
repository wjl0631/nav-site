import { Node, mergeAttributes } from '@tiptap/core';

/**
 * 视频 / 音频原子节点
 * - 图片用官方 Image 扩展
 * - 视频、音频使用自定义 Node，渲染为原生 <video>/<audio>，前台直接可播放
 */
function createMediaNode(name: 'video' | 'audio') {
  return Node.create({
    name,
    group: 'block',
    atom: true,
    draggable: true,
    selectable: true,

    addAttributes() {
      return {
        src: { default: null },
        poster: { default: null },
        controls: { default: true },
      };
    },

    parseHTML() {
      return [{ tag: `${name}[src]` }];
    },

    renderHTML({ HTMLAttributes }) {
      return [
        name,
        mergeAttributes(
          {
            controls: 'true',
            preload: 'metadata',
            class: name === 'video' ? 'nav-video' : 'nav-audio',
          },
          HTMLAttributes,
        ),
      ];
    },
  });
}

export const VideoNode = createMediaNode('video');
export const AudioNode = createMediaNode('audio');
