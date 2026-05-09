# 11. 스타일링 & CSS 변수 오버라이드 가이드

`@withwiz/blog-core`의 CSS는 **구조(structure)** 와 **합리적 기본값(defaults)** 만 제공한다.
색상, 폰트, 크기와 같은 디자인 결정은 모두 CSS 커스텀 프로퍼티(`--blog-*`)로 노출되어 있어,
호스트 프로젝트의 `globals.css`에서 손쉽게 오버라이드할 수 있다.

## 사용 방법

### 1. CSS 임포트

호스트 프로젝트(예: `app/layout.tsx` 또는 `globals.css`)에서 패키지의 CSS를 임포트한다.

```ts
import '@withwiz/blog-core/styles/blog-public.css';
import '@withwiz/blog-core/styles/blog-block-editor.css';
```

### 2. 변수 오버라이드

호스트의 `globals.css`(또는 layout 컴포넌트)에서 동일한 `--blog-*` 변수를
재선언하면 된다. CSS 캐스케이드 규칙에 따라 호스트 정의가 우선한다.

```css
/* app/globals.css */
:root {
  --blog-color-accent: #ff4081;            /* 핫 핑크 악센트 */
  --blog-color-card-bg: #fffefa;
  --blog-font-heading: "Playfair Display", serif;
  --blog-cat-onstage: #ff6b6b;
}
```

---

## 사용 가능한 변수 목록

### `blog-public.css` — 공개 페이지(목록/상세) 스타일

#### 기본 색상

| 변수 | 기본값 | 용도 |
|---|---|---|
| `--blog-color-bg` | `#ffffff` | 페이지 배경 |
| `--blog-color-text` | `#121212` | 본문 기본 텍스트 |
| `--blog-color-text-dim` | `#666` | 흐린 텍스트(메타, 설명) |
| `--blog-color-text-muted` | `#888` | 탭 비활성 텍스트 |
| `--blog-color-text-soft` | `#999` | 조회수 등 보조 텍스트 |
| `--blog-color-text-strong` | `#333` | 호버 강조 텍스트 |
| `--blog-color-text-heading` | `#111` | 리치 콘텐츠 h2 |
| `--blog-color-text-subheading` | `#222` | 리치 콘텐츠 h3 |
| `--blog-color-text-quote` | `#555` | 인용 본문 |
| `--blog-color-accent` | `#D4AF37` | 샴페인 골드 악센트 |
| `--blog-color-card-bg` | `#f4f1ef` | 카드 텍스트 영역 배경 |
| `--blog-color-image-placeholder` | `#f5f5f5` | 이미지 자리표시 배경 |
| `--blog-color-border` | `#eee` | 툴바 하단 보더 |
| `--blog-color-border-soft` | `#ddd` | 카테고리 탭 기본 보더 |
| `--blog-color-border-hover` | `#999` | 카테고리 탭 호버 보더 |
| `--blog-color-inverse` | `#fff` | 역색(버튼 위 글자 등) |
| `--blog-color-inverse-bg` | `#000` | 히어로 슬라이더 배경 |
| `--blog-color-tab-active-bg` | `#121212` | 활성 탭 기본 배경 |
| `--blog-color-pagination-btn` | `#000` | 페이지네이션 버튼 색 |

#### 폰트

| 변수 | 기본값 | 용도 |
|---|---|---|
| `--blog-font-heading` | `var(--font-instrument-serif)` | 영문 헤딩 |
| `--blog-font-body` | `var(--font-inter)` | 본문 산세리프 |
| `--blog-font-sans` | `var(--font-sora)` | UI 산세리프 |
| `--blog-font-korean` | `var(--font-noto-serif-kr)` | 한글 세리프 |

#### 컨테이너/레이아웃

| 변수 | 기본값 | 용도 |
|---|---|---|
| `--blog-container-max` | `1400px` | 최대 컨테이너 폭 |
| `--blog-container-pad-x` | `40px` | 좌우 패딩(데스크톱) |
| `--blog-container-pad-x-sm` | `20px` | 좌우 패딩(모바일) |
| `--blog-detail-max` | `800px` | 상세 페이지 최대 폭 |

#### 히어로 슬라이더(상단 배너)

| 변수 | 기본값 | 용도 |
|---|---|---|
| `--blog-hero-slider-height` | `60vh` | 데스크톱 높이 |
| `--blog-hero-slider-min` | `500px` | 데스크톱 최소 높이 |
| `--blog-hero-slider-height-md` | `50vh` / `--blog-hero-slider-min-md` `400px` | 태블릿 |
| `--blog-hero-slider-height-sm` | `40vh` / `--blog-hero-slider-min-sm` `320px` | 모바일 |

#### 페이지 히어로(서브페이지 상단)

| 변수 | 기본값 | 용도 |
|---|---|---|
| `--blog-hero-bg` | `#0A0A0A` | 페이지 히어로 배경 |
| `--blog-hero-height` | `320px` | 데스크톱 높이 |
| `--blog-hero-height-md` | `280px` | 태블릿 높이 |
| `--blog-hero-height-sm` | `220px` | 모바일 높이 |
| `--blog-hero-color` | `40, 100, 100` | RGB 글로우 컬러(페이지별 재정의) |

#### 아티클 색상 팔레트

| 변수 | 기본값 |
|---|---|
| `--blog-article-bg` | `#faf9f7` |
| `--blog-article-bg-warm` | `#f5f3ef` |
| `--blog-article-gold` | `#8a8070` |
| `--blog-article-th` | `#1a1510` |
| `--blog-article-tb` | `#2a2520` |
| `--blog-article-tm` | `#4a4540` |
| `--blog-article-td` | `#6a6560` |
| `--blog-article-divider` | `rgba(138,128,112,0.15)` |

#### 카테고리 색상

| 변수 | 기본값 |
|---|---|
| `--blog-cat-onstage` | `#8a8070` |
| `--blog-cat-backstage` | `#97746c` |
| `--blog-cat-press` | `#5b6d8a` |
| `--blog-cat-notice` | `#5f8a7a` |
| `--blog-cat-main` | `#8a8070` |
| `--blog-cat-bg-tint` | `#f6f5f2` |
| `--blog-cat-bg-quote` | `#f9f8f6` |
| `--blog-cat-border` | `#ddd9d3` |
| `--blog-cat-divider` | `#8a8070` |

#### 첨부파일/기타

| 변수 | 기본값 |
|---|---|
| `--blog-attach-bg` | `rgba(138,128,112,0.04)` |
| `--blog-attach-bg-hover` | `rgba(138,128,112,0.08)` |
| `--blog-attach-border` | `rgba(138,128,112,0.12)` |
| `--blog-nbe-video-bg` | `#1a1917` |
| `--blog-nbe-card-bg` | `#fff` |

---

### `blog-block-editor.css` — 어드민 블록 에디터 스타일

#### 에디터 크롬

| 변수 | 기본값 |
|---|---|
| `--blog-nbe-ch-bg` | `#ffffff` |
| `--blog-nbe-ch-s` | `#f7f6f4` |
| `--blog-nbe-ch-s2` | `#f0efec` |
| `--blog-nbe-ch-b` | `rgba(0,0,0,0.10)` |
| `--blog-nbe-ch-bh` | `rgba(0,0,0,0.20)` |
| `--blog-nbe-ch-t` | `#2a2520` |
| `--blog-nbe-ch-td` | `#6a6560` |
| `--blog-nbe-ch-tb` | `#1a1510` |
| `--blog-nbe-ch-a` | `#8a8070` |
| `--blog-nbe-ch-al` | `#736b60` |

#### 프리뷰(아티클)

`--blog-nbe-bg`, `--blog-nbe-bgw`, `--blog-nbe-gold`, `--blog-nbe-th`,
`--blog-nbe-tb`, `--blog-nbe-tm`, `--blog-nbe-td`, `--blog-nbe-dv`

#### 카테고리

`--blog-nbe-cat-onstage`, `--blog-nbe-cat-backstage`,
`--blog-nbe-cat-press`, `--blog-nbe-cat-notice`

#### 폰트

| 변수 | 기본값 |
|---|---|
| `--blog-nbe-font-body` | `'Noto Sans KR', sans-serif` |
| `--blog-nbe-font-korean` | `'Noto Serif KR', serif` |
| `--blog-nbe-font-display` | `'Cormorant Garamond', serif` |
| `--blog-nbe-font-mono` | `'SF Mono', 'Fira Code', 'Consolas', monospace` |
| `--blog-nbe-font-sans` | `'Inter', sans-serif` |

#### 기타 색상/사이즈

`--blog-nbe-color-inverse`, `--blog-nbe-color-input-bg`,
`--blog-nbe-color-card-bg`, `--blog-nbe-color-tooltip-bg`,
`--blog-nbe-color-placeholder`, `--blog-nbe-color-toggle-off`,
`--blog-nbe-color-danger`, `--blog-nbe-color-success`,
`--blog-nbe-color-error`, `--blog-nbe-color-warn`,
`--blog-nbe-color-empty-text`, `--blog-nbe-color-pv-pane-bg`,
`--blog-nbe-color-pv-label`, `--blog-nbe-color-fi-empty-bg`,
`--blog-nbe-color-fi-empty-text`, `--blog-nbe-color-video-bg`,
`--blog-nbe-layout-ed-w` (`480px`), `--blog-nbe-topbar-h` (`48px`)

---

## 예시 1: 악센트 컬러 변경

```css
:root {
  /* 기본 골드 → 코랄 레드 */
  --blog-color-accent: #ff5e5b;
  --blog-cat-main: #ff5e5b;
  --blog-cat-onstage: #ff5e5b;
}
```

## 예시 2: 다크 모드 추가

```css
@media (prefers-color-scheme: dark) {
  :root {
    --blog-color-bg: #0a0a0a;
    --blog-color-text: #fefefe;
    --blog-color-text-dim: #aaa;
    --blog-color-text-heading: #fff;
    --blog-color-text-subheading: #eee;
    --blog-color-card-bg: #1a1a1a;
    --blog-color-border: #2a2a2a;
    --blog-color-image-placeholder: #1a1a1a;
    --blog-article-bg: #121212;
    --blog-article-bg-warm: #1a1a1a;
    --blog-article-th: #fefefe;
    --blog-article-tb: #ddd;
    --blog-article-tm: #aaa;
    --blog-article-td: #888;
  }
}
```

## 예시 3: 페이지별 히어로 시그니처 컬러

`.blog-hero` 요소의 글로우 색상은 `--blog-hero-color`(RGB 값)로 제어된다.
페이지별 클래스를 지정하거나, 인라인 스타일로 재정의할 수 있다.

```html
<div class="blog-hero" style="--blog-hero-color: 200, 60, 80;">
  <!-- 와인 레드 글로우 -->
</div>
```

또는 패키지 기본 페이지 클래스를 사용한다:
`.blog-hero--artists` (로즈), `.blog-hero--performances` (바이올렛),
`.blog-hero--repertoire` (네이비), `.blog-hero--news` (틸).

## 예시 4: 폰트 교체

```css
:root {
  --blog-font-heading: "Bodoni Moda", serif;
  --blog-font-body: "Pretendard", sans-serif;
  --blog-font-korean: "Pretendard", sans-serif;
  --blog-nbe-font-korean: "Pretendard", sans-serif;
}
```

---

## 주의 사항

- **컴포넌트 클래스명은 변경하지 말 것.** `.blog-hero`, `.blog-card` 등은 컴포넌트와 결합되어 있다.
- 카테고리 본문 색상(`--cat-main` 등)은 카테고리별로 인라인 스타일로 주입되도록 설계되어 있어,
  대부분의 경우 컴포넌트 props에 `categoryColor` 등으로 넘기는 것을 권장한다.
- `rgba(...)` 형태의 투명도(예: `rgba(0,0,0,0.10)`)는 그대로 두었다.
  투명도 자체는 디자인 토큰이라기보다 표현 수단이기 때문이다.
