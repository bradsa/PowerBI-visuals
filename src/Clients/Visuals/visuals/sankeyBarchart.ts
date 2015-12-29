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

/* Please make sure that this path is correct */
/// <reference path="../_references.ts"/>
module powerbi.visuals {

    export interface SanKeyBarchartDataLink {
        enter: { value: string; label: string; rate: number };
        exit: { value: string; label: string; rate: number };
        color: string;
    }

    export class SankeyBarchart implements IVisual {

        private root: D3.Selection;
        private dataView: DataView;
        private colors: IDataColorPalette;

        private static converter(dataView: DataView, colors: IDataColorPalette): any {

            var data = [];
          
            // check for good data or return empty rowset
            if (!dataView || !dataView.categorical || !dataView.categorical.categories ||                                      // ensure categories are present
                !dataView.categorical.categories[0] || !dataView.categorical.categories[0].values ||                           // ensure source
                !dataView.categorical.categories[1] || !dataView.categorical.categories[1].values                              // ensure dest
                || (dataView.categorical.categories[1].values.length !== dataView.categorical.categories[0].values.length)     // ensure source and destination lists are the same size
                || !dataView.categorical.values || !dataView.categorical.values[0] || !dataView.categorical.values[0].values   // ensure values
                || dataView.categorical.categories[1].values.length !== dataView.categorical.values[0].values.length           // ensure values list is the same size as the categories
            ) {
                return [];
            }
            var colorScale = colors.getNewColorScale();
            var enterIndex = 0;
            var exitIndex = 1;
            if (dataView.categorical.categories[0].source.roles && dataView.categorical.categories[0].source.roles["Exit"]) {
                enterIndex = 1;
                exitIndex = 0;
            }

            var unsortedData = [];

            for (var i = 0; i < dataView.categorical.categories[enterIndex].values.length; i++) {
                if (dataView.categorical.values[0].values[i] > 0 && dataView.categorical.values[0].values[i] != null) {
                    unsortedData.push([dataView.categorical.categories[enterIndex].values[i], dataView.categorical.categories[exitIndex].values[i], dataView.categorical.values[0].values[i]]);
                }
            }

            var sortedData = unsortedData.sort(function (a, b) { return b[2] - a[2]; });

            $.each(sortedData, (index, item) => {
                var enterValue: number = item[2];
                var enterLabel: string = item[0];
                var enterRate: number = enterValue / sortedData[0][2]; // vs first value
                var exitLabel: string = item[1];
                var exitValue: number = null;
                var exitRate: number = null;
                if (index < sortedData.length - 1) { // don't go past the end
                    var nextEnterValue: number = sortedData[index + 1][2];
                    exitValue = enterValue - nextEnterValue;
                    exitRate = exitValue / enterValue;
                }
                var newColor = colorScale.getColor(enterLabel).value;

                data.push(
                    {
                        enter: { value: enterValue, label: enterLabel, rate: enterRate },
                        exit: { value: exitValue, label: exitLabel, rate: exitRate },
                        color: newColor,
                    }
                );
            });
            return data;
        }

        public init(options: VisualInitOptions): void {
            this.root = d3.select(options.element.get(0));
            this.colors = options.style.colorPalette.dataColors;

        }

        public update(options: VisualUpdateOptions) {
            if (!options.dataViews || (options.dataViews.length < 1)) return;

            var sankeyBarchartOptions = {
                padding: {
                    top: 20,
                    right: 20
                },
                range: {
                    gap: 0.6,
                    padding: 0.5
                },
                axis: {
                    y: {
                        ticks: 4,
                        color: "#cccccc",
                        stroke: "#eeeeee",
                        format: formatter
                    },
                    x: {
                        stroke: "#ddd",
                        dash_array: ("3, 3")
                    }
                },
                bar: {
                    stroke: "#6596EB",
                    fill: "#739FEE"
                },
                sankey: {
                    color: "#e9e9e9",
                    opacity: 0.4
                }
            };

            var dataset = SankeyBarchart.converter(this.dataView = options.dataViews[0], this.colors);
            // clear viewport and create margins
            //var viewport = options.viewport;
            this.root.selectAll("svg").remove();
            $(this.root[0][0]).addClass('sankey-barchart');
            $(this.root[0][0]).html('');
            if (dataset.length === 0) {
                return;
            }

            var formatter = valueFormatter.create({ format: this.dataView.categorical.values[0].source.format });

            var vizWidth = Math.max(30, options.viewport.width),
                vizHeight = Math.max(30, options.viewport.height);

            // ranges/gaps/padding along x
            var xaxis_range_gap = d3.scale
                .ordinal()
                .domain(_.range(dataset.length)) // # of columns
                .rangeRoundBands([0, vizWidth - sankeyBarchartOptions.padding.right], sankeyBarchartOptions.range.gap, sankeyBarchartOptions.range.padding); // range, gap, pad

            // TABLE WIDTH - We want to render columns that match the columns in the SVG barchar so we can align our table headers and footers to give some KPIs and describe the data.
            var table_column_width = function (d, i) {
                var me = xaxis_range_gap(i).toFixed(0);
                if (i < dataset.length - 1) {
                    var next = xaxis_range_gap(i + 1).toFixed(0);
                    return (next - me).toFixed(0) + 'px';
                } else {
                    return (vizWidth - me).toFixed(0) + 'px';
                }
            };

            var header = d3.select(this.root[0][0])
                .append("div")
                .attr("class", "header")
                .style("width", function () {
                    return vizWidth + 'px';
                })
                .style("position", "relative")
                .style("display", "block")
                .style("clear", "both")
                .selectAll("span")
                .data(dataset)
                .enter()
                .append("span")
                .style("left", function (d, i) {
                    var x = xaxis_range_gap(i).toFixed(0);
                    return x + 'px';
                })
                .style("width", table_column_width)
                .style("position", "absolute")
                .html(function (d, i) {
                    return '<div class="th">' +
                        '<label>' + d.enter.label + '</label>' +
                        '<em class="value">' + formatter.format(d.enter.value) + '</em>' +
                        (d.enter.rate ? '<em class="rate">' + d3.format(",.1%")(d.enter.rate) + '</em>' : '') +
                        '</div>';
                });

            vizHeight = vizHeight - header[0].parentNode.clientHeight;
            
            // SVG
            var svg = d3.select(this.root[0][0])
                .append("svg")
                .attr("width", vizWidth);

            // BARCHART FOOTER
            var footer = d3.select(this.root[0][0])
                .append("div")
                .attr("class", "footer")
                .style("width", function () {
                    return vizWidth + 'px';
                })
                .style("position", "relative")
                .style("display", "block")
                .style("clear", "both")
                .selectAll("span")
                .data(_.range(dataset.length - 1))
                .enter()
                .append("span")
                .style("left", function (d, i) {
                    var x = xaxis_range_gap(i).toFixed(0);
                    return x + 'px';
                })
                .style("width", table_column_width)
                .style("position", "absolute")
                .html(function (d, i) {
                    var d = dataset[i];
                    var exitRate: string = (d.exit.rate ? '<em class="rate">' + d3.format(",.1%")(d.exit.rate) + '</em>' : '');
                    return '<div class="th">' +
                        '<label>' + d.exit.label + '</label>' +
                        '<em class="value">' + formatter.format(d.exit.value) + '</em>' +
                        exitRate +
                        '</div>';
                });

            vizHeight = vizHeight - footer[0].parentNode.clientHeight;
            svg.attr("height", vizHeight);

            // XAXIS
            var lines = svg.append("g")
                .attr("class", "x-lines")
                .attr("transform", "translate(0,0)");

            lines.selectAll("line.x")
                .data(_.range(dataset.length))
                .enter()
                .append("line")
                .attr("class", "x")
                .attr("x1", function (d, i) {
                    return xaxis_range_gap(i);
                })
                .attr("y1", 0)
                .attr("y2", vizHeight)
                .attr("x2", function (d, i) {
                    return xaxis_range_gap(i);
                })
                .style("stroke", sankeyBarchartOptions.axis.x.stroke)
                .style("stroke-dasharray", sankeyBarchartOptions.axis.x.dash_array);
            
            // YAXIS
            svg.append("g")
                .attr("class", "y-lines")
                .attr("transform", "translate(0,0)");

            var yaxis = d3.scale.ordinal()
                .domain(_.range(sankeyBarchartOptions.axis.y.ticks))
                .rangeBands([0, vizHeight], 0, 0);

            svg.select(".y-lines")
                .selectAll("line.y")
                .data(_.range(sankeyBarchartOptions.axis.y.ticks))
                .enter()
                .append("line")
                .attr("class", "y")
                .attr("x1", 0)
                .attr("y1", function (d, i) {
                    return yaxis(i);
                })
                .attr("y2", function (d, i) {
                    return yaxis(i);
                })
                .attr("x2", vizWidth)
                .style("stroke", sankeyBarchartOptions.axis.y.stroke);

            svg.append("g")
                .attr("class", "y-text")
                .attr("transform", "translate(0,0)");

            var max_value = d3.max(dataset, function (d: SanKeyBarchartDataLink) {
                return d.enter.value;
            });

            var bar_height_fx = d3.scale.linear()
                .domain([0, max_value])
                .range([0, vizHeight])
                .nice();

            svg.select(".y-text")
                .selectAll("text")
                .data(_.range(sankeyBarchartOptions.axis.y.ticks + 1))
                .enter().append("text")
                .attr("class", "y")
                .attr("x", 2)
                .attr("y", function (d, i) {
                    if (i === sankeyBarchartOptions.axis.y.ticks) {
                        return vizHeight - 3;
                    } else {
                        var y = yaxis(i) - 3;
                        return y;
                    }
                })
                .text(function (d, i) {
                    if (i === sankeyBarchartOptions.axis.y.ticks) {
                        return '0';
                    } else {
                        var y = vizHeight - yaxis(i);
                        var v = bar_height_fx.invert(y);
                        return formatter.format(Math.round(v));
                    }
                })
                .style("fill", sankeyBarchartOptions.axis.y.color);

            // BARS
            svg.selectAll("rect")
                .data(dataset)
                .enter()
                .append("rect")
                .attr("x", function (d, i) {
                    return xaxis_range_gap(i);
                })
                .attr("y", function (d) {
                    return (vizHeight - bar_height_fx(d.enter.value));
                })
                .attr("width", xaxis_range_gap.rangeBand())
                .attr("height", function (d) {
                    return bar_height_fx(d.enter.value);
                })
                .attr("fill", function (d) {
                    return d.color;
                });
                
            // SANKEY BARS
            svg.append("g")
                .attr("class", "edges")
                .attr("transform", "translate(0,0)");

            svg.select(".edges")
                .selectAll(".edge")
                .data(_.initial(dataset))
                .enter()
                .append("polygon")
                .attr("class", "edge")
                .attr("points", function (this_datapoint, i) {

                    var next_datapoint = dataset[i + 1];
                    var y1 = vizHeight - bar_height_fx(this_datapoint.enter.value);
                    var y2 = vizHeight - bar_height_fx(next_datapoint.enter.value);
                    var x1 = xaxis_range_gap(i);
                    var x2 = xaxis_range_gap(i + 1);

                    return [
                        x1 + xaxis_range_gap.rangeBand() + 1, y1, // top right of this bar
                        x2, y2, // top left of next bar
                        x2, vizHeight + 1, // bottom left of next bar
                        x1 + xaxis_range_gap.rangeBand() + 1, vizHeight + 1 // bottom right of this bar
                    ].join(" ");
                })
                .style("fill", sankeyBarchartOptions.sankey.color)
                .style("opacity", sankeyBarchartOptions.sankey.opacity);

        }

        public destroy(): void {
            this.root = null;
        }

    }
}