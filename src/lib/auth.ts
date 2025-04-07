import {redirectToFigShareAuth} from "@/lib/oauth";
import {FigshareUser} from "@/lib/types/figshare-api";

const isDev = process.env.NODE_ENV === 'development';

type LoginResponse = { token: string, user: FigshareUser };

export async function loginWithFigShare(): Promise<LoginResponse|never> {
  if (isDev) {
    const fail = localStorage.getItem('mockFail') === 'true';
    if (fail) {
      return Promise.reject({ error: 'Mock login failed' });
    }
    // Other dev mocks handled directly in MWS handlers
  }

  redirectToFigShareAuth();
  return new Promise(() => {}); // Never resolves — user is redirected;
}
