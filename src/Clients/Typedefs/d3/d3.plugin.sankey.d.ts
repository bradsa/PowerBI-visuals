interface SanKeyNode {
    name: string;
    sourceLinks?: any[];
    targetLinks?: any[];
}

interface SanKeyLink {
    source: number;
    target: number;
    name: string;
    value: number;
}

interface D3SanKey {
    (): D3SanKey;

    scaleFactor(): number;
    scaleFactor(factor: number): D3SanKey;

    cycleEnabled(): boolean;
    cycleEnabled(enabled: boolean): D3SanKey;

    nodeWidth(): number;
    nodeWidth(width: number): D3SanKey;

    nodePadding(): number;
    nodePadding(enabled: number): D3SanKey;

    // cycle related attributes

    cycleLaneNarrowWidth(): number;
    cycleLaneNarrowWidth(enabled: number): D3SanKey;

    cycleSmallWidthBuffer(): number;
    cycleSmallWidthBuffer(enabled: number): D3SanKey;

    cycleLaneDistFromFwdPaths(): number;
    cycleLaneDistFromFwdPaths(enabled: number): D3SanKey;

    cycleDistFromNode(): number;
    cycleDistFromNode(enabled: number): D3SanKey;

    cycleControlPointDist(): number;
    cycleControlPointDist(enabled: number): D3SanKey;

    nodes(): any[];
    nodes(enabled: SanKeyNode[]): D3SanKey;

    links(): any[];
    links(enabled: SanKeyLink[]): D3SanKey;

    size(): number[];
    size(enabled: number[]): D3SanKey;

    layout(iterations: number): D3SanKey;

    relayout(): D3SanKey;

    link(): any;
}

declare module D3 {
    export interface Base {
        sankey: D3SanKey;
    }
}