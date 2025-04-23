import {DataRowParser, DataRowStatus} from "@/lib/DataRowParser";
import {TableCell, TableRow} from "@/components/ui/table";
import {clsx} from "clsx";
import {useInputData} from "@/lib/InputDataContext";
import {useEffect, useMemo, useState} from "react";
import {FigshareArticle} from "@/lib/types/figshare-api";
import {useAuth} from "@/lib/AuthContext";

type UploadRowProps = {
    runQueries: boolean;
    onError: (e: string) => void;
    onSuccess: () => void;
    row: DataRowStatus

}

/* A table row that handles the FigShare upload for a single spreadsheet row.
* It will handle controls from the parent component and display the upload status.
*
* The FigShare queries made will create the Article, then (if necessary) perform uploading for
* each referenced file using FigShare's multistage upload file procedure.
* */
export default function UploadRow({
                                      runQueries,
                                      onError,
                                      onSuccess,
                                      row
                                  }: UploadRowProps) {
    const [error, _setError] = useState<string>();
    const [fileError, _setFileError] = useState<string>();
    const [complete, _setComplete] = useState<boolean>(false);
    const [article, setArticle] = useState<FigshareArticle>();
    const {getParser} = useInputData();
    const parser = useMemo(() => getParser(row.id), [row, getParser]);

    const setError = (e: string) => {
        _setError(e);
        onError(e);
    }

    const setFileError = (e: string) => {
        _setFileError(e);
        onError(e);
    }

    const setComplete = () => {
        _setComplete(true);
        onSuccess();
    }

    return (
        <TableRow key={row.id} className={clsx(
            "border-b hover:bg-gray-50",
            {
                'bg-red-50': !!error,
                'bg-green-50': complete && !error,
                'bg-blue-50': runQueries && !complete && !error,
            }
        )}>
            <TableCell>{row.excelRowNumber}</TableCell>
            <TableCell>{row.title}</TableCell>
            <TableCell>{
                error ?? <CreateArticleCell
                    parser={parser}
                    enabled={runQueries}
                    onError={setError}
                    onSuccess={setArticle}
                />
            }</TableCell>
            <TableCell>{
                fileError ?? <UploadFilesCell
                    parser={parser}
                    article={article}
                    onError={setFileError}
                    onSuccess={setComplete}
                />
            }</TableCell>
        </TableRow>
    );
}

function CreateArticleCell({
                               onError,
                               onSuccess,
                               parser,
                               enabled
                           }: {
    onError: (e: string) => void;
    onSuccess: (data: FigshareArticle) => void;
    parser: DataRowParser;
    enabled: boolean;
}) {
    const {fsFetch} = useAuth();
    const [article, setArticle] = useState<FigshareArticle>();
    const [running, setRunning] = useState<boolean>(false);

    useEffect(() => {
        if (enabled && !running) {
            setRunning(true);
            fsFetch<FigshareArticle>("https://api.figshare.com/v2/account/articles", {
                method: "POST",
                body: JSON.stringify({
                    ...parser.data
                })
            })
                .then((data) => {
                    setArticle(data);
                    onSuccess(data);
                })
                .catch((e) => {
                    setRunning(false);
                    onError(String(e));
                })
        }
    }, [enabled]);

    if (article) {
        return article.url
    }
    if (running) {
        return "In progress"
    }
    return ""
}

function UploadFilesCell({
                             parser,
                             onError,
                             onSuccess,
                             article
                         }: {
    parser: DataRowParser;
    onError: (e: string) => void;
    onSuccess: () => void;
    article?: FigshareArticle;
}) {
    const {fsFetch} = useAuth();
    const [running, setRunning] = useState<boolean>(false);
    const [file, setFile] = useState<number>();
    const [partCount, setPartCount] = useState<number>();
    const [part, setPart] = useState<number>();

    const fileCount = parser.data?.files?.length;

    useEffect(() => {
        if (!!article && !running && fileCount) {
            setRunning(true);
            setFile(0);
        }
    }, [article, fileCount])

    useEffect(() => {
        if (file === undefined || fileCount === undefined)
            return;
        if (file > fileCount!) {
            setRunning(false);
            onSuccess();
            return;
        }
        const myPromise = new Promise<number>((resolve) => {
            setTimeout(() => {
                resolve(Math.floor(Math.random() * 10));
            }, Math.random() * 1500);
        });
        myPromise
            .then((data) => {
                setPartCount(data as number);
                setPart(0);
            })
            .catch((e: unknown) => onError(String(e)))
    }, [file])

    useEffect(() => {
        if (part === undefined || partCount === undefined)
            return;
        if (part >= partCount) {
            setFile((file ?? 0) + 1);
            return;
        }
        const myPromise = new Promise<void>((resolve) => {
            setTimeout(() => {
                resolve();
            }, Math.random() * 1500);
        });
        myPromise
            .then(() => {
                setPart(part + 1)
            })
            .catch((e: unknown) => onError(String(e)))
    }, [part])

    return file !== undefined && fileCount !== undefined && file >= fileCount
        ? `Uploaded ${fileCount} files`
        : partCount !== undefined
            ? `Uploading file ${file} of ${fileCount} (part ${part} of ${partCount})`
            : ""
}