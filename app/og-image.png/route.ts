import { createElement as h } from 'react';
import { ImageResponse } from 'next/og';

export const runtime = 'edge';

const gold = '#d8b66d';
const cream = '#fff9e9';
const navy = '#0b2347';

function circle(size: number, border: string, inset = 0) {
  return h('div', {
    style: {
      position: 'absolute',
      width: size,
      height: size,
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -50%)',
      borderRadius: '50%',
      border,
      boxSizing: 'border-box',
      ...(inset ? { padding: inset } : {}),
    },
  });
}

export async function GET() {
  const book = h('div', {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 190,
      height: 112,
      position: 'relative',
      marginTop: 10,
    },
  },
    h('div', {
      style: {
        width: 88,
        height: 88,
        background: cream,
        border: '5px solid ' + gold,
        borderRadius: '10px 4px 4px 10px',
        transform: 'skewY(8deg)',
        marginRight: 2,
      },
    }),
    h('div', {
      style: {
        width: 88,
        height: 88,
        background: cream,
        border: '5px solid ' + gold,
        borderRadius: '4px 10px 10px 4px',
        transform: 'skewY(-8deg)',
        marginLeft: 2,
      },
    }),
    h('div', {
      style: {
        position: 'absolute',
        width: 5,
        height: 90,
        background: gold,
        left: '50%',
        top: 8,
      },
    }),
  );

  const emblem = h('div', {
    style: {
      width: 390,
      height: 390,
      borderRadius: '50%',
      background: 'radial-gradient(circle at 50% 38%, #1d4676 0%, #0a2348 72%)',
      border: '10px solid ' + gold,
      boxShadow: '0 0 0 5px #f5e3b7, 0 0 0 12px #9d7434',
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      color: cream,
      flexShrink: 0,
    },
  },
    circle(350, '3px solid rgba(245,220,155,.7)'),
    circle(320, '2px dashed rgba(245,220,155,.6)'),
    h('div', { style: { fontSize: 28, color: '#f1d58b', fontWeight: 700, letterSpacing: 5, marginBottom: 3 } }, 'ٱلْبُرْهَان'),
    book,
    h('div', { style: { fontSize: 33, color: '#f5dfa4', fontWeight: 800, letterSpacing: 3, marginTop: 8 } }, 'AL-BURHAN'),
    h('div', { style: { fontSize: 13, color: cream, fontWeight: 700, letterSpacing: 2, marginTop: 4 } }, 'THE PROOF WEBSITE'),
  );

  const content = h('div', {
    style: {
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      gap: 54,
      padding: '54px 64px',
      boxSizing: 'border-box',
      position: 'relative',
      overflow: 'hidden',
      background: 'linear-gradient(125deg, #06172d 0%, #073a32 58%, #092644 100%)',
      color: cream,
      fontFamily: 'Arial, sans-serif',
    },
  },
    h('div', { style: { position: 'absolute', right: -180, top: -230, width: 650, height: 650, borderRadius: '50%', border: '2px solid rgba(224,190,112,.18)' } }),
    h('div', { style: { position: 'absolute', right: -80, top: -140, width: 470, height: 470, borderRadius: '50%', border: '2px solid rgba(224,190,112,.14)' } }),
    h('div', { style: { position: 'absolute', left: 0, bottom: 0, width: '100%', height: 10, background: 'linear-gradient(90deg,#b88a3c,#f1d78a,#b88a3c)' } }),
    emblem,
    h('div', { style: { display: 'flex', flexDirection: 'column', flex: 1, zIndex: 2 } },
      h('div', { style: { color: '#e7ca83', fontSize: 18, fontWeight: 700, letterSpacing: 4, marginBottom: 20 } }, 'RESEARCH & KNOWLEDGE LIBRARY'),
      h('div', { style: { color: cream, fontSize: 65, lineHeight: 1.08, fontWeight: 800 } }, 'AL-BURHAN'),
      h('div', { style: { color: '#f0d28b', fontSize: 29, fontWeight: 600, marginTop: 12 } }, 'THE PROOF WEBSITE'),
      h('div', { style: { width: 420, height: 2, background: 'rgba(238,214,157,.55)', marginTop: 25, marginBottom: 20 } }),
      h('div', { style: { color: '#e2eee8', fontSize: 21, lineHeight: 1.5 } }, 'Islamic research, Quran and science, philosophy, history and evidence-based articles in Bangla & English.'),
      h('div', { style: { color: '#d5b46a', fontSize: 15, fontWeight: 700, marginTop: 25, letterSpacing: 1 } }, 'AL-BURHAN-PEARL-NINE.VERCEL.APP'),
    ),
  );

  return new ImageResponse(content, {
    width: 1200,
    height: 630,
    headers: {
      'Cache-Control': 'public, max-age=0, s-maxage=31536000, stale-while-revalidate=86400',
    },
  });
}
