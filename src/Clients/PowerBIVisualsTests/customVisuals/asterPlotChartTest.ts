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

module powerbitests {
    import VisualClass = powerbi.visuals.samples.AsterPlot;

    describe("AsterPlotChart", () => {
        describe('capabilities', () => {
            it("registered capabilities", () => expect(VisualClass.capabilities).toBeDefined());
        });

        describe("DOM tests", () => {
            let visualBuilder: AsterPlotChartBuilder;
            let dataViews: powerbi.DataView[];

            beforeEach(() => {
                visualBuilder = new AsterPlotChartBuilder();
                dataViews = new powerbitests.sampleDataViews.SalesByDayOfWeekData().getDataViews();
            });

            it("svg element created", () => expect(visualBuilder.element.children("svg")[0]).toBeInDOM());
            it("update", (done) => {
                visualBuilder.update(dataViews);
                setTimeout(() => {
                    expect(visualBuilder.element.find('.asterSlice').length)
                        .toBe(dataViews[0].categorical.categories[0].values.length);
                    done();
                }, DefaultWaitForRender);
            });
        });
    });

    class AsterPlotChartBuilder {
        private isMinervaVisualPlugin: boolean = false;
        private visual: VisualClass;
        private host: powerbi.IVisualHostServices;
        private style: powerbi.IVisualStyle;
        private viewport: powerbi.IViewport;
        public element: JQuery;

        constructor(
            height: number = 200,
            width: number = 300,
            isMinervaVisualPlugin: boolean = false) {

            this.element = powerbitests.helpers.testDom(height.toString(), width.toString());
            this.host = mocks.createVisualHostServices();
            this.style = powerbi.visuals.visualStyles.create();
            this.isMinervaVisualPlugin = isMinervaVisualPlugin;
            this.viewport = {
                height: this.element.height(),
                width: this.element.width()
            };

            this.build();
            this.init();
        }

        private build(): void {
            this.visual = new VisualClass();
            //  Aster Plot has not been encluded to the visualPluginFactory yet
            // if (this.isMinervaVisualPlugin) {
            //     //this.visual = <any>powerbi.visuals.visualPluginFactory.create().getPlugin("asterPlot");
            // } else {
            //     this.visual = new VisualClass();
            // }
        }

        private init(): void {
            this.visual.init({
                element: this.element,
                host: this.host,
                style: this.style,
                viewport: this.viewport
            });
        }

        public update(dataViews: powerbi.DataView[]): void {
            this.visual.update(<powerbi.VisualUpdateOptions>{
                dataViews: dataViews,
                viewport: this.viewport
            });
        }
    }
}

module powerbitests.sampleDataViews {
    import DataViewTransform = powerbi.data.DataViewTransform;

    export class SalesByDayOfWeekData {

        public name: string = "SalesByDayOfWeekData";
        public displayName: string = "Sales by day of week";

        public visuals: string[] = ['comboChart',
            'dataDotClusteredColumnComboChart',
            'dataDotStackedColumnComboChart',
            'lineStackedColumnComboChart',
            'lineClusteredColumnComboChart',
            'asterPlot',
            'radarChart'
        ];

        private sampleData1 = [
            [742731.43, 162066.43, 283085.78, 300263.49, 376074.57, 814724.34, 570921.34],
            [123455.43, 40566.43, 200457.78, 5000.49, 320000.57, 450000.34, 140832.67]
        ];

        private sampleData2 = [
            [31, 17, 24, 30, 37, 40, 12],
            [30, 35, 20, 25, 32, 35, 15]
        ];

        public getDataViews(): powerbi.DataView[] {
            //first dataView - Sales by day of week
            var fieldExpr = powerbi.data.SQExprBuilder.fieldExpr({ column: { schema: 's', entity: "table1", name: "day of week" } });

            var categoryValues = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
            var categoryIdentities = categoryValues.map(function (value) {
                var expr = powerbi.data.SQExprBuilder.equal(fieldExpr, powerbi.data.SQExprBuilder.text(value));
                return powerbi.data.createDataViewScopeIdentity(expr);
            });

            // Metadata, describes the data columns, and provides the visual with hints
            // so it can decide how to best represent the data
            var dataViewMetadata: powerbi.DataViewMetadata = {
                columns: [
                    {
                        displayName: 'Day',
                        queryName: 'Day',
                        type: powerbi.ValueType.fromDescriptor({ text: true })
                    },
                    {
                        displayName: 'Previous week sales',
                        isMeasure: true,
                        format: "$0,000.00",
                        queryName: 'sales1',
                        type: powerbi.ValueType.fromDescriptor({ numeric: true }),
                        objects: { dataPoint: { fill: { solid: { color: 'purple' } } } },
                    },
                    {
                        displayName: 'This week sales',
                        isMeasure: true,
                        format: "$0,000.00",
                        queryName: 'sales2',
                        type: powerbi.ValueType.fromDescriptor({ numeric: true })
                    }
                ]
            };

            var columns = [
                {
                    source: dataViewMetadata.columns[1],
                    // Sales Amount for 2014
                    values: this.sampleData1[0],
                },
                {
                    source: dataViewMetadata.columns[2],
                    // Sales Amount for 2015
                    values: this.sampleData1[1],
                }
            ];

            var dataValues: powerbi.DataViewValueColumns = DataViewTransform.createValueColumns(columns);
            var tableDataValues = categoryValues.map(function (dayName, idx) {
                return [dayName, columns[0].values[idx], columns[1].values[idx]];
            });
            //first dataView - Sales by day of week END

            //second dataView - Temperature by day of week
            var fieldExprTemp = powerbi.data.SQExprBuilder.fieldExpr({ column: { schema: 's', entity: "table2", name: "day of week" } });

            var categoryValuesTemp = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
            var categoryIdentitiesTemp = categoryValuesTemp.map(function (value) {
                var exprTemp = powerbi.data.SQExprBuilder.equal(fieldExprTemp, powerbi.data.SQExprBuilder.text(value));
                return powerbi.data.createDataViewScopeIdentity(exprTemp);
            });

            // Metadata, describes the data columns, and provides the visual with hints
            // so it can decide how to best represent the data
            var dataViewMetadataTemp: powerbi.DataViewMetadata = {
                columns: [
                    {
                        displayName: 'Day',
                        queryName: 'Day',
                        type: powerbi.ValueType.fromDescriptor({ text: true })
                    },
                    {
                        displayName: 'Previous week temperature',
                        isMeasure: true,
                        queryName: 'temp1',
                        type: powerbi.ValueType.fromDescriptor({ numeric: true }),
                        //objects: { dataPoint: { fill: { solid: { color: 'purple' } } } },
                    },
                    {
                        displayName: 'This week temperature',
                        isMeasure: true,
                        queryName: 'temp2',
                        type: powerbi.ValueType.fromDescriptor({ numeric: true })
                    }
                ]
            };

            var columnsTemp = [
                {
                    source: dataViewMetadataTemp.columns[1],
                    // temperature prev week
                    values: this.sampleData2[0],
                },
                {
                    source: dataViewMetadataTemp.columns[2],
                    // temperature this week
                    values: this.sampleData2[1],
                }
            ];

            var dataValuesTemp: powerbi.DataViewValueColumns = DataViewTransform.createValueColumns(columnsTemp);
            var tableDataValuesTemp = categoryValuesTemp.map(function (dayName, idx) {
                return [dayName, columnsTemp[0].values[idx], columnsTemp[1].values[idx]];
            });
            //first dataView - Sales by day of week END
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
                }
            },
                {
                    metadata: dataViewMetadataTemp,
                    categorical: {
                        categories: [{
                            source: dataViewMetadataTemp.columns[0],
                            values: categoryValuesTemp,
                            identity: categoryIdentitiesTemp,
                        }],
                        values: dataValuesTemp
                    },
                    table: {
                        rows: tableDataValuesTemp,
                        columns: dataViewMetadataTemp.columns,
                    }
                }];
        }
    }
}