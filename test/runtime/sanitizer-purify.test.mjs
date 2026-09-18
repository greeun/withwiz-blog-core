/**
 * 새니타이저 보안 회귀 테스트 (DOMPurify 주입 경로 + 정규식 경로)
 *
 * - `purify: null` 은 정규식 경로를 강제한다.
 * - `purify: <인스턴스>` 는 그 인스턴스를 쓴다. 실제 DOMPurify 는 devDependencies 의
 *   `isomorphic-dompurify` 로 기본 실행에서 검증한다. devDependencies 를 설치하지 않아
 *   해석할 수 없는 환경에서만 건너뛴다. 옵션 전달·훅 등록 계약은 스텁 인스턴스로 항상 검증한다.
 * - 판정은 문자열 정규식이 아니라 helpers/html-inspect.mjs 의 토큰화 결과(브라우저가
 *   인식하는 속성 목록)로 한다.
 */
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { createSanitizer } from '../../dist/utils/index.mjs';
import { findUnsafe, startTags, commentsOf, attrOf, tokenize } from './helpers/html-inspect.mjs';

const require = createRequire(import.meta.url);

// 경고 수집: 이 파일 안의 모든 sanitize 호출에서 발생한 경고를 모은다.
const warnLog = [];
const origWarn = console.warn;
console.warn = (...args) => warnLog.push(args.join(' '));
after(() => {
  console.warn = origWarn;
});

function loadRealPurify() {
  try {
    const mod = require('isomorphic-dompurify');
    const candidate = mod?.default ?? mod;
    return typeof candidate?.sanitize === 'function' ? candidate : null;
  } catch {
    return null;
  }
}

const realPurify = loadRealPurify();
const SKIP_REAL = realPurify
  ? false
  : 'isomorphic-dompurify 를 해석할 수 없음 (devDependencies 를 설치하면 실행)';

const BYPASS_INPUTS = [
  ['슬래시 뒤 이벤트 속성', '<p>ok</p><img src="x"/onerror="alert(1)">'],
  ['태그명 뒤 슬래시 이벤트 속성', '<svg/onload=alert(1)>'],
  ['따옴표 직후 이벤트 속성', '<a href="https://x.com/"onmouseover="alert(1)">x</a>'],
  ['엔티티 난독화 javascript:', '<a href="jav&#x61;script:alert(1)">x</a>'],
  ['닫는 태그 없는 비신뢰 iframe', '<p>a</p><iframe src="https://evil.example/x">'],
  ['self-closing 비신뢰 iframe', '<p>a</p><iframe src="https://evil.example/x"/>'],
  // 태그 매칭은 따옴표 속성값 안의 > 를 태그 끝으로 보면 안 된다
  ['따옴표 속성값 안의 > 뒤 이벤트 속성', '<img title="a>b" onerror="alert(1)">'],
  ['작은따옴표 속성값 안의 > 뒤 javascript: href', `<a title='x>y' href="javascript:alert(1)">x</a>`],
  ['속성명 안의 따옴표 뒤 이벤트 속성', '<a b"c onclick=alert(1)>x</a>'],
  // raw text 요소·CDATA 는 브라우저에서 내용이 텍스트가 되어 태그 경계가 달라진다
  ['title raw text 경계', '<title><a title="</title><img src=x onerror=alert(1)>"></a></title>'],
  ['noscript raw text 경계', '<noscript><p title="</noscript><img src=x onerror=alert(1)>"></p></noscript>'],
  ['xmp raw text 경계', '<xmp><a title="</xmp><img src=x onerror=alert(1)>"></a></xmp>'],
  ['textarea raw text 경계', '<textarea><a title="</textarea><img src=x onerror=alert(1)>"></a></textarea>'],
  [
    '신뢰 iframe raw text 경계',
    '<iframe src="https://www.youtube.com/embed/x"><a title="</iframe><img src=x onerror=alert(1)>"></a></iframe>',
  ],
  ['svg CDATA 와 주석 경계', '<svg><![CDATA[ > <!-- ]]> <img src=x onerror=alert(1)> --></svg>'],
];

// 정규식 대체 새니타이저 공통 명세(cms-kit 과 같은 입력): SVG 애니메이션 요소는 대상 속성을
// javascript: 로 바꿀 수 있고, meta·base·link 는 새로고침 이동·상대 URL 기준·외부 스타일을 주입한다.
// 정규식 경로는 8개 요소를 모두 제거해야 한다.
const ANIMATION_META_TAGS = new Set([
  'animate', 'animatemotion', 'animatetransform', 'animatecolor', 'set', 'meta', 'base', 'link',
]);
// DOMPurify 3.4.15 기본 SVG 허용 목록에는 animatemotion·animatetransform·animatecolor 가 있어 요소 대신
// href 를 가리키는 attributeName 등 속성을 지워 무력화한다. DOMPurify 경로의 요소 제거 단언은 아래로 한정한다.
const DOMPURIFY_REMOVED_TAGS = new Set(['animate', 'set', 'meta', 'base', 'link']);
const ANIMATION_META_INPUTS = [
  ['svg a 안 animate 자체 닫는 태그', '<svg><a href="#"><animate attributeName="href" to="javascript:alert(1)"/><text>x</text></a></svg>'],
  ['svg a 안 set 여는·닫는 태그', '<svg><a><set attributeName="href" to="javascript:alert(1)"></set></a></svg>'],
  ['대문자 SVG·A·ANIMATE 와 무따옴표 속성', '<SVG><A><ANIMATE ATTRIBUTENAME=href TO=javascript:alert(1)></ANIMATE></A></SVG>'],
  ['meta refresh', '<meta http-equiv="refresh" content="0;url=javascript:alert(1)">'],
  ['base href', '<base href="https://evil.example/">'],
  ['link stylesheet', '<link rel="stylesheet" href="https://evil.example/x.css">'],
];
const ANIMATION_META_WORDS_HTML = '<p>settings, link, base, meta, animate 라는 단어</p>';

const INTERPRETATIONS = [false, true].flatMap((rawText) => [false, true].map((cdata) => ({ rawText, cdata })));

/** 브라우저 해석(raw text·CDATA 해석 포함)과 원문 문자열 양쪽에서 남은 대상 태그를 찾는다. */
function remainingTags(html, names) {
  const found = new Set();
  for (const options of INTERPRETATIONS) {
    for (const token of tokenize(html, options)) {
      if ((token.type === 'startTag' || token.type === 'endTag') && names.has(token.name)) {
        found.add(`${token.type}:${token.name}`);
      }
    }
  }
  const raw = html.match(new RegExp(`</?(?:${[...names].join('|')})(?=[\\s/>]|$)`, 'gi'));
  for (const m of raw ?? []) found.add(`raw:${m}`);
  return [...found];
}

/** href·xlink:href 를 대상으로 하는 attributeName 속성을 찾는다 (대소문자·앞뒤 공백 무시). */
function hrefTargetingAttributeNames(html) {
  const found = new Set();
  for (const options of INTERPRETATIONS) {
    for (const token of tokenize(html, options)) {
      if (token.type !== 'startTag') continue;
      for (const { name, value } of token.attrs) {
        const target = value.trim().toLowerCase();
        if (name === 'attributename' && (target === 'href' || target === 'xlink:href')) {
          found.add(`<${token.name} attributeName="${value}">`);
        }
      }
    }
  }
  return [...found];
}

const DATA_COMMENT_HTML =
  '<!-- nbe-blocks:eyJ0eXBlIjoicCIsInRleHQiOiLrs7jrrLgifQ== -->' +
  '<p>본문</p><!--nbe-cta-start--><div class="nbe-cta">CTA</div><!--nbe-cta-end-->';

// 블록 에디터 직렬화 주석 <!-- {marker}{base64} --> (base64 에 +·/·= 포함)
const MARKER_COMMENT_HTML =
  '<!-- abe-blocks:eyJ0eXBlIjoiYmlvIiwidGV4dCI6ImE+YiB+PyJ9 --><div class="abe">약력</div>' +
  '<!-- pme-data:eyJ0Ijoi6rO17JewIiwidSI6Imh0dHBzOi8veC8/YT0xJmI9MiJ9 --><p>공연</p>' +
  '<!-- rme-data:eyJ0Ijoi66CI7Y287Yag66asPj4ifQ== -->';

const PRESERVE_HTML =
  '<p class="lead" style="color:red">안녕</p>' +
  '<a href="https://ok.example/post?a=1&amp;b=2" target="_blank" rel="noopener noreferrer">링크</a>' +
  '<iframe src="https://www.youtube.com/embed/abc" allowfullscreen frameborder="0" allow="autoplay"></iframe>';

function defineSharedCases(label, makeSanitizer, skip, { removedTags }) {
  for (const [name, input] of BYPASS_INPUTS) {
    test(`[${label}] 우회 차단: ${name}`, { skip }, () => {
      const out = makeSanitizer()(input);
      assert.deepEqual(findUnsafe(out), [], `위험 요소 잔존: ${out}`);
    });
  }

  for (const [name, input] of ANIMATION_META_INPUTS) {
    test(`[${label}] 애니메이션·메타 요소 제거: ${name}`, { skip }, () => {
      const out = makeSanitizer()(input);
      assert.deepEqual(remainingTags(out, removedTags), [], `대상 태그 잔존: ${out}`);
      assert.doesNotMatch(out, /javascript:/i, `javascript: 잔존: ${out}`);
      assert.deepEqual(hrefTargetingAttributeNames(out), [], `href 대상 attributeName 잔존: ${out}`);
      assert.deepEqual(findUnsafe(out), [], `위험 요소 잔존: ${out}`);
    });
  }

  test(`[${label}] 애니메이션·메타 요소 이름이 들어간 본문 단어는 보존`, { skip }, () => {
    assert.equal(makeSanitizer()(ANIMATION_META_WORDS_HTML), ANIMATION_META_WORDS_HTML);
  });

  test(`[${label}] 비신뢰 iframe 제거 후 앞 콘텐츠는 유지`, { skip }, () => {
    const out = makeSanitizer()('<p>a</p><iframe src="https://evil.example/x">');
    assert.ok(startTags(out).some((t) => t.name === 'p'), `p 유지: ${out}`);
  });

  test(`[${label}] 블록 에디터 데이터 주석 보존`, { skip }, () => {
    const out = makeSanitizer()(DATA_COMMENT_HTML);
    assert.deepEqual(commentsOf(out), [
      ' nbe-blocks:eyJ0eXBlIjoicCIsInRleHQiOiLrs7jrrLgifQ== ',
      'nbe-cta-start',
      'nbe-cta-end',
    ]);
  });

  test(`[${label}] abe-blocks·pme-data·rme-data 데이터 주석 보존`, { skip }, () => {
    const out = makeSanitizer()(MARKER_COMMENT_HTML);
    assert.deepEqual(commentsOf(out), [
      ' abe-blocks:eyJ0eXBlIjoiYmlvIiwidGV4dCI6ImE+YiB+PyJ9 ',
      ' pme-data:eyJ0Ijoi6rO17JewIiwidSI6Imh0dHBzOi8veC8/YT0xJmI9MiJ9 ',
      ' rme-data:eyJ0Ijoi66CI7Y287Yag66asPj4ifQ== ',
    ]);
  });

  test(`[${label}] class·style·target·신뢰 iframe 유지`, { skip }, () => {
    const out = makeSanitizer()(PRESERVE_HTML);
    const tags = startTags(out);
    const p = tags.find((t) => t.name === 'p');
    const a = tags.find((t) => t.name === 'a');
    const iframe = tags.find((t) => t.name === 'iframe');
    assert.equal(attrOf(p, 'class'), 'lead');
    assert.equal(attrOf(p, 'style'), 'color:red');
    assert.equal(attrOf(a, 'href'), 'https://ok.example/post?a=1&b=2');
    assert.equal(attrOf(a, 'target'), '_blank');
    assert.ok(iframe, `신뢰 iframe 유지: ${out}`);
    assert.equal(attrOf(iframe, 'src'), 'https://www.youtube.com/embed/abc');
    assert.equal(attrOf(iframe, 'allow'), 'autoplay');
    assert.equal(attrOf(iframe, 'frameborder'), '0');
    assert.equal(attrOf(iframe, 'allowfullscreen'), '');
  });

  test(`[${label}] 빈 값은 그대로 반환`, { skip }, () => {
    const s = makeSanitizer();
    assert.equal(s(''), '');
    assert.equal(s(null), null);
    assert.equal(s(undefined), undefined);
  });

  test(`[${label}] trustedIframeOrigins 옵션 유지`, { skip }, () => {
    const s = makeSanitizer({ trustedIframeOrigins: ['https://ok.example/'] });
    const out = s(
      '<iframe src="https://ok.example/embed/1"></iframe><iframe src="https://www.youtube.com/embed/2"></iframe>',
    );
    const srcs = startTags(out)
      .filter((t) => t.name === 'iframe')
      .map((t) => attrOf(t, 'src'));
    assert.deepEqual(srcs, ['https://ok.example/embed/1']);
  });
}

// ── 정규식 경로 (purify: null) ──

const regexSanitizer = (config = {}) => createSanitizer({ ...config, purify: null });
defineSharedCases('정규식', regexSanitizer, false, { removedTags: ANIMATION_META_TAGS });

test('[정규식] 연속·중첩 이벤트 속성 반복 제거', () => {
  const s = regexSanitizer();
  const inputs = [
    '<img src="x"onerror="a"onload="b">',
    "<img src='x'onerror='a'/onload=b onfocus=c>",
    '<img src="x" o<script>1</script>nerror="alert(1)">',
    '<scr onclick="x"ipt>alert(1)</script>',
    '<svg><a/onclick=a/onmouseover=b>x</a></svg>',
    '<<object>img src=x onerror=alert(1)>',
    '<scr<object>ipt>alert(1)</script>',
  ];
  for (const input of inputs) {
    const out = s(input);
    assert.deepEqual(findUnsafe(out), [], `${input} → ${out}`);
  }
});

test('[정규식] URL 속성 엔티티·공백·제어문자 난독화 차단', () => {
  const s = regexSanitizer();
  const inputs = [
    '<a href="&#106;avascript:alert(1)">x</a>',
    '<a href="&#0000106avascript:alert(1)">x</a>',
    '<a href="javascript&colon;alert(1)">x</a>',
    '<a href="java&Tab;script:alert(1)">x</a>',
    '<a href="java&NewLine;script&#58alert(1)">x</a>',
    '<a href="&#x6A;&#x61;&#x76;&#x61;&#x73;&#x63;&#x72;&#x69;&#x70;&#x74;&#x3A;alert(1)">x</a>',
    '<a href=" javascript:alert(1)">x</a>',
    '<a href=&#106;avascript:alert(1)>x</a>',
    "<a href='vbscript:msgbox(1)'>x</a>",
    '<a href="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">x</a>',
    '<a href="d&#97;ta:text/html,<b>x</b>">x</a>',
    '<svg><a xlink:href="jav&#x61;script:alert(1)"><text>x</text></a></svg>',
    '<svg><a/href="javascript:alert(1)">x</a></svg>',
    '<math><mi formaction="javascript:alert(1)" action="javascript:alert(2)">x</mi></math>',
    // 다른 속성 값 안의 가짜 `href=` 후보가 실제 href 판정을 건너뛰게 하면 안 된다
    '<a title="href=" href="javascript:alert(1)">x</a>',
    "<a data-x='src=' href='jav&#x61;script:alert(1)'>x</a>",
  ];
  for (const input of inputs) {
    const out = s(input);
    assert.deepEqual(findUnsafe(out), [], `${input} → ${out}`);
  }
});

test('[정규식] data:image/ URL 과 일반 링크는 보존', () => {
  const s = regexSanitizer();
  const input =
    '<img src="data:image/png;base64,iVBORw0KGgo=" alt="dot">' +
    '<a href="https://ok.example/a?x=1&amp;y=2#h">ok</a><a href="/relative/path">rel</a><a href="mailto:a@b.c">m</a>';
  assert.equal(s(input), input);
});

test('[정규식] 신뢰 origin 판정은 실제 src 속성 기준 (data-src·중복 src 우회 차단)', () => {
  const s = regexSanitizer();
  const inputs = [
    '<iframe data-src="https://www.youtube.com/embed/x" src="https://evil.example/x"></iframe>',
    '<iframe title="src=\'https://www.youtube.com/\'" src="https://evil.example/x"></iframe>',
    '<iframe src="https://evil.example/x" src="https://www.youtube.com/embed/x"></iframe>',
    '<iframe data-src="https://www.youtube.com/embed/x" src="https://evil.example/x">',
    // nbsp 는 HTML 공백이 아니므로 `src ` 는 src 가 아닌 다른 속성이다
    '<iframe src ="https://www.youtube.com/embed/x" src="https://evil.example/x"></iframe>',
    '<iframe title=">" src="https://evil.example/x"></iframe>',
  ];
  for (const input of inputs) {
    const out = s(input);
    assert.deepEqual(findUnsafe(out), [], `${input} → ${out}`);
  }
});

test('[정규식] 신뢰 iframe 에 구분자 없이 붙인 srcdoc 제거', () => {
  const s = regexSanitizer();
  const out = s(
    '<iframe src="https://www.youtube.com/embed/x"srcdoc="&lt;img src=x o&#110;error=alert(1)&gt;"></iframe>',
  );
  assert.deepEqual(findUnsafe(out), [], out);
  assert.ok(startTags(out).some((t) => t.name === 'iframe'), `신뢰 iframe 유지: ${out}`);
});

test('[정규식] 태그 밖 본문 텍스트는 바꾸지 않는다', () => {
  const s = regexSanitizer();
  const input =
    '<p>설정 예: "online=true", "one=1", \'onload=x\' / onclick=y</p>' +
    '<pre><code>&lt;a href="javascript:void(0)"&gt; 와 href="javascript:void(0)", src=\'data:text/html,x\'</code></pre>';
  assert.equal(s(input), input);
});

test('[정규식] 따옴표 속성값 안의 > 를 포함한 태그도 속성값은 보존하며 정리', () => {
  const s = regexSanitizer();
  assert.equal(s('<img title="a>b" onerror="alert(1)">'), '<img title="a>b">');
  assert.equal(s(`<a title='x>y' href="javascript:alert(1)">x</a>`), `<a title='x>y' href="">x</a>`);
});

test('[정규식] 끝나지 않은 태그는 제거해 뒤에 이어 붙는 마크업을 속성으로 삼키지 않는다', () => {
  const s = regexSanitizer();
  const out = s('<p>a</p><img src=x onerror=alert(1) ');
  assert.equal(out, '<p>a</p>');
  assert.deepEqual(findUnsafe(`<div>${out}</div>`), []);
});

test('[정규식] 제거가 새 태그를 만드는 입력은 반복 정리, 16회 안에 수렴하지 않으면 꺾쇠 이스케이프', () => {
  const s = regexSanitizer();
  // <<object>script> → <object> 제거 후 <script> 가 생긴다. k 겹이면 k+2 회 만에 수렴한다.
  const nested = (k) => `${'<'.repeat(k)}<object>${'object>'.repeat(k - 1)}script>alert(1)</script>`;
  const shallow = s(nested(3));
  assert.deepEqual(findUnsafe(shallow), [], shallow);
  assert.ok(!shallow.includes('&lt;'), `수렴한 결과는 이스케이프하지 않음: ${shallow}`);
  const deep = s(nested(20));
  assert.ok(!deep.includes('<'), `수렴하지 않으면 꺾쇠 이스케이프: ${deep}`);
  assert.deepEqual(findUnsafe(deep), []);
});

test('[정규식] 애니메이션·메타 요소는 대소문자·자체 닫는 태그·닫는 태그 형태와 무관하게 제거', () => {
  const s = regexSanitizer();
  const input =
    '<p>a</p><svg><animateMotion path="M0,0"/><animateTransform attributeName="transform" to="1"></animateTransform>' +
    '<AnimateColor attributeName="fill" to="red"/><SET attributeName="href" to="javascript:alert(1)"/></set >' +
    '</svg><Meta charset="utf-8"/><LINK href=x.css><BASE target=_blank></base></META ></Link><p>b</p>';
  const out = s(input);
  assert.deepEqual(remainingTags(out, ANIMATION_META_TAGS), [], out);
  assert.doesNotMatch(out, /javascript:/i, out);
  assert.deepEqual(hrefTargetingAttributeNames(out), [], out);
  assert.equal(out, '<p>a</p><svg></svg><p>b</p>');
});

test('[정규식] 애니메이션·메타 요소와 이름이 겹치는 다른 태그는 건드리지 않는다', () => {
  const s = regexSanitizer();
  const input =
    '<settings>a</settings><linkbox>b</linkbox><metadata>c</metadata><baseline>d</baseline>' +
    '<animated>e</animated><setter/><set-x>f</set-x><p class="set link">g</p>';
  assert.equal(s(input), input);
});

test('[정규식] 블록 에디터 일반 출력은 변경 없음', () => {
  const s = regexSanitizer();
  const input =
    '<!-- nbe-blocks:eyJ2IjoxfQ== --><div class="nbe-pvb-text"><h2 style="text-align:center">제목</h2>' +
    '<p>문단 <strong>강조</strong> <a href="https://ok.example/" target="_blank" rel="noopener noreferrer">링크</a></p>' +
    '<img src="https://cdn.example/a.jpg" alt="사진" loading="lazy"></div><!--nbe-cta-start--><!--nbe-cta-end-->';
  assert.equal(s(input), input);
});

const fallbackWarnings = () => warnLog.filter((m) => /isomorphic-dompurify/.test(m));

test('[정규식] purify: null 명시는 "미설치" 폴백 경고를 내지 않는다', () => {
  // 경고는 프로세스당 1회이므로, 이 시점까지의 모든 호출(전부 purify: null)에서
  // 경고가 한 번도 없어야 null 경로가 경고를 내지 않는다는 뜻이 된다.
  regexSanitizer()('<p>x</p>');
  assert.deepEqual(fallbackWarnings(), []);
});

// ── DOMPurify 주입 경로: 스텁으로 옵션·훅 계약 검증 (항상 실행) ──

function createStubPurify() {
  const stub = {
    calls: [],
    hooks: [],
    sanitize(dirty, options) {
      stub.calls.push({ dirty, options, hooksDuringCall: stub.hooks.length });
      return `[purified]${dirty}`;
    },
    addHook(entryPoint, fn) {
      stub.hooks.push({ entryPoint, fn });
    },
    removeHook(entryPoint, fn) {
      const idx = stub.hooks.findLastIndex(
        (h) => h.entryPoint === entryPoint && (fn === undefined || h.fn === fn),
      );
      if (idx !== -1) stub.hooks.splice(idx, 1);
    },
  };
  return stub;
}

test('[스텁] purify 인스턴스를 넘기면 그 인스턴스와 검증된 옵션을 쓴다', () => {
  const stub = createStubPurify();
  const warnBefore = warnLog.length;
  const out = createSanitizer({ purify: stub })('<p>x</p>');
  assert.equal(out, '[purified]<p>x</p>');
  assert.equal(stub.calls.length, 1);
  const { options, hooksDuringCall } = stub.calls[0];
  assert.deepEqual(options.ADD_TAGS, ['iframe', '#comment']);
  assert.deepEqual(options.ADD_ATTR, ['allowfullscreen', 'frameborder', 'allow', 'target']);
  assert.deepEqual(options.FORBID_TAGS, [
    'script', 'object', 'embed', 'applet', 'form', 'input', 'textarea', 'select', 'button', 'style',
  ]);
  assert.equal(options.FORCE_BODY, true);
  assert.equal(hooksDuringCall, 1, '신뢰 iframe 훅은 sanitize 호출 동안 등록');
  assert.equal(stub.hooks.length, 0, '호출 후 훅 해제');
  assert.equal(warnLog.length, warnBefore, 'purify 주입 시 폴백 경고 없음');
  assert.deepEqual(fallbackWarnings(), [], '이 시점까지 폴백 경고 없음');
});

test('[스텁] 빈 입력은 DOMPurify 에 넘기지 않는다 (FORCE_BODY 주석 방지)', () => {
  const stub = createStubPurify();
  const s = createSanitizer({ purify: stub });
  assert.equal(s(''), '');
  assert.equal(s(null), null);
  assert.equal(s(undefined), undefined);
  assert.equal(stub.calls.length, 0);
});

test('[스텁] allowedTags·allowedAttributes 는 기존처럼 ALLOWED_TAGS·ALLOWED_ATTR 로 전달', () => {
  const stub = createStubPurify();
  createSanitizer({
    purify: stub,
    allowedTags: ['p', 'a'],
    allowedAttributes: { a: ['href', 'target'], p: ['class'] },
  })('<p>x</p>');
  const { options } = stub.calls[0];
  assert.deepEqual(options.ALLOWED_TAGS, ['p', 'a']);
  assert.deepEqual([...options.ALLOWED_ATTR].sort(), ['class', 'href', 'target']);
});

test('[스텁] 훅은 신뢰하지 않는 iframe 노드만 제거한다', () => {
  const stub = createStubPurify();
  let removed = [];
  stub.sanitize = (dirty, options) => {
    const hook = stub.hooks.find((h) => h.entryPoint === 'uponSanitizeElement').fn;
    const node = (nodeName, src) => ({
      nodeName,
      getAttribute: (n) => (n === 'src' ? src : null),
      remove: () => removed.push(`${nodeName}:${src}`),
    });
    hook(node('IFRAME', 'https://evil.example/x'));
    hook(node('IFRAME', 'https://player.vimeo.com/video/1'));
    hook(node('#comment', null));
    hook(node('P', null));
    return dirty;
  };
  createSanitizer({ purify: stub })('<p>x</p>');
  assert.deepEqual(removed, ['IFRAME:https://evil.example/x']);
});

// ── DOMPurify 주입 경로: 실제 인스턴스 (해석 가능할 때만) ──

defineSharedCases('DOMPurify', (config = {}) => createSanitizer({ ...config, purify: realPurify }), SKIP_REAL, {
  removedTags: DOMPURIFY_REMOVED_TAGS,
});

test('[CJS·DOMPurify] purify 미지정은 동적 로딩, purify: null 은 정규식 경로 강제', { skip: SKIP_REAL }, () => {
  const cjs = require('../../dist/utils/index.cjs');
  const input = '<p>a</p><foo-bar>b</foo-bar>';
  // CJS dist 는 require 가 동작하므로 미지정 시 DOMPurify 를 불러와 알 수 없는 태그를 제거한다.
  assert.equal(cjs.createSanitizer()(input), '<p>a</p>b');
  // null 은 설치 여부와 무관하게 정규식 경로(알 수 없는 태그 유지)를 쓴다.
  assert.equal(cjs.createSanitizer({ purify: null })(input), input);
});

// ── 폴백 경고 (프로세스당 1회이므로 파일 마지막에 둔다) ──

test('[ESM] purify 미지정 시 동적 로딩 실패 → 기존처럼 폴백 경고 정확히 1회', () => {
  assert.deepEqual(fallbackWarnings(), [], '앞선 purify 지정 호출들은 경고를 내지 않음');
  const s = createSanitizer();
  s('<b>1</b>');
  s('<b>2</b>');
  createSanitizer()('<b>3</b>');
  assert.equal(fallbackWarnings().length, 1);
  assert.match(fallbackWarnings()[0], /정규식 기반 폴백/);
});

// ── 공개 타입 export ──

test('DOMPurifyLike 타입과 purify 설정이 공개 타입 선언에 포함된다', () => {
  for (const file of ['../../dist/utils/index.d.ts', '../../dist/index.d.ts']) {
    const dts = readFileSync(new URL(file, import.meta.url), 'utf8');
    assert.match(dts, /\bDOMPurifyLike\b/, `${file} 에 DOMPurifyLike export`);
  }
  const chunkDts = readFileSync(new URL('../../dist/utils/index.d.ts', import.meta.url), 'utf8');
  assert.match(chunkDts, /purify\?:\s*DOMPurifyLike\s*\|\s*null/, 'SanitizerConfig.purify 선언');
});
