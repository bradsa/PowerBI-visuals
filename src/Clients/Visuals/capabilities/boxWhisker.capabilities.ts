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
    export const boxWhiskerCapabilities: VisualCapabilities = {
        dataRoles: [
            {
                name: 'Category',
                kind: VisualDataRoleKind.Grouping,
                displayName: data.createDisplayNameGetter('Role_DisplayName_Axis'),
                description: data.createDisplayNameGetter('Role_DisplayName_AxisDescription')
            },
            {
                name: 'Values',
                kind: VisualDataRoleKind.GroupingOrMeasure,
                displayName: data.createDisplayNameGetter('Role_DisplayName_Value'),
                requiredTypes: [{ numeric: true }],
            },

        ],
        objects: {
            general: {
                displayName: data.createDisplayNameGetter('Visual_General'),
                properties: {
                    formatString: {
                        type: { formatting: { formatString: true } },
                    },
                },
            },
            box: {
                displayName: "Box Options",
                properties: {
                    q1: {
                        displayName: "1st Quantile",
                        description: "Default 0.05",
                        type: { numeric: true },
                    },
                    q2: {
                        displayName: "2nd Quantile",
                        description: "Default 0.25",
                        type: { numeric: true }

                    },
                    q3: {
                        displayName: "3rd Quantile",
                        description: "Default 0.75",
                        type: { numeric: true }
                    },
                    q4: {
                        displayName: "4th Quantile",
                        description: "Default 0.95",
                        type: { numeric: true }
                    },
                    outlierFactor: {
                        displayName: "Outlier Multipler",
                        description: "Highlight IF (val <q1 - OM || val >q3 + OM ) where OM= X * (q2 - q1)",
                        type: { numeric: true }
                    },
                    yTitle: {
                        displayName: "Y Axis Title",
                        type: { numeric: false }
                    }
                },
            },
        },
        dataViewMappings: [

            {
                conditions: [
                    { 'Category': { max: 1 }, 'Values': { min: 0 } },
                ],
                categorical: {
                    categories: {
                        for: { in: "Category" },
                        dataReductionAlgorithm: { top: {} }
                    },
                    values: {
                        group: {
                            by: 'Series',
                            select: [{ for: { in: 'Values' } }, { bind: { to: 'Category' } }],
                        }

                    },
                    rowCount: { preferred: { min: 2 }, supported: { min: 2 } }
                },
            }
        ],
        suppressDefaultTitle: true,
    };
}