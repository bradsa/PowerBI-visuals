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
    export interface IBoxWhiskerData {
        Label: string;
        Q1: number;
        Median: number;
        Q3: number;
        Minimum: number;
        Maximum: number;
        Mean: number;
        LowWhisker: number;
        HighWhisker: number;
        NumDataPoints: number;
        Points: number[];
        Outliers: number[];
        OutlierIndexes: number[];
        OutlierObjects?: any[];
    }

    export interface IBoxWhiskerPlot {
        (): IBoxWhiskerPlot;
        width(): number;
        width(width: number): IBoxWhiskerPlot;
        height(): number;
        height(height: number): IBoxWhiskerPlot;
        duration(): number;
        duration(duration: number): IBoxWhiskerPlot;
        domain(): number[];
        domain(dom: number[]): IBoxWhiskerPlot;
        range(): number[];
        range(range: number[]): IBoxWhiskerPlot;
        showLabels(): boolean;
        showLabels(show: boolean): IBoxWhiskerPlot;
        showDataPoints(): boolean;
        showDataPoints(show: boolean): IBoxWhiskerPlot;
        tickFormat(): (any) => string;
        tickFormat(formatter: (value: any) => string): IBoxWhiskerPlot;
        whiskers(computeWhiskers: (data: IBoxWhiskerData, index: number) => number[]): IBoxWhiskerPlot;
    }
    
    export interface IBoxWhiskerPlotData {
        Title: string;
        XAxisTitle: string;
        YAxisTitle: string;
        PlotData: IBoxWhiskerData[];
        Goal?: number;
    }

    export class BoxWhiskerPlotData implements IBoxWhiskerPlotData {
        constructor(public Title: string,
            public XAxisTitle: string,
            public YAxisTitle: string,
            public PlotData: IBoxWhiskerData[],
            public Goal?: number) {
        }
    }

    export class BoxWhiskerData implements IBoxWhiskerData {
        constructor(public Label: string,
            public Q1: number,
            public Median: number,
            public Q3: number,
            public Minimum: number,
            public Maximum: number,
            public Mean: number,
            public LowWhisker: number,
            public HighWhisker: number,
            public NumDataPoints: number,
            public Points: number[],
            public Outliers: number[],
            public OutlierIndexes: number[],
            public OutlierObjects?: any[]) {
        }
    }

    export class BoxWhisker implements IVisual {

        private root: D3.Selection;
        private dataView: DataView;
        private colors: IDataColorPalette;

        private static properties = {
            q1: { objectName: 'box', propertyName: 'q1' },
            q2: { objectName: 'box', propertyName: 'q2' },
            q3: { objectName: 'box', propertyName: 'q3' },
            q4: { objectName: 'box', propertyName: 'q4' },
            outlierFactor: { objectName: 'box', propertyName: 'outlierFactor' },
            yTitle: { objectName: 'box', propertyName: 'yTitle' },
        };

        private getQ1(dataView: DataView): number {
            return dataView.metadata && DataViewObjects.getValue(dataView.metadata.objects, BoxWhisker.properties.q1, 0.05);
        }
        private getQ2(dataView: DataView): number {
            return dataView.metadata && DataViewObjects.getValue(dataView.metadata.objects, BoxWhisker.properties.q2, 0.25);
        }
        private getQ3(dataView: DataView): number {
            return dataView.metadata && DataViewObjects.getValue(dataView.metadata.objects, BoxWhisker.properties.q3, 0.75);
        }
        private getQ4(dataView: DataView): number {
            return dataView.metadata && DataViewObjects.getValue(dataView.metadata.objects, BoxWhisker.properties.q4, 0.95);
        }
        private getOutlierFactor(dataView: DataView): number {
            return dataView.metadata && DataViewObjects.getValue(dataView.metadata.objects, BoxWhisker.properties.outlierFactor, 0);
        }
        private getYTitle(dataView: DataView): string {
            return dataView.metadata && DataViewObjects.getValue(dataView.metadata.objects, BoxWhisker.properties.yTitle, "");
        }

        public init(options: VisualInitOptions) {
            this.root = d3.select(options.element.get(0));
            this.colors = options.style.colorPalette.dataColors;
        }

        public update(options: VisualUpdateOptions): void {

            if (options.dataViews.length === 0) { return; }
            this.dataView = options.dataViews[0];

            var categoryIndex = null;
      
            // we must have at least one row of values
            if (!options.dataViews[0].categorical.values &&
                !(options.dataViews[0].categorical.categories[0].source.roles && options.dataViews[0].categorical.categories[0].source.roles["Values"])) {
                return;
            }

            if (options.dataViews[0].categorical.categories) {
                options.dataViews[0].categorical.categories.forEach(function (col, index) {
                    if (col.source.roles && col.source.roles["Values"]) { // skip category creation when it's index 0
                        return;
                    } else {
                        categoryIndex = 0;
                    }
                });
            }
         
            // check that we have the correct data
              
            var appendTo = this.root[0][0];
            var viewport = options.viewport;
            this.root.selectAll("svg").remove();

            var dataPoints: boolean = true;
            // options
            var YAxisTitle = this.getYTitle(this.dataView);
            var XAxisTitle = "";
            var title = "";
            var outlierFactor = this.getOutlierFactor(this.dataView);
            var labels = true; // show the text labels beside individual boxplots?
            var q1quantile = this.getQ2(this.dataView);
            var q2quantile = this.getQ3(this.dataView);
            var lowWhiskerQuantile = this.getQ1(this.dataView);
            var highWhiskerQuantile = this.getQ4(this.dataView);
            var valueFormat = "0";
            var pData: BoxWhiskerData[] = [];

            var baseCategoryData = null;
            if (categoryIndex !== null && this.dataView.categorical.values) {
                baseCategoryData = this.dataView.categorical.values;
            }
            else if (categoryIndex != null && this.dataView.categorical.values === undefined) {
                var categoryCol = this.dataView.categorical.categories[categoryIndex];
                var categoryData = {};
                // normalize the data
                for (var k = 0; k < this.dataView.categorical.categories.length; k++) {
                    if (k === categoryIndex) { continue; }
                    for (var x = 0; x < this.dataView.categorical.categories[k].values.length; x++) {
                        if (categoryData[categoryCol.values[x]] === undefined) {
                            categoryData[categoryCol.values[x]] = [];
                        }
                        categoryData[categoryCol.values[x]].push(this.dataView.categorical.categories[k].values[x]);
                    }
                }

                baseCategoryData = [];
                // put it into category format
                Object.keys(categoryData).forEach(function (key) {
                    baseCategoryData.push({ 'values': categoryData[key], 'name': key });
                });

            } else {
                baseCategoryData = this.dataView.categorical.categories;
            }
            for (var k = 0; k < this.dataView.categorical.categories.length; k++) {
                if (k === categoryIndex) { continue; }
                if (this.dataView.categorical.categories[k].source.format) {
                    valueFormat = this.dataView.categorical.categories[k].source.format;
                }
            }

            baseCategoryData.forEach(function (categoryValues, index) {

                var values = categoryValues.values.sort(d3.ascending);
                var outliers = [];
                var q1 = d3.quantile(values, q1quantile);
                var q2 = d3.quantile(values, q2quantile);
                var lowWhisker = d3.quantile(values, lowWhiskerQuantile);
                var highWhisker = d3.quantile(values, highWhiskerQuantile);
                var i = -1, j = values.length, of = (q2 - q1) * outlierFactor;
                while (values[++i] <= lowWhisker - of) {
                    outliers.push(values[i]);
                }
                while (values[--j] >= highWhisker + of) {
                    outliers.push(values[j]);
                }
                var outlierIndexes = [i, j];
                values.forEach(function (val) {
                    if (val <= lowWhisker || val >= highWhisker) {
                        outliers.push(val);
                    }
                });

                var labelName = "";
                if (categoryValues.source && categoryValues.source.displayName) {
                    labelName = categoryValues.source.displayName + (categoryValues.source.groupName ? " (" + categoryValues.source.groupName + ")" : "");
                } else {
                    labelName = categoryValues["name"];
                }

                var bwData = {
                    Label: labelName,
                    Q1: q1,
                    Median: d3.median(values),
                    Q3: q2,
                    Minimum: parseInt(d3.min(values).toString(), null),
                    Maximum: parseInt(d3.max(values).toString(), null),
                    Mean: d3.mean(values),
                    LowWhisker: lowWhisker,
                    HighWhisker: highWhisker,
                    NumDataPoints: values.length,
                    Points: values,
                    Outliers: outliers,
                    OutlierIndexes: outlierIndexes,
                    OutlierObjects: null
                };
                pData.push(bwData);

            });

            var plotData =
                {
                    Title: title, XAxisTitle: XAxisTitle, YAxisTitle: YAxisTitle,
                    PlotData: pData,
                    Goal: null
                };

            var margin = { top: 10, right: 50, bottom: 70, left: 70 },
                w = Math.max(30, viewport.width - margin.left - margin.right),
                h = Math.max(30, viewport.height - margin.top - margin.bottom);

            var pdata = plotData.PlotData;
            var scaleData = this.createPlotAndAxesScales(plotData, h, margin.top);
            var formatter = valueFormatter.create({ format: valueFormat });

            var chart = d3.box()
                .height(h)
                .width(w)
                .domain(scaleData["boxDomain"])
                .range(scaleData["boxRange"])
                .showLabels(labels)
                .showDataPoints(dataPoints)
                .tickFormat(formatter.format);

            var svg = d3.select(appendTo)
                .append("div").attr("class", "boxWhisker")
                .append("svg")
                .attr("width", w + margin.left + margin.right)
                .attr("height", h + margin.top + margin.bottom)
                .attr("class", "box")
                .append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            // the x-axis
            var xaxisScale = d3.scale.ordinal()
                .domain(pdata.map(function (d) { return d.Label; }))
                .rangeRoundBands([0, w], 0.7, 0.3);

            var xAxis = d3.svg.axis()
                .scale(xaxisScale)
                .orient("bottom");

            // the y-axis
            var y = d3.scale.linear()
                .domain(scaleData["yAxesDomain"])
                .range(scaleData["yAxesRange"]);

            var yAxis = d3.svg.axis()
                .scale(y)
                .orient("left")
                .tickFormat(formatter.format);
                
            // draw the boxplots
            svg.selectAll(".box")
                .data(pdata)
                .enter().append("g")
                .attr("transform", function (d) {
                    return "translate(" + xaxisScale(d.Label) + "," + margin.top + ")";
                })
                .attr("data", function (d) {
                    return d.Label;
                })
                .call(chart.width(xaxisScale.rangeBand()));

            var outliers = svg.selectAll("circle.outlier");
            // Add Power BI tooltip info   
            TooltipManager.addTooltip(outliers, (tooltipEvent: TooltipEvent) => {
                return [
                    {
                        displayName: '',
                        value: formatter.format(tooltipEvent.data),
                    }
                ];
            }, true);

            var datapoints = svg.selectAll("circle.datapoint");
            // Add Power BI tooltip info   
            TooltipManager.addTooltip(datapoints, (tooltipEvent: TooltipEvent) => {
                return [
                    {
                        displayName: '',
                        value: formatter.format(tooltipEvent.data),
                    }
                ];
            }, true);

            function addOrd(n) {
                var ords = [, 'st', 'nd', 'rd'];
                var m = n % 100;
                return n + ((m > 10 && m < 14) ? 'th' : ords[m % 10] || 'th');
            }

            var box = svg.selectAll("rect.box");
            TooltipManager.addTooltip(box, (tooltipEvent: TooltipEvent) => {

                return [
                    {
                        displayName: addOrd(q2quantile * 100) + " quantile",
                        value: formatter.format(tooltipEvent.data[2]),
                    },
                    {
                        displayName: "median",
                        value: formatter.format(tooltipEvent.data[1]),
                    },
                    {
                        displayName: addOrd(q1quantile * 100) + " quantile",
                        value: formatter.format(tooltipEvent.data[0]),
                    }
                ];
            }, true);

            var meanPoint = svg.selectAll("circle.mean");
            // Add Power BI tooltip info   
            TooltipManager.addTooltip(meanPoint, (tooltipEvent: TooltipEvent) => {
                return [
                    {
                        displayName: 'Mean',
                        value: formatter.format(tooltipEvent.data),
                    }
                ];
            }, true);

            var whiskerTick = svg.selectAll("text.whisker");
            // Add Power BI tooltip info   
            TooltipManager.addTooltip(whiskerTick, (tooltipEvent: TooltipEvent) => {
                var quartileString = '';
                if (tooltipEvent.index % 2 === 0) {
                    quartileString = addOrd(highWhiskerQuantile * 100);
                } else {
                    quartileString = addOrd(highWhiskerQuantile * 100);
                }
                return [
                    {
                        displayName: quartileString + " quantile",
                        value: formatter.format(tooltipEvent.data),
                    }
                ];
            }, true);

            var whiskerTick = svg.selectAll("line.whisker");
            // Add Power BI tooltip info   
            TooltipManager.addTooltip(whiskerTick, (tooltipEvent: TooltipEvent) => {
                var quartileString = '';
                if (tooltipEvent.index % 2 === 0) {
                    quartileString = addOrd(highWhiskerQuantile * 100);
                } else {
                    quartileString = addOrd(highWhiskerQuantile * 100);
                }
                return [
                    {
                        displayName: quartileString + " quantile",
                        value: formatter.format(tooltipEvent.data),
                    }
                ];
            }, true);
         
            // draw y axis
            svg.append("g")
                .attr("class", "y axis")
                .call(yAxis)
                .append("text") // and text1
                .attr("transform", "rotate(-90)")
                .attr("y", -60)
                .attr("x", -1 * (h + margin.top + margin.bottom) / 2)
                .attr("dy", ".71em")
                .style("text-anchor", "end")
                .style("font-size", "16px")
                .text(plotData.YAxisTitle);

            // draw x axis
            svg.append("g")
                .attr("class", "x axis")
                .attr("transform", "translate(0," + (h + margin.top + 10) + ")")
                .call(xAxis)
                .selectAll("text")
                .style("text-anchor", "middle")
                .attr("transform", function (d) {
                    //return "rotate(45)";
                });

            // draw goal line if goal is set
            if (plotData.Goal && plotData.Goal !== 0) {
                svg.append("g")
                    .attr("class", "goal")
                    .append("line")             // text label for the x axis
                    .attr("x1", 0)
                    .attr("y1", y(plotData.Goal))
                    .attr("x2", w)
                    .attr("y2", y(plotData.Goal));
            }
            chart.duration(1000);
        }

        /**
         * The function calculates the mapping for data points to screen pixels for the boxes and the y axes.
         * The scaling function is really simple, it uses the median of all median values and finds the ratio
         * between that and the maximum value. This ratio is used to determine how much area is going to be used
         * to draw up to the median. If the raio is less than 20%, 20% is used
         * The data is partitioned into three domains ( min -> median of medians -> max)
         * The range is partitioned into three as well (y-axes is inverted) ( height, height - (height * scale), 0)
         * 
         */
        public createPlotAndAxesScales(plotData: IBoxWhiskerPlotData, height: number, topMargin: number) {
            var min = plotData.Goal != null ? plotData.Goal : Infinity,
                max = plotData.Goal != null ? plotData.Goal : -Infinity,
                highWhisker = plotData.PlotData[0].HighWhisker;
            var data = plotData.PlotData;
            var medians = [];

            // TODO: replace this with d3.extent
            for (var i in data) {
                var rowMax = data[i].Maximum;
                var rowMin = data[i].Minimum;
                var rowWhisker = data[i].HighWhisker;

                medians.push(data[i].Median);

                if (rowMax > max) max = rowMax;
                if (rowWhisker > highWhisker) highWhisker = rowWhisker;
                if (rowMin < min) min = rowMin;
            }

            var medianofMedians = d3.median(medians.sort(d3.ascending));
            var heightWithMargin = height + topMargin;
            var scale = medianofMedians / max;
            if (scale < 0.30) {
                scale = 0.30;
            }

            var top = Math.min(max, 0.5 * (highWhisker - medianofMedians) + highWhisker);

            // Please make sure that the domain and ranges have the same number of elements in their arrays. Otherwise the 
            // plot will be all wrong with much head scratching required. This sets up a polylinear scale 
            // ( more at https://github.com/mbostock/d3/wiki/Quantitative-Scales#linear) which requires the same number of elements
            // for ranges.
            //return {
            //    "boxDomain": [min, medianofMedians, max],
            //    "boxRange": [height, height - (height * scale), 0],
            //    "yAxesDomain": [min, medianofMedians, max],
            //    "yAxesRange": [heightWithMargin, heightWithMargin - (heightWithMargin * scale), 0 + topMargin]
            //};
            return {
                "boxDomain": [min, top],
                "boxRange": [height, 0],
                "yAxesDomain": [min, top],
                "yAxesRange": [heightWithMargin, 0 + topMargin]
            };
        }

        // This function retruns the values to be displayed in the property pane for each object.
        // Usually it is a bind pass of what the property pane gave you, but sometimes you may want to do
        // validation and return other values/defaults
        public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstance[] {
            var instances: VisualObjectInstance[] = [];
            switch (options.objectName) {
                case 'box':
                    var box: VisualObjectInstance = {
                        objectName: 'box',
                        displayName: 'Box',
                        selector: null,
                        properties: {
                            q1: this.getQ1(this.dataView),
                            q2: this.getQ2(this.dataView),
                            q3: this.getQ3(this.dataView),
                            q4: this.getQ4(this.dataView),
                            outlierFactor: this.getOutlierFactor(this.dataView),
                            yTitle: this.getYTitle(this.dataView),
                        }
                    };
                    instances.push(box);
                    break;
            }

            return instances;
        }

    }
}
