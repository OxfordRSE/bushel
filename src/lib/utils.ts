import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
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
