self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || './';
  event.waitUntil((async () => {
    const windows = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (windows.length) {
      windows[0].postMessage({ type:'dow-notice', id:event.notification.data?.noticeId });
      return windows[0].focus();
    }
    return clients.openWindow(url);
  })());
});
