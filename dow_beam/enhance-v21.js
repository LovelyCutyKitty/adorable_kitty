/* 이전 납기 입력칸은 숨기고 현재 제품별 납기 입력칸 하나만 사용 */
const dueCleanup21=document.createElement('style');
dueCleanup21.textContent='#lineDueLabel18,#lineDueLabel19{display:none!important}';
document.head.append(dueCleanup21);
