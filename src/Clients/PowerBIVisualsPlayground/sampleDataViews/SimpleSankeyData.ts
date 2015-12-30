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

    export class SimpleSankeyData extends SampleDataViews implements ISampleDataViewsMethods {

        public name: string = "SimpleSankeyData";
        public displayName: string = "Simple Sankey data";

        public visuals: string[] = ['sankey'];
        
        // Data from http://www.eia.gov/totalenergy/data/monthly/pdf/flow/electricity.pdf
        private defaultData: number[] = [16.50, 8.75, 25.67, 8.33, 5.26, 24.66, 14.78, 4.79, 4.63, 3.26, 0.03, 0.47];

        public getDataViews(): DataView[] {
            
            // Data from http://www.eia.gov/totalenergy/data/monthly/pdf/flow/electricity.pdf
            //["Coal", "Fossil Fuels", 16.50],
            //["Natural Gas", "Fossil Fuels", 8.75],
            ////["Petroleum", "Fossil Fuels", 0.31],
            ////["Other Gases", "Fossil Fuels", 0.11],
            //["Fossil Fuels", "Generated", 25.67],
            //["Nuclear", "Generated", 8.33],
            //["Renewable Energy", "Generated", 5.26],
            ////["Other", "Generated", 0.18],
            //["Generated", "Conversion Losses", 24.66],
            //["Generated", "End Use", 14.78],
            ////["Gross Generated", "Plant Use", 0.81],
            ////["Gross Generated", "T&D Losses", 0.95],
            ////["Gross Generated", "Net Generated", 13.97],
            ////["Imports", "Net Generated", 0.16],
            ////["Net Generated", "End Use", 13.18],
            //["End Use", "Residential", 4.79],
            //["End Use", "Commercial", 4.63],
            //["End Use", "Industrial", 3.26],
            //["End Use", "Transportation", 0.03],
            //["End Use", "Direct Use", 0.47],
            
            var dataTypeNumber = ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double);
            var dataTypeString = ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Text);

            let dataViewMetadata: DataViewMetadata = {
                columns: [{
                    displayName: "Source",
                    type: dataTypeString
                }, {
                        displayName: "Destination",
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
                        values: ["Coal", "Natural Gas", "Fossil Fuels", "Nuclear", "Renewable Energy", "Generated", "Generated", "End Use", "End Use", "End Use", "End Use", "End Use"]
                    }, {
                            source: dataViewMetadata.columns[1],
                            values: ["Fossil Fuels", "Fossil Fuels", "Generated", "Generated", "Generated", "Conversion Losses", "End Use", "Residential", "Commercial", "Industrial", "Transportation", "Direct Use"]
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

            for (let i = 0; i < dataLen; i++) {
                let value: number = this.getRandomValue(1, 25);

                this.defaultData.push(Math.round(value));
            }
        }

    }
}