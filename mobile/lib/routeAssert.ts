export function getNavigationRouteNames(navigation: any): string[] {
  const out: string[] = [];

  let nav: any = navigation;
  while (nav) {
    try {
      const st = nav.getState?.();
      const names = Array.isArray(st?.routeNames) ? (st.routeNames as string[]) : [];
      for (const n of names) out.push(String(n));
    } catch {
    }

    try {
      nav = nav.getParent?.();
    } catch {
      nav = null;
    }
  }

  return Array.from(new Set(out));
}

export function assertRouteExists(navigation: any, routeName: string) {
  if (!__DEV__) return;
  const names = getNavigationRouteNames(navigation);
  if (!names.includes(routeName)) {
    throw new Error(`Enabled menu item targets missing route: ${routeName}`);
  }
}
