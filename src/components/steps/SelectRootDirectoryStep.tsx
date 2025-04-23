import {useState} from 'react';
import { useInputData } from '@/lib/InputDataContext';
import { Button } from '@/components/ui/button';
import StepPanel from '@/components/steps/StepPanel';
import {InfoIcon} from "lucide-react";
import DirectoryPicker from "@/lib/DirectoryPicker";

export default function SelectRootDirectoryStep({ openByDefault = true, onSuccess }: { openByDefault?: boolean, onSuccess?: () => void }) {
    const { setParserContext, parserContext } = useInputData();
    const [showHelp, setShowHelp] = useState(false);

    const done = !!parserContext.rootDir

    return (
        <StepPanel
            title={done? `Root directory: ${parserContext.rootDir?.name}` : 'Select root directory'}
            status={done? 'complete' : 'default'}
            openByDefault={openByDefault}
        >
            <div className="text-sm text-gray-600 space-y-1">
                <div className={"flex items-center"}>
                    <DirectoryPicker onSelect={(dir) => {
                        setParserContext({...parserContext, rootDir: dir})
                        onSuccess?.();
                    }}/>
                    <Button variant="ghost" className="ms-4 cursor-pointer text-blue-500"
                            onClick={() => setShowHelp(!showHelp)}>
                        <InfoIcon className={"w-4 h-4"}/> {showHelp ? 'Hide' : 'Show'} help
                    </Button>
                </div>
                {
                    showHelp && (
                        <div className="text-sm text-gray-500 mt-2">
                            <p>The tool will upload files to FigShare as well as the metadata.</p>
                            <p>
                                Web browsers only allow very tightly controlled access to the files on your computer.
                                As a result, all files referenced in your Excel spreadsheet must appear inside
                                a &#39;root&#39; directory on your computer.
                                Selecting the root directory using this button will allow the tool to see all files
                                within that directory.
                                When files are checked, their paths will be checked <em>relative to the root
                                directory</em>.
                            </p>
                        </div>
                    )
                }
            </div>
        </StepPanel>
    );
}
