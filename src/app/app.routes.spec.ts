import { authGuard } from './core/auth/auth.guard';
import { routes } from './app.routes';

describe('application routes', () => {
  it('protects the private layout and its home route', () => {
    const privateRoute = routes.find((route) => route.path === '');
    expect(privateRoute?.canActivate).toContain(authGuard);
    expect(privateRoute?.children?.some((route) => route.path === 'inicio')).toBe(true);
  });

  it('keeps the merged 403, 404 and 500 destinations', () => {
    const privateChildren = routes.find((route) => route.path === '')?.children ?? [];
    expect(privateChildren.some((route) => route.path === 'acceso-denegado')).toBe(true);
    expect(privateChildren.some((route) => route.path === 'error-servidor')).toBe(true);
    expect(routes.some((route) => route.path === '**')).toBe(true);
  });
});
