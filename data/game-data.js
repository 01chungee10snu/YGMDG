window.YONGGANG_GAME_DATA = {
  name: '용강 만들기',
  version: '2.0.0-value-chain',
  googleSheets: {
    mode: 'web-app-or-local-fallback',
    spreadsheetId: '1bdcRVCFmTrgMUi-CFj28E-AknJjqb8HxHghfyU_XuB8',
    spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/1bdcRVCFmTrgMUi-CFj28E-AknJjqb8HxHghfyU_XuB8/edit',
    endpoint: '',
    schema: ['timestamp', 'player', 'score', 'maxTier', 'durationMs', 'mergeCount']
  },
  tiers: [
    { id: 'iron_ore', name: '철광석', stage: '원료', radius: 18, score: 2, color: '#8f4f35', edge: '#4d2d28', density: 0.0018, restitution: 0.18, friction: 0.76, icon: '⛏️', desc: '제철 밸류체인의 출발점입니다.' },
    { id: 'coal', name: '석탄', stage: '원료', radius: 22, score: 5, color: '#2b2d35', edge: '#101218', density: 0.00155, restitution: 0.16, friction: 0.82, icon: '◼', desc: '열과 환원력을 제공하는 원료입니다.' },
    { id: 'coke', name: '코크스', stage: '원료 전처리', radius: 28, score: 9, color: '#56515a', edge: '#1f2228', density: 0.00145, restitution: 0.20, friction: 0.74, icon: '◆', desc: '석탄을 가공해 만든 고로용 연료입니다.' },
    { id: 'blast_furnace', name: '제선공정', stage: '제선', radius: 35, score: 16, color: '#d25a2c', edge: '#74301f', density: 0.0019, restitution: 0.12, friction: 0.84, icon: '炉', desc: '고로에서 철광석을 녹여 쇳물을 만듭니다.' },
    { id: 'pig_iron', name: '쇳물', stage: '용선', radius: 43, score: 24, color: '#ff7b24', edge: '#9d330e', density: 0.0022, restitution: 0.10, friction: 0.70, icon: '●', desc: '뜨거운 용선입니다.' },
    { id: 'steelmaking', name: '제강공정', stage: '정련', radius: 52, score: 35, color: '#ffb13b', edge: '#c46b00', density: 0.00205, restitution: 0.11, friction: 0.72, icon: '⚙', desc: '불순물을 줄이고 강 성분을 조정합니다.' },
    { id: 'casting', name: '연주·반제품', stage: '주조', radius: 62, score: 48, color: '#b9c5cf', edge: '#61717e', density: 0.0023, restitution: 0.15, friction: 0.68, icon: '▰', desc: '슬래브·블룸·빌릿 같은 반제품으로 굳힙니다.' },
    { id: 'hot_rolled', name: '열연강판', stage: '압연', radius: 73, score: 64, color: '#6f8fa8', edge: '#344b5c', density: 0.0026, restitution: 0.13, friction: 0.66, icon: '▭', desc: '뜨겁게 압연한 강판입니다.' },
    { id: 'section_steel', name: '형강·봉강', stage: '제품군', radius: 86, score: 82, color: '#8796a3', edge: '#44515b', density: 0.00285, restitution: 0.12, friction: 0.70, icon: 'H', desc: '건물과 인프라에 쓰이는 구조용 강재입니다.' },
    { id: 'special_steel', name: '특수강·내연', stage: '고급 제품', radius: 101, score: 105, color: '#4b6f98', edge: '#243b55', density: 0.0030, restitution: 0.10, friction: 0.75, icon: '★', desc: '자동차·기계용 고성능 강재입니다.' },
    { id: 'final_goods', name: '자동차·가전·건물', stage: '수요 산업', radius: 116, score: 135, color: '#2f89c5', edge: '#104766', density: 0.00315, restitution: 0.09, friction: 0.78, icon: '🏙', desc: '강재가 실제 제품과 도시로 이어집니다.' },
    { id: 'yonggang', name: '용강', stage: '최종 생물', radius: 132, score: 200, color: '#ffbd3f', edge: '#18347a', density: 0.0033, restitution: 0.08, friction: 0.82, icon: '☺', desc: '제철 밸류체인의 흐름으로 태어난 생물입니다.' }
  ]
};
