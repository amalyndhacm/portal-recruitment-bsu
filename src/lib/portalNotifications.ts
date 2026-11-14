export type PortalNotificationAudience = 'candidate' | 'recruitment' | 'all';

export type PortalNotificationDetail = {
  title: string;
  description: string;
  audience: PortalNotificationAudience;
};

export function notifyPortal(
  title: string,
  description: string,
  audience: PortalNotificationAudience = 'recruitment',
) {
  window.dispatchEvent(new CustomEvent<PortalNotificationDetail>('portal:notify', {
    detail: { title, description, audience },
  }));
}

export function notifyPortalOnce(
  key: string,
  title: string,
  description: string,
  audience: PortalNotificationAudience = 'recruitment',
) {
  const storageKey = `portal-notification:${audience}:${key}`;
  if (window.localStorage.getItem(storageKey)) return;
  window.localStorage.setItem(storageKey, new Date().toISOString());
  notifyPortal(title, description, audience);
}
