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

module powerbi.visuals.samples {
    import ValueFormatter = powerbi.visuals.valueFormatter;
    import SelectionManager = utility.SelectionManager;
    import ClassAndSelector = jsCommon.CssConstants.ClassAndSelector;

    export interface StreamData {
        dataPoints: StreamDataPoint[][];
        legendData: LegendData;
        valueFormatter: IValueFormatter;
        axisXData: StreamAxisXData;
    }

    export interface StreamDataPoint {
        x: number;
        y: number;
        y0?: number;
        identity: SelectionId;
    }

    export interface StreamAxisXData {
        valueFormatter: IValueFormatter;
        values: any[];
        maxNumverOfValues: number;
        scale?: D3.Scale.GenericScale<D3.Scale.LinearScale | D3.Scale.TimeScale | D3.Scale.OrdinalScale>;
    }

    export interface StreamProperties {
        [objectName: string]: StreamProperty;
    }

    export interface StreamProperty {
        [propertyName: string]: DataViewObjectPropertyIdentifier;
    }

    export class StreamGraph implements IVisual {
        private static VisualClassName = 'streamGraph';

        private static Properties: StreamProperties = {
            general: {
                formatString: <DataViewObjectPropertyIdentifier>{
                    objectName: 'general',
                    propertyName: 'formatString'
                }
            }
        };

        private static Layer: ClassAndSelector = {
            'class': 'layer',
            selector: '.layer'
        };

        private static MaxNumberOfAxisXValues: number = 5;

        public static capabilities: VisualCapabilities = {
            dataRoles: [
                {
                    name: 'Category',
                    kind: VisualDataRoleKind.Grouping,
                    displayName: 'Category',
                }, {
                    name: 'Series',
                    kind: VisualDataRoleKind.Grouping,
                    displayName: 'Series',
                }, {
                    name: 'Y',
                    kind: VisualDataRoleKind.Measure,
                    displayName: data.createDisplayNameGetter('Role_DisplayName_Values'),
                },
            ],
            dataViewMappings: [{
                conditions: [
                    { 'Category': { max: 1 }, 'Series': { max: 0 } },
                    { 'Category': { max: 1 }, 'Series': { min: 1, max: 1 }, 'Y': { max: 1 } }
                ],
                categorical: {
                    categories: {
                        for: { in: 'Category' },
                        dataReductionAlgorithm: { bottom: {} }
                    },
                    values: {
                        group: {
                            by: 'Series',
                            select: [{ for: { in: 'Y' } }],
                            dataReductionAlgorithm: { bottom: {} }
                        }
                    },
                }
            }],
            objects: {
                general: {
                    displayName: 'General',
                    properties: {
                        formatString: { type: { formatting: { formatString: true } } },
                        wiggle: {
                            type: { bool: true },
                            displayName: 'Wiggle'
                        }
                    }
                }
            }
        };

        private margin: IMargin = { left: 45, right: 30, bottom: 25, top: 25 };

        private viewport: IViewport;

        private svg: D3.Selection;
        private xAxis: D3.Selection;
        private yAxis: D3.Selection;
        private colors: IDataColorPalette;
        private selectionManager: utility.SelectionManager;
        private dataView: DataView;
        private legend: ILegend;

        public converter(dataView: DataView, colors: IDataColorPalette): StreamData {
            if (!dataView ||
                !dataView.categorical ||
                !dataView.categorical.values ||
                !dataView.categorical.categories) {
                    return null;
            }                
            var catDv: DataViewCategorical = dataView.categorical,
                values: DataViewValueColumns = catDv.values,
                dataPoints: StreamDataPoint[][] = [],
                legendData: LegendData = {
                    dataPoints: [],
                    title: values[0].source.displayName,
                    fontSize: parseInt(this.fontSize, 10) * 3 / 4
                },
                categoriesValues: any[] = [],
                value: number = 0,
                valueFormatter: IValueFormatter;

            for (var i = 0, iLen = values.length; i < iLen; i++) {
                dataPoints.push([]);

                if (values[i].source.groupName) {
                    legendData.dataPoints.push({
                        label: values[i].source.groupName,
                        color: colors.getColorByIndex(i).value,
                        icon: LegendIcon.Box,
                        selected: false,
                        identity: SelectionId.createWithId(values[i].identity)
                    });
                }

                for (var k = 0, kLen = values[i].values.length; k < kLen; k++) {
                    var id: SelectionId = SelectionIdBuilder
                        .builder()
                        .withSeries(dataView.categorical.values, dataView.categorical.values[i])
                        .createSelectionId(),
                        y: number = values[i].values[k];

                    if (y > value) {
                        value = y;
                    }

                    dataPoints[i].push({
                        x: k,
                        y: y,
                        identity: id
                    });
                }
            }

            valueFormatter = ValueFormatter.create({
                format: "g",
                value: value
            });

            if (catDv.categories &&
                catDv.categories[0] &&
                catDv.categories[0].values) {
                categoriesValues = catDv.categories[0].values;
            }

            return {
                dataPoints: dataPoints,
                legendData: legendData,
                valueFormatter: valueFormatter,
                axisXData: this.parseAxisXData(
                    catDv.categories[0].source,
                    categoriesValues)
            };
        }

        private parseAxisXData(source: DataViewMetadataColumn, values: any[]): StreamAxisXData {
            var maxNumverOfValues: number = StreamGraph.MaxNumberOfAxisXValues;

            if (!values || !(values.length > 0)) {
                return {
                    valueFormatter: null,
                    values: [],
                    maxNumverOfValues: maxNumverOfValues
                };
            }

            var scale: D3.Scale.LinearScale | D3.Scale.TimeScale | D3.Scale.OrdinalScale,
                valueFormatter: IValueFormatter = ValueFormatter.create({
                    format: ValueFormatter.getFormatString(
                        source,
                        StreamGraph.Properties["general"]["formatString"]),
                    value: values[0]
                }),
                range: any[] = [this.margin.left, this.viewport.width - this.margin.right],
                filteredValues: any[] = values;

            if (source.type.dateTime) {
                scale = d3.time.scale();

                scale.domain([values[0], values[values.length - 1]]);
                scale.range(range);
            } else if (source.type.numeric) {
                scale = d3.scale.linear();

                scale.domain([values[0], values[values.length - 1]]);
                scale.range(range);
            } else {
                scale = d3.scale.ordinal();
                scale.domain(values);
                (<D3.Scale.OrdinalScale>scale).rangePoints(range);
            }

            return {
                valueFormatter: valueFormatter,
                values: filteredValues,
                maxNumverOfValues: maxNumverOfValues,
                scale: scale
            };
        }

        public init(options: VisualInitOptions): void {
            var element: JQuery = options.element;

            this.selectionManager = new SelectionManager({ hostServices: options.host });

            this.svg = d3.select(element.get(0))
                .append('svg')
                .classed(StreamGraph.VisualClassName, true);

            this.xAxis = this.svg.append("g");
            this.yAxis = this.svg.append("g");

            this.colors = options.style.colorPalette.dataColors;

            this.legend = createLegend(element, false, null, true);
        }

        public update(options: VisualUpdateOptions): void {
            if (!options.dataViews || !options.dataViews[0]) {
                return;
            };

            this.viewport = {
				width: Math.max(0, options.viewport.width),
				height: Math.max(0, options.viewport.height)
			};

            var duration: number = options.suppressAnimations ? 0 : 250,
                dataView: DataView = this.dataView = options.dataViews[0],
                data: StreamData = this.converter(dataView, this.colors);            

            if (!data || !data.dataPoints || !data.dataPoints.length) {
                this.svg.selectAll(StreamGraph.Layer.selector).remove();

                return;
            }
            
            var dataPoints: StreamDataPoint[][] = data.dataPoints;

            this.legend.changeOrientation(LegendPosition.Top);
            this.legend.drawLegend(data.legendData, this.viewport);

            var height: number = Math.max(0, options.viewport.height - this.margin.top);

            this.svg.attr({
                'width': this.viewport.width,
                'height': height
            });

            var stack: D3.Layout.StackLayout = d3.layout.stack();

            if (this.getWiggle(dataView)) {
                stack.offset('wiggle');
            }

            var layers: StreamDataPoint[][] = stack(dataPoints);

            var xScale: D3.Scale.LinearScale = d3.scale.linear()
                .domain([0, dataPoints[0].length - 1])
                .range([this.margin.left, this.viewport.width - this.margin.right]);

            var yScale: D3.Scale.LinearScale = d3.scale.linear()
                .domain([0, d3.max(layers, (layer) => {
                    return d3.max(layer, (d) => {
                        return d.y0 + d.y;
                    });
                })])
                .range([height - this.margin.bottom, this.margin.top]);

            var area: D3.Svg.Area = d3.svg.area()
                .interpolate('basis')
                .x(d => xScale(d.x))
                .y0(d => yScale(d.y0))
                .y1(d => yScale(d.y0 + d.y));

            var selectionManager: SelectionManager = this.selectionManager;

            var selection: D3.UpdateSelection = this.svg.selectAll(StreamGraph.Layer.selector)
                .data(layers);

            selection.enter()
                .append('path')
                .classed(StreamGraph.Layer["class"], true);

            selection
                .style("fill", (d, i) => this.colors.getColorByIndex(i).value)
                .on('click', function (d) {
                    selectionManager.select(d[0].identity).then(ids=> {
                        if (ids.length > 0) {
                            selection.style('opacity', 0.5);
                            d3.select(this).style('opacity', 1);
                        } else {
                            selection.style('opacity', 1);
                        }
                    });
                })
                .transition()
                .duration(duration)
                .attr("d", area);

            selection.exit().remove();

            this.drawAxis(data, yScale);
        }

        private drawAxis(data: StreamData, yScale: D3.Scale.LinearScale) {
            var shiftY: number = this.viewport.height - this.margin.bottom - this.margin.top,
                shiftX: number = this.viewport.width - this.margin.left - this.margin.right,
                textPropertiesFunction = this.getTextPropertiesFunction(),
                xAxis: D3.Svg.Axis = d3.svg.axis();

            xAxis.scale(data.axisXData.scale)
                .orient("bottom")
                .tickFormat(((item: any, index: number): any => {
                    if (data.axisXData.valueFormatter) {
                        item = data.axisXData.valueFormatter.format(item);
                    }

                    if (index != null && xAxis.tickValues() &&
                        (index === 0 || index === xAxis.tickValues().length - 1)) {
                        item = TextMeasurementService.getTailoredTextOrDefault(
                            textPropertiesFunction(item),
                            (index ? this.margin.right : this.margin.left) * 2);
                    }

                    return item;
                }).bind(xAxis));

            var yAxis: D3.Svg.Axis = d3.svg.axis()
                .scale(yScale)
                .orient("left")
                .tickFormat((item: any): any => {
                    if (data.valueFormatter) {
                        return data.valueFormatter.format(item);
                    }

                    return item;
                });

            this.setMaxTicks(xAxis, shiftX, data.axisXData.maxNumverOfValues);
            this.setMaxTicks(yAxis, shiftY);

            this.xAxis.attr("class", "x axis")
                .attr("transform", SVGUtil.translate(0, shiftY))
                .call(xAxis);

            this.yAxis.attr("class", "y axis")
                .attr("transform", SVGUtil.translate(this.margin.left, 0))
                .call(yAxis);
        }

        private setMaxTicks(axis: D3.Svg.Axis, maxSize: number, maxValue?: number): void {
            var maxTicks = maxValue === undefined
                ? this.getTicksByAxis(axis).length
                : Math.min(maxValue, this.getTicksByAxis(axis).length);

            if (axis.scale().domain.toString() === d3.scale.linear().domain.toString()) {
                axis.ticks(this.getFittedTickLength(axis, maxSize, maxTicks));
            }
            else {
                axis.tickValues(this.getFittedTickValues(axis, maxSize, maxTicks));
            }
        }

        private getFittedTickLength(axis: D3.Svg.Axis, maxSize: number, maxTicks: number): number {
            for (var ticks: any[] = this.getTicksByAxis(axis), measureTickFunction = this.getMeasureTickFunction(axis, ticks);
                maxTicks > 0 && maxSize > 0 && (this.measureTicks(ticks, measureTickFunction) > maxSize || axis.scale().ticks([maxTicks]).length > maxTicks);
                maxTicks--, ticks = this.getTicksByAxis(axis)) {
                axis.ticks(maxTicks);
            }

            return maxTicks;
        }

        private getFittedTickValues(axis: D3.Svg.Axis, maxSize: number, maxTicks: number): any[] {
            var ticks: any[] = this.getTicksByAxis(axis),
                measureTickFunction: (any) => number = this.getMeasureTickFunction(axis, ticks);

            for (var currentMaxTicks: number = maxTicks, indexes: number[] = [];
                maxTicks > 0 && maxSize > 0;
                currentMaxTicks-- , indexes = []) {
                switch (currentMaxTicks) {
                    case 0:
                        return [];
                    case 1:
                        indexes = [0];
                        break;
                    case 2:
                        indexes = [0, ticks.length - 1];
                        break;
                    default:
                        var takeEvery: number = ticks.length / (currentMaxTicks - 1);

                        for (var i = 0; i < currentMaxTicks - 1; i++) {
                            indexes.push(Math.round(takeEvery * i));
                        }

                        indexes.push(ticks.length - 1);
                        break;
                }

                var ticksIndexes: any[][] = indexes.map(x => [ticks[x], x]),
                    maxWidthOf2Ticks: number = (maxSize / ticks.length) * 2,
                    tickPairsWidths: any[] = [];

                ticksIndexes.reduce((a, b) => {
                    tickPairsWidths.push([measureTickFunction(a[0]) + measureTickFunction(b[0]), (b[1] - a[1]) * maxWidthOf2Ticks]);
                    return b;
                });

                if (!tickPairsWidths.some(x => x[0] > x[1])) {
                    return ticksIndexes.map(x => x[0]);
                }
            }

            return [];
        }

        private measureTicks(ticks: any[], measureTickFunction: (number) => any): number {
            return ticks.map((x: any) => measureTickFunction(x)).reduce((a: number, b: number) => a + b);
        }

        private getTicksByAxis(axis: D3.Svg.Axis): any[] {
            var scale = axis.scale();
            var result: any = axis.tickValues() === null
                ? scale.ticks
                    ? scale.ticks.apply(scale, axis.ticks())
                    : scale.domain()
                : axis.tickValues();

            return result.length === undefined ? [result] : result;
        }

        private getMeasureTickFunction(axis: D3.Svg.Axis, ticks: string[]): (number) => any {
            var measureFunction = axis.orient() === "top" || axis.orient() === "bottom"
                ? TextMeasurementService.measureSvgTextWidth
                : TextMeasurementService.measureSvgTextHeight;

            var textPropertiesFunction: (string) => TextProperties = this.getTextPropertiesFunction(),
                cache = {};

            return function (x: any): number {
                return cache[x]
                    ? cache[x]
                    : cache[x] = measureFunction(textPropertiesFunction(axis.tickFormat()(x))) + axis.tickPadding();
            };
        }

        private getTextPropertiesFunction(): (string) => TextProperties {
            var fontFamily: string = this.fontFamily,
                fontSize: string = this.fontSize,
                fontWeight: string = this.fontWeight;

            return function (text: string): TextProperties {
                return { text: text, fontFamily: fontFamily, fontSize: fontSize, fontWeight: fontWeight };
            };
        }

        private get fontSize(): string {
            return this.svg.style('font-size');
        }

        private get fontFamily(): string {
            return this.svg.style('font-family');
        }

        private get fontWeight(): string {
            return this.svg.style('font-weight');
        }

        private getWiggle(dataView: DataView) {
            if (dataView) {
                var objects = dataView.metadata.objects;

                if (objects) {
                    var general = objects['general'];

                    if (general) {
                        return <boolean>general['wiggle'];
                    }
                }
            }

            return true;
        }

        public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstance[] {
            var instances: VisualObjectInstance[] = [],
                dataView = this.dataView;

            switch (options.objectName) {
                case 'general':
                    var general: VisualObjectInstance = {
                        objectName: 'general',
                        displayName: 'General',
                        selector: null,
                        properties: {
                            wiggle: this.getWiggle(dataView)
                        }
                    };

                    instances.push(general);
                    break;
            }

            return instances;
        }

    }
}
