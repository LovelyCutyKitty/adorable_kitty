(() => {
  // PWA가 재실행될 때 현재 history.state만 복원되고 이전 가드 엔트리가
  // 사라지는 Chrome/Android 케이스를 대비해 매 로드마다 홈 가드를 새로 만든다.
  function installFreshHomeGuard() {
    const current = history.state || {};
    const route = current.malddaRoute || { kind: 'home' };

    const guard = {
      ...current,
      __malddaUx: true,
      __malddaHomeExitGuard: true,
      __malddaHomeLive: false,
      malddaDepth: 0,
      malddaRoute: route
    };
    const live = {
      ...guard,
      __malddaHomeExitGuard: false,
      __malddaHomeLive: true
    };

    // 현재 엔트리를 가드로 바꾸고 그 위에 실제 홈 엔트리를 하나 추가한다.
    // 따라서 Android 뒤로가기 1회는 가드(popstate)로 들어오고,
    // 기존 final-ux.js가 안내를 띄운 뒤 다시 홈을 유지한다.
    history.replaceState(guard, '');
    history.pushState(live, '');
  }

  // final-ux.js가 자체 초기화를 끝낸 다음 한 번 더 확실히 심는다.
  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', () => setTimeout(installFreshHomeGuard, 0), { once: true });
  } else {
    setTimeout(installFreshHomeGuard, 0);
  }
})();
