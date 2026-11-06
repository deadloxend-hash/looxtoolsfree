/* LOOX AI animated prompt examples.
   Render as placeholders only: sample text is never inserted into user input or submitted. */
(() => {
  'use strict';

  const prompts = {
    image: [
      'A snow-covered mountain valley under a starry night sky',
      'A cozy cyberpunk neon street in rainy Tokyo, cinematic 8k',
      'Cute fluffy red panda sitting on a mossy tree branch',
      'A futuristic glass castle floating in a sunset sky',
      'An elegant vintage Mercedes parked beside a misty alpine lake',
      'A surreal paper-cut city floating above the clouds',
      'A majestic white tiger in an enchanted moonlit forest',
      'A cinematic portrait in golden-hour light, intricate details'
    ],
    video: [
      'A cinematic drone shot flying above snowy mountains at sunrise',
      'A vintage sports car driving through neon Tokyo in the rain',
      'A red fox running through a snowy forest, smooth tracking shot',
      'Ocean waves glowing with bioluminescence, slow aerial camera movement',
      'A futuristic train crossing a desert at sunset, cinematic camera pan',
      'A tiny astronaut exploring a glowing alien garden, gentle dolly shot',
      'A cozy cabin beside a lake as snow falls, slow camera push-in',
      'A majestic eagle soaring over a waterfall, sweeping aerial movement'
    ],
    agent: [
      'Help me brainstorm a unique concept for an AI-generated image',
      'Write a cinematic prompt for a fantasy adventure scene',
      'How can I make my AI images look more photorealistic?',
      'Create a detailed video prompt for a rainy cyberpunk city',
      'Suggest five creative ideas for my next design project',
      'Turn my short idea into a professional image generation prompt',
      'Help me plan a beautiful portfolio for my creative work',
      'Explain how to improve lighting and composition in AI art'
    ]
  };

  const targets = [
    ['lig-prompt', 'image'],
    ['lvg-prompt', 'video'],
    ['aiPrompt', 'agent'],
    ['loox-landing-prompt', 'image'],
    ['lig-landing-prompt', 'image'],
    ['creative-prompt', document.body?.dataset.creativeMode === 'video' ? 'video' : 'image']
  ];

  function animate(field, kind) {
    if (!field || field.dataset.looxAnimatedPrompt === 'true') return;
    field.dataset.looxAnimatedPrompt = 'true';

    const examples = prompts[kind];
    const fallback = field.getAttribute('placeholder') || '';
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let timer = null;
    let running = false;
    let index = -1;
    let length = 0;
    let deleting = false;

    function cancelTimer() {
      if (timer !== null) clearTimeout(timer);
      timer = null;
    }

    function stop() {
      running = false;
      cancelTimer();
      field.placeholder = '';
    }

    function schedule(delay) {
      cancelTimer();
      timer = setTimeout(tick, delay);
    }

    function tick() {
      timer = null;
      if (!running) return;
      if (field.value.length > 0 || document.activeElement === field) {
        stop();
        return;
      }
      if (document.hidden) {
        cancelTimer();
        return;
      }

      const example = examples[index];
      if (!deleting) {
        length = Math.min(example.length, length + 1);
        field.placeholder = example.slice(0, length);
        if (length === example.length) {
          deleting = true;
          schedule(2000);
        } else {
          schedule(55);
        }
      } else {
        length = Math.max(0, length - 1);
        field.placeholder = example.slice(0, length);
        if (length === 0) {
          index = (index + 1) % examples.length;
          deleting = false;
          schedule(300);
        } else {
          schedule(27);
        }
      }
    }

    function start() {
      cancelTimer();
      running = false;
      if (field.value.length > 0 || document.activeElement === field) {
        field.placeholder = '';
        return;
      }
      if (document.hidden) {
        field.placeholder = fallback;
        return;
      }
      if (reducedMotion.matches) {
        field.placeholder = examples[0];
        return;
      }
      index = (index + 1) % examples.length;
      length = 0;
      deleting = false;
      field.placeholder = '';
      running = true;
      schedule(70);
    }

    // Never treat an animated example as the user's actual prompt.
    field.addEventListener('pointerdown', stop);
    field.addEventListener('focus', stop);
    field.addEventListener('input', stop);
    field.addEventListener('blur', () => {
      if (field.value.length === 0) start();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        cancelTimer();
      } else if (document.activeElement !== field && field.value.length === 0) {
        start();
      }
    });
    window.addEventListener('pageshow', (event) => {
      if (event.persisted && document.activeElement !== field && field.value.length === 0) start();
    });
    reducedMotion.addEventListener?.('change', () => {
      if (document.activeElement !== field && field.value.length === 0) start();
    });

    start();
  }

  function init() {
    for (const [id, kind] of targets) animate(document.getElementById(id), kind);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
