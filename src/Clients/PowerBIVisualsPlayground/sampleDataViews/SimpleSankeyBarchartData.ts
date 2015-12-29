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
    import ValueType = powerbi.ValueType;
    import PrimitiveType = powerbi.PrimitiveType;
    import DataViewTransform = powerbi.data.DataViewTransform;

    export class SimpleSankeyBarchartData extends SampleDataViews implements ISampleDataViewsMethods {

        public name: string = "SimpleSankeyBarchartData";
        public displayName: string = "Simple Sankey Barchart data";

        public visuals: string[] = ['sankeyBarchart'];
        
        // Data from http://bl.ocks.org/terrancesnyder/227e02f3e2c8eef23f96
        private defaultData: number[] = [19485, 5455, 768, 559, 64];

        public getDataViews(): DataView[] {

            var dataTypeNumber = ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double);
            var dataTypeString = ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Text);

            let dataViewMetadata: DataViewMetadata = {
                columns: [{
                    displayName: "Enter",
                    type: dataTypeString
                }, {
                        displayName: "Exit",
                        type: dataTypeString
                    }, {
                        displayName: "Value",
                        type: dataTypeNumber
                    }]
            };

            return [{
                metadata: dataViewMetadata,
                categorical: {
                    categories: [{
                        source: dataViewMetadata.columns[0],
                        values: ["All Sessions", "Product Views", "Add to Cart", "Checkout", "Purchaes"]
                    }, {
                            source: dataViewMetadata.columns[1],
                            values: ["No Shopping Activity", "No Cart Addition", "Cart Abandonment", "Checkout Abandonment", ""]
                        }],
                    values: DataViewTransform.createValueColumns([{
                        source: dataViewMetadata.columns[2],
                        values: this.defaultData
                    }])
                }
            }];
        }

        public randomize(): void {
            let dataLen: number = this.defaultData.length;

            this.defaultData = [];
            var previousValue: number = this.getRandomValue(50000, 75000);
            for (let i = 0; i < dataLen; i++) {
                previousValue = this.getRandomValue(previousValue * 0.30, previousValue);
                this.defaultData.push(Math.round(previousValue));
            }
        }

    }
}