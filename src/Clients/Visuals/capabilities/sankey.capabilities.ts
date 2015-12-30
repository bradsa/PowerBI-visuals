/*
 *  Power BI Visualizations
 *
 *  Copyright (c) Microsoft Corporation
 *  All rights reserved. 
 *  MIT License
 *
 *  Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the ""Software""), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 *   
 *  The above copyright notice and this permission notice shall be included in 
 *  all copies or substantial portions of the Software.
 *   
 *  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR 
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE 
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 *  THE SOFTWARE.
 */

/// <reference path="../_references.ts"/>

module powerbi.visuals {
    //public static capabilities: VisualCapabilities = {
    export const sankeyCapabilities: VisualCapabilities = {
        dataRoles: [
            {
                name: 'Source',
                kind: VisualDataRoleKind.Grouping,
                displayName: 'Source',// TODO: data.createDisplayNameGetter('Role_DisplayName_Source'),
                description: 'Source Node Names' // TODO: data.createDisplayNameGetter('Role_DisplayName_SourceDescription'),
            },
            {
                name: 'Target',
                kind: VisualDataRoleKind.Grouping,
                displayName: 'Target', // TODO data.createDisplayNameGetter('Role_DisplayName_Target'),
                description: 'Target Node Names' // data.createDisplayNameGetter('Role_DisplayName_TargetDescription'),
            },
            {
                name: 'Value',
                kind: VisualDataRoleKind.Measure,
                displayName: data.createDisplayNameGetter('Role_DisplayName_Values'),
                description: data.createDisplayNameGetter('Role_DisplayName_ValuesDescription'),
                requiredTypes: [{ numeric: true }],
            },

        ],
        objects: {
            general: {
                displayName: data.createDisplayNameGetter("Visual_General"),
                properties: {
                    formatString: { type: { formatting: { formatString: true } } },
                }
            },
            linkLabels: {
                displayName: "Link Labels",
                properties: {
                    showNames: {
                        type: { bool: true },
                        displayName: 'Names',
                    },
                    showValues: {
                        type: { bool: true },
                        displayName: 'Values',
                    },
                }
            },
            nodeLabels: {
                displayName: "Node Labels",
                properties: {
                    showNodeLabels: {
                        type: { bool: true },
                        displayName: 'Labels',
                    },
                }
            },
        },
        dataViewMappings: [{
            conditions: [
                {
                    "Source": { min: 0, max: 1 },
                    "Target": { min: 0, max: 1 },
                    "Value": { min: 0, max: 1 }
                }],
            categorical: {
                categories: {
                    for: { in: 'Source' },
                    dataReductionAlgorithm: { top: {} }
                },
                values: {
                    select: [
                        { bind: { to: 'Target' } },
                        { bind: { to: 'Value' } },
                    ]
                },
            }
        }],
        suppressDefaultTitle: true,
    };
}