const ALIASES = { '강원도':'강원특별자치도', '전북특별자치도':'전라북도' };
let libs     = [];    // 전체 도서관 배열 (library.json 데이터)
let byRegion = {};    // { '서울특별시': [...], '경기도': [...], ... } 형태로 분류된 데이터
let selName  = null;  // 현재 선택된 지역명
let selPath  = null;  // 현재 선택된 SVG path 요소
const $ = id => document.getElementById(id); // document.getElementById()를 짧게 사용
const tip = $('tooltip');  // 툴팁 요소를 변수에 저장(매번 찾지 않아도 되도록)

// ── 1. 데이터 분류 ─────────────────────────────────────────────────
// SVG에서 수집한 지역명 배열(names)을 Key로 byRegion 객체를 초기화 한 뒤,
// 각 도서관을 해당 지역 배열에 추가한다.
function groupByRegion(names) {
    byRegion = {};

    // 먼저 모든 지역을 빈 배열로 초기화
    names.forEach(name => byRegion[name] = []);

    // 각 도서관을 시도명에 맞는 배열에 넣기
    libs.forEach(lib => {
        // ALIASES에 있으면 바뀐시도명 반환, 없으면 그대로 사용 (?? = null/undefined일 때 오른쪽 값 사용)
        const region = ALIASES[lib['시도명']] ?? lib['시도명'];
        if (byRegion[region]) byRegion[region].push(lib);
    });
}


// ── 2. 지도 이벤트 연결 ────────────────────────────────────────────
// SVG 안의 모든 지역 path를 찾아 마우스·클릭 이벤트를 붙인다.
function setupMap() {
    // id 속성이 있는 path만 선택 (바다·배경 등 제외)
    $('korea-map').querySelectorAll('path[id]').forEach(path => {

        // SVG path의 title 속성 = 지역명 (예: '서울특별시')
        const name = path.getAttribute('title');
        if (!name) return; // title 없는 path는 건너뜀

        // CSS에서 .region 스타일을 적용받을 수 있도록 클래스 추가
        path.classList.add('region');

        // 마우스가 지역 위에 올라오면 툴팁 표시
        path.addEventListener('mouseenter', e => {
            $('tooltip-name').textContent  = name;
            $('tooltip-count').textContent = `도서관 ${byRegion[name].length}개`;
            tip.style.display = 'block';
            tip.style.left = e.clientX + 14 + 'px'; // 커서 오른쪽 14px
            tip.style.top  = e.clientY - 42 + 'px'; // 커서 위쪽 42px
        });

        // 마우스가 움직이면 툴팁도 같이 이동
        path.addEventListener('mousemove', e => {
            tip.style.left = e.clientX + 14 + 'px';
            tip.style.top  = e.clientY - 42 + 'px';
        });

        // 마우스가 나가면 툴팁 숨김
        path.addEventListener('mouseleave', () => tip.style.display = 'none');

        // 클릭하면 사이드바에 통계 표시
        path.addEventListener('click', () => onRegionClick(path, name));
    });
}


// ── 3. 지역 클릭 처리 ─────────────────────────────────────────────
// 같은 지역을 다시 클릭하면 선택 해제, 다른 지역을 클릭하면 통계 표시
function onRegionClick(path, name) {

    // 이전에 선택된 지역의 active 클래스 제거 (?. = null이어도 오류 안 남)
    selPath?.classList.remove('active');

    // 같은 지역 재클릭 → 선택 해제
    if (selName === name) {
        selName = selPath = null;
        $('sidebar-body').style.display = 'none';
        $('sidebar-hint').style.display = 'flex';
        return;
    }

    // 새 지역 선택
    selName = name;
    selPath = path;
    path.classList.add('active'); // CSS .active 스타일 적용
    showSidebar(name);
}


// ── 4. 사이드바 통계 출력 ──────────────────────────────────────────
// 선택한 지역의 도서관 유형별 개수, 총 열람좌석수, 대출가능권수를 계산해 표시
function showSidebar(name) {
    const regionLibs = byRegion[name] || [];

    // 유형별 개수를 담을 객체, 좌석·대출 합계 변수
    const typeCount = {};
    let seats = 0, loan = 0;

    // 해당 지역 도서관을 하나씩 순회하며 집계
    regionLibs.forEach(lib => {
        const t = lib['도서관유형'] || '기타';

        // 처음 등장한 유형이면 0에서 시작, 아니면 기존 값에 1 추가
        typeCount[t] = (typeCount[t] || 0) + 1;

        seats += Number(lib['열람좌석수'])   || 0; // 숫자가 아니면 0으로 처리
        loan  += Number(lib['대출가능권수']) || 0;
    });

    // 지역명 출력
    $('sidebar-title').textContent = name;

    // 유형 목록을 HTML 문자열로 만들어 한 번에 삽입 (innerHTML)
    $('type-list').innerHTML = Object.entries(typeCount)
        .map(([t, c]) =>
            `<li class="type-row">
                <span class="type-name">${t}</span>
                <span class="type-count">${c}개</span>
            </li>`)
        .join('');

    // 통계 2줄 출력 (toLocaleString: 숫자에 천 단위 쉼표 추가)
    $('stat-list').innerHTML =
        `<div class="stat-item">
            <span class="stat-label">총 열람좌석수</span>
            <span class="stat-value">${seats.toLocaleString()}석</span>
        </div>` +
        `<div class="stat-item">
            <span class="stat-label">대출 가능 권수</span>
            <span class="stat-value">${loan.toLocaleString()}권</span>
        </div>`;

    // 안내 문구 숨기고 통계 영역 표시
    $('sidebar-body').style.display = 'block';
    $('sidebar-hint').style.display = 'none';
}


// ── 5. 초기화 ──────────────────────────────────────────────────────
// async/await: 파일을 불러오는 동안 기다렸다가 완료되면 다음 코드 실행
async function init() {

    // SVG 지도 파일과 도서관 JSON 데이터를 동시에 불러옴 (Promise.all = 둘 다 완료될 때까지 대기)
    const [svgText, libData] = await Promise.all([
        fetch('southKoreaHigh.svg').then(r => r.text()),  // SVG는 텍스트로 읽기
        fetch('library.json').then(r => r.json()),        // JSON은 객체로 파싱
    ]);

    // SVG 텍스트를 map-wrap 안에 삽입
    $('map-wrap').innerHTML = svgText;

    // 삽입된 SVG 요소를 찾아 설정
    const svg = $('map-wrap').querySelector('svg');

    // CSS와 JS에서 #korea-map으로 찾을 수 있게 id 부여
    svg.id = 'korea-map';

    // SVG 크기와 위치 조정 (viewBox: 원본 좌표계, preserveAspectRatio: 비율 유지 방식)
    // viewBox="0 150 622 650" → 원본 SVG에서 (0,150)부터 가로 622, 세로 650 영역을 보여줌
    svg.setAttribute('viewBox', '0 150 622 650');

    // xMid → 가로 중앙 정렬,  YMid → 세로 중앙 정렬
    // 비율 유지하며 가운데 정렬
    // (1) 옵션1 : meet → SVG 전체가 보이도록 축소, 
    // (2) 옵션2 : slice → 영역을 가득 채우도록 확대 (일부 잘릴 수 있음)
    // (3) 옵션3 : none → 비율 무시하고 영역에 딱 맞게 늘이기
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    
    // 부모 크기에 맞게 SVG 꽉 채움 (CSS로도 설정)
    svg.style.cssText = 'width:100%;height:100%;display:block';

    // SVG 파일 안에 내장된 스타일·이벤트를 제거 (우리 CSS/JS와 충돌 방지)
    svg.querySelectorAll('style').forEach(s => s.remove());
    svg.querySelectorAll('[onclick]').forEach(el => el.removeAttribute('onclick'));

    // SVG 각 path의 title 속성에서 지역명을 자동으로 수집
    // (REGION_MAP을 직접 작성하지 않아도 됨)
    const regionNames = [...svg.querySelectorAll('path[title]')]
        .map(p => p.getAttribute('title'));

    libs = libData;
    groupByRegion(regionNames); // 도서관 데이터를 지역별로 분류
    setupMap();                 // 지도 이벤트 연결
}

init(); // 페이지가 로드되면 바로 실행