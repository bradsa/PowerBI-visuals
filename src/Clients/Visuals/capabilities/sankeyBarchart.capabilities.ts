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
    export const sankeyBarchartCapabilities: VisualCapabilities = {
        dataRoles: [
            {
                name: 'Enter',
                kind: VisualDataRoleKind.Grouping,
                displayName: 'Enter',// TODO: data.createDisplayNameGetter('Role_DisplayName_Enter'),
                description: 'Enter State Names' // TODO: data.createDisplayNameGetter('Role_DisplayName_EnterDescription'),
            },
            {
                name: 'Exit',
                kind: VisualDataRoleKind.Grouping,
                displayName: 'Exit', // TODO data.createDisplayNameGetter('Role_DisplayName_Exit'),
                description: 'Exit State Names' // data.createDisplayNameGetter('Role_DisplayName_ExitDescription'),
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
        },
        dataViewMappings: [{
            conditions: [
                {
                    "Enter": { min: 0, max: 1 },
                    "Exit": { min: 0, max: 1 },
                    "Value": { min: 0, max: 1 }
                }],
            categorical: {
                categories: {
                    for: { in: 'Enter' },
                    dataReductionAlgorithm: { top: {} }
                },
                values: {
                    select: [
                        { bind: { to: 'Exit' } },
                        { bind: { to: 'Value' } },
                    ]
                },
            }
        }],
        suppressDefaultTitle: true,
    };
}