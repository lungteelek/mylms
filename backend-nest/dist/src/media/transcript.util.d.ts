export declare function buildTranscriptSegments(source: string): {
    startMs: number;
    endMs: number;
    text: string;
    segmentIndex: number;
}[];
export declare function deriveTranscriptSource(input: {
    title: string;
    plainText?: string | null;
    htmlContent?: string | null;
    overrideText?: string;
}): string;
