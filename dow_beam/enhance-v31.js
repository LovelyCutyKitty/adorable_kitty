/* 이전 납기 달력 구현은 통합 달력(v33)으로 교체됨. 구 버전에서도 중복 표시를 막는다. */
const legacyCalendarStyle31=document.createElement('style');
legacyCalendarStyle31.textContent='.due-cal31,.due-detail31{display:none!important}';
document.head.append(legacyCalendarStyle31);
function dueRows31(){return []}
function calendarHtml31(){return ''}
