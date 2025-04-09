import {type ClassValue, clsx} from "clsx"
import {twMerge} from "tailwind-merge"
import {NextRequest} from "next/server";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getOrigin(req: NextRequest): string {
  const proto = req.headers.get('x-forwarded-proto') ?? 'https';
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? 'localhost:3000';
  return `${proto}://${host}`;
}

export function absoluteUrl(req: NextRequest, path: string): string {
  return `${getOrigin(req)}${path.startsWith('/') ? path : `/${path}`}`;
}

export class FigshareAPIError extends Error {
    status: number;
    statusText: string;
    details: string;
    code?: string;

    constructor(status: number, statusText: string, details: string, code?: string) {
        if (code)
            super(`FigShare API error (${status} ${statusText}):\n${details} (${code})`);
        else
            super(`FigShare API error (${status} ${statusText}):\n${details}`);
        this.name = 'FigshareAPIError';
        this.status = status;
        this.statusText = statusText;
        this.details = details;
        this.code = code;
    }
}

/* * Checks the response from the Figshare API and throws an error if the response is not ok.
    * @param res - The response object from the Figshare API.
    * @throws FigshareAPIError if the response is not ok.
    * @returns The original response if it is ok.
    *
    * This function is useful for handling errors from the Figshare API in a consistent way.
    * If the response is ok, it will return the original response (unconsumed).
    * If the response is not ok, it will throw a FigshareAPIError with the status code, status text, and details of the error (consuming the response body).
    *
    * Usage:
    * try {
    *   const res = await fetch('https://api.figshare.com/v2/some-endpoint');
    *   await checkFigshareResponse(res);
    *   // Process the response...
    * } catch (error) {
    *   if (error instanceof FigshareAPIError) {
    *     console.error(`Figshare API error: ${error.message}`);
    *   } else {
    *     console.error(`Unexpected error: ${error.message}`);
    *   }
    * }
* */
export async function checkFigshareResponse(res: Response): Promise<Response> {
  if (res.ok) return res;

  let err: FigshareAPIError;
  try {
    const body = await res.json();
    if (body && typeof body === 'object') {
        err = new FigshareAPIError(res.status, res.statusText, body.message, body.code);
    } else {
      err = new FigshareAPIError(res.status, res.statusText, String(body));
    }
  } catch {
    err = new FigshareAPIError(res.status, res.statusText, await res.text());
  }

  throw err;
}

export const toFigshareAPIError = (err: unknown): FigshareAPIError => {
    if (err instanceof FigshareAPIError) return err;
    if (err instanceof Error) return new FigshareAPIError(0, 'Error', err.message);
    return new FigshareAPIError(-1, '', String(err));
}
