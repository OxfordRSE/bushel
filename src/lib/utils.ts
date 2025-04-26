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
export async function checkFigshareResponse(res: Response) {
    if (res.ok) {
        // FigShare sometimes sends 200 OK with an empty body, so use text->JSON rather than just res.json()
        const text = await res.text();

        if (!text.trim()) {
            return null;
        }

        try {
            return JSON.parse(text);
        } catch (err) {
            throw new Error(`Invalid JSON in response: ${(err instanceof Error) ? err.message : String(err)}`);
        }
    }

    let err: FigshareAPIError;
    try {
        const body = await res.json();
        if (body && typeof body === 'object') {
            err = new FigshareAPIError(res.status, res.statusText, body.message, body.code);
        } else {
            err = new FigshareAPIError(res.status, res.statusText, String(body));
        }
    } catch {
        try {
            const text = await res.text();
            err = new FigshareAPIError(res.status, res.statusText, text);
        } catch {
            err = new FigshareAPIError(res.status, res.statusText, 'Unknown error');
        }
    }

    throw err;
}

export const toFigshareAPIError = (err: unknown): FigshareAPIError => {
    if (err instanceof FigshareAPIError) return err;
    if (err instanceof Error) return new FigshareAPIError(0, 'Error', err.message);
    return new FigshareAPIError(-1, '', String(err));
}

export const cleanString = (value: string): string => {
    return value
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/_+/g, '_')
        .replace(/-+/g, '-');
}

export const stringToFuzzyRegex = (value: string): RegExp => {
    return new RegExp(
        `^${value.replace(/[_ -]/g, '[_ -]').replace(/\.$/, '')}\.?$`,
        'i'
    );
}

export const fuzzyCoerce = (value: string, target_values: string[], clean_value = true, compiled_regexs?: RegExp[]): string => {
    if (clean_value) {
        value = cleanString(value);
    }
    if (compiled_regexs && (compiled_regexs.length !== target_values.length)) {
        throw new Error('Compiled regexs and target values must be the same length');
    }
    const reg_exps = compiled_regexs ?? target_values.map(stringToFuzzyRegex);
    const match = reg_exps.findIndex((re) => re.test(value));
    if (match !== -1) {
        return target_values[match] as string;
    }
    return value;
}

export const toFigshareColumnName = (name: string, allowed_names: string[] = []): string => {
    if (!name) {
        throw new Error('Empty name');
    }
    // Slugify
    const clean = cleanString(name).replace(/^licence$/i, 'license')
    // Special cases:
    if (clean === '' || clean === '_') {
        throw new Error(`${name} regularises to an blank value`);
    }
    return fuzzyCoerce(clean, allowed_names, false)
}