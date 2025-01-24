import {atom} from "jotai/";
import {FigShareClient} from "@/lib/figshare";
import {FIGSHARE_API_BASE as configFigshareApiBase} from "@/lib/config";

export const figshareToken = atom<string|null>(null);

export const figshareApiBase = atom<string>(configFigshareApiBase);

export const FigshareClient = atom((get) => {
    const token = get(figshareToken);
    const apiBase = get(figshareApiBase);

    if (!token || !apiBase) {
        return null;
    }

    return new FigShareClient(token, apiBase);
});