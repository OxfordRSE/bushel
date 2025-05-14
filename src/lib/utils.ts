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

export const cleanString = (value: string): string => {
    return value
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/_+/g, '_')
        .replace(/-+/g, '-');
}

export const stringToFuzzyRegex = (value: string): RegExp => {
    const escape = (input: string) => input.replace(/[\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");

    const clean = escape(value).replace(/[_ -]/g, '[_ -]').replace(/\\?\.$/, '');
    return new RegExp(
        `^${clean}\\.?$`,
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
