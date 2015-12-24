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

module powerbi.visuals.sampleDataViews {
    import DataViewTransform = powerbi.data.DataViewTransform;

    export class SimpleBoxWhiskerData
        extends SampleDataViews
        implements ISampleDataViewsMethods {

        public name: string = "SimpleBoxWhiskerData";
        public displayName: string = "Simple BoxWhisker Data";

        public visuals: string[] = ["boxWhisker"];

        private sampleData = [
            //[5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100],
            [850, 740, 900, 1070, 930, 850, 950, 980, 980, 880, 1000, 980, 930, 650, 760, 810, 1000, 1000, 960, 960],
            [960, 940, 960, 940, 880, 800, 850, 880, 900, 840, 830, 790, 810, 880, 880, 830, 800, 790, 760, 800],
            [880, 880, 880, 860, 720, 720, 620, 860, 970, 950, 880, 910, 850, 870, 840, 840, 850, 840, 840, 840],
            [890, 810, 810, 820, 800, 770, 760, 740, 750, 760, 910, 920, 890, 860, 880, 720, 840, 850, 850, 780],
            [890, 840, 780, 810, 760, 810, 790, 810, 820, 850, 870, 870, 810, 740, 810, 940, 950, 800, 810, 870]
        ];

        public getDataViews(): DataView[] {

            var fieldExpr = powerbi.data.SQExprBuilder.fieldExpr({ column: { schema: 's', entity: "table1", name: "Test" } });

            var categoryValues = ["Test 1", "Test 2", "Test 3", "Test 4", "Test 5"];
            var categoryIdentities = categoryValues.map(function (value) {
                var expr = powerbi.data.SQExprBuilder.equal(fieldExpr, powerbi.data.SQExprBuilder.text(value));
                return powerbi.data.createDataViewScopeIdentity(expr);
            });
        
            // Metadata, describes the data columns, and provides the visual with hints
            // so it can decide how to best represent the data
            var dataViewMetadata: powerbi.DataViewMetadata = {
                columns: [
                    {
                        displayName: 'Point',
                        queryName: 'Point',
                        type: powerbi.ValueType.fromDescriptor({ text: true })
                    },
                    {
                        displayName: 'Test 1',
                        isMeasure: true,
                        queryName: 'test1',
                        type: powerbi.ValueType.fromDescriptor({ numeric: true }),
                    },
                    {
                        displayName: 'Test 2',
                        isMeasure: true,
                        queryName: 'test2',
                        type: powerbi.ValueType.fromDescriptor({ numeric: true })
                    },
                    {
                        displayName: 'Test 3',
                        isMeasure: true,
                        queryName: 'test3',
                        type: powerbi.ValueType.fromDescriptor({ numeric: true })
                    },
                    {
                        displayName: 'Test 4',
                        isMeasure: true,
                        queryName: 'test4',
                        type: powerbi.ValueType.fromDescriptor({ numeric: true })
                    },
                    {
                        displayName: 'Test 5',
                        isMeasure: true,
                        queryName: 'test5',
                        type: powerbi.ValueType.fromDescriptor({ numeric: true })
                    }
                ]
            };

            var columns = [
                {
                    source: dataViewMetadata.columns[1],
                    values: this.sampleData[0],
                },
                {
                    source: dataViewMetadata.columns[2],
                    values: this.sampleData[1],
                },
                {
                    source: dataViewMetadata.columns[3],
                    values: this.sampleData[2],
                },
                {
                    source: dataViewMetadata.columns[4],
                    values: this.sampleData[3],
                },
                {
                    source: dataViewMetadata.columns[5],
                    values: this.sampleData[4],
                },
                {
                    source: dataViewMetadata.columns[2],
                    values: this.sampleData[1],
                }

            ];

            var dataValues: DataViewValueColumns = DataViewTransform.createValueColumns(columns);
            var tableDataValues = categoryValues.map(function (countryName, idx) {
                return [countryName, columns[0].values[idx], columns[1].values[idx]];
            });

            return [{
                metadata: dataViewMetadata,
                categorical: {
                    categories: [{
                        source: dataViewMetadata.columns[0],
                        values: categoryValues,
                        identity: categoryIdentities,
                    }],
                    values: dataValues
                },
                table: {
                    rows: tableDataValues,
                    columns: dataViewMetadata.columns,
                },
            }];
        }

        public randomize(): void {

            this.sampleData = this.sampleData.map((item) => {
                return item.map(() => this.getRandomValue(600, 1000));
            });
        }
    }
}
