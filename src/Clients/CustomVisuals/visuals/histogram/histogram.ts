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

/// <reference path="../../_references.ts" />

module powerbi.visuals.samples {
    import SelectionManager = utility.SelectionManager;
    import ValueFormatter = powerbi.visuals.valueFormatter;
    import ClassAndSelector = jsCommon.CssConstants.ClassAndSelector;
    import getAnimationDuration = AnimatorCommon.GetAnimationDuration;

    type D3Element =
        D3.UpdateSelection |
        D3.Selection |
        D3.Selectors |
        D3.Transition.Transition;

    export interface HistogramConstructorOptions {
        svg?: D3.Selection;
        animator?: IGenericAnimator;
        margin?: IMargin;
    }

    export interface HistogramSettings {
        displayName?: string;
        fillColor?: string;
        frequency: boolean;
        bins?: number;
        precision: number;
    }

    export interface HistogramData extends D3.Layout.Bin, TooltipEnabledDataPoint {
        range: number[];
        selectionIds: SelectionId[];
    }

    export interface HistogramDataView {
        data: HistogramData[];
        xScale?: D3.Scale.LinearScale;
        yScale?: D3.Scale.LinearScale;
        settings: HistogramSettings;
        formatter: IValueFormatter;
    }

    interface HistogramValue {
        value: number;
        selectionId: SelectionId;
        frequency: number;
    }

    interface Legend {
        text: string;
        transform?: string;
        dx?: string;
        dy?: string;
    }

    interface Brackets {
        left: string;
        right: string;
    }

    interface HistogramProperty {
        [propertyName: string]: DataViewObjectPropertyIdentifier;
    }

    interface HistogramProperties {
        [objectName: string]: HistogramProperty;
    }

    export class HistogramChartWarning implements IVisualWarning {
        public static ErrorInvalidDataValues: string = "Some data values are invalid or too big";

        private message: string;
        constructor(message: string) {
            this.message = message;
        }

        public get code(): string {
            return "BulletChartWarning";
        }

        public getMessages(resourceProvider: jsCommon.IStringResourceProvider): IVisualErrorMessage {
            return {
                message: this.message,
                title: resourceProvider.get(""),
                detail: resourceProvider.get("")
            };
        }
    }

    export class Histogram implements IVisual {
        private static ClassName: string = "histogram";
        private static FrequencyText: string = "Frequency";
        private static DensityText: string = "Density";

        private static Properties: HistogramProperties = {
            general: {
                bins: {
                    objectName: "general",
                    propertyName: "bins"
                },
                frequency: {
                    objectName: "general",
                    propertyName: "frequency"
                },
                formatString: {
                    objectName: "general",
                    propertyName: "formatString"
                }
            },
            dataPoint: {
                fill: {
                    objectName: "dataPoint",
                    propertyName: "fill"
                }
            },
            labels: {
                labelPrecision: {
                    objectName: "labels",
                    propertyName: "labelPrecision"
                }
            }
        };

        private static DefaultHistogramSettings: HistogramSettings = {
            frequency: true,
            displayName: "Histogram",
            bins: null,
            fillColor: "cadetblue",
            precision: 2
        };

        private static Axes: ClassAndSelector = {
            "class": "axes",
            selector: ".axes"
        };

        private static Axis: ClassAndSelector = {
            "class": "axis",
            selector: ".axis"
        };

        private static Columns: ClassAndSelector = {
            "class": "columns",
            selector: ".columns"
        };

        private static Column: ClassAndSelector = {
            "class": "column",
            selector: ".column"
        };

        private static Legends: ClassAndSelector = {
            "class": "legends",
            selector: ".legends"
        };

        private static Legend: ClassAndSelector = {
            "class": "legend",
            selector: ".legend"
        };

        public static capabilities: VisualCapabilities = {
            dataRoles: [{
                name: "Values",
                kind: VisualDataRoleKind.Grouping,
                displayName: data.createDisplayNameGetter("Role_DisplayName_Values")
            }, {
                name: "Frequency",
                kind: VisualDataRoleKind.Measure,
                displayName: "Frequency"
            }],
            dataViewMappings: [{
                conditions: [{ "Values": { min: 1, max: 1 }, "Frequency": { min: 0, max: 1 } }],
                categorical: {
                    categories: {
                        bind: { to: "Values" },
                        dataReductionAlgorithm: { top: {} }
                    },
                    values: { for: { in: "Frequency" } }
                }
            }],
            sorting: {
                implicit: {
                    clauses: [{ role: "Values", direction: 1 /*SortDirection.Ascending*/ }] //Constant SortDirection.Ascending currently is not supported on the msit
                }
            },
            objects: {
                general: {
                    displayName: data.createDisplayNameGetter("Visual_General"),
                    properties: {
                        formatString: { type: { formatting: { formatString: true } } },
                        bins: {
                            displayName: "Bins",
                            type: { numeric: true }
                        },
                        frequency: {
                            displayName: "Frequency",
                            type: { bool: true }
                        }
                    },
                },
                dataPoint: {
                    displayName: data.createDisplayNameGetter("Visual_DataPoint"),
                    properties: {
                        fill: {
                            displayName: data.createDisplayNameGetter('Visual_Fill'),
                            type: { fill: { solid: { color: true } } }
                        }
                    }
                },
                labels: {
                    displayName: data.createDisplayNameGetter('Visual_DataPointsLabels'),
                    properties: {
                        labelPrecision: {
                            displayName: data.createDisplayNameGetter('Visual_Precision'),
                            type: { numeric: true }
                        }
                    }
                }
            }
        };

        private ColumnPadding: number = 1;
        private MinColumnHeight: number = 1;
        private MinOpacity: number = 0.3;
        private MaxOpacity: number = 1;
        private NumberOfLabelsOnAxisY: number = 5;
        private MinNumberOfBins: number = 0;
        private MaxNumberOfBins: number = 100;
        private MinPrecision: number = 0;
        private MaxPrecision: number = 17; // max number of decimals in float
        private TooltipDisplayName: string = "Range";
        private SeparatorNumbers: string = ", ";
        private LegendSize: number = 50;
        private AxisSize: number = 30;

        private ExcludeBrackets: Brackets = {
            left: "(",
            right: ")"
        };

        private IncludeBrackets: Brackets = {
            left: "[",
            right: "]"
        };

        private margin: IMargin = {
            top: 10,
            right: 10,
            bottom: 10,
            left: 10
        };

        private durationAnimations: number = 200;

        private viewport: IViewport;
        private hostService: IVisualHostServices;
        private selectionManager: SelectionManager;
        private colors: IDataColorPalette;

        private root: D3.Selection;
        private svg: D3.Selection;
        private main: D3.Selection;
        private axes: D3.Selection;
        private axisX: D3.Selection;
        private axisY: D3.Selection;
        private legend: D3.Selection;
        private columns: D3.Selection;

        private histogramDataView: HistogramDataView;

        private animator: IGenericAnimator;

        private get columnsSelection(): D3.Selection {
            return this.main.select(Histogram.Columns.selector)
                .selectAll(Histogram.Column.selector);
        }

        constructor(histogramConstructorOptions?: HistogramConstructorOptions) {
            if (histogramConstructorOptions) {
                if (histogramConstructorOptions.svg) {
                    this.svg = histogramConstructorOptions.svg;
                }

                if (histogramConstructorOptions.animator) {
                    this.animator = histogramConstructorOptions.animator;
                }

                this.margin = histogramConstructorOptions.margin || this.margin;
            }
        }

        public init(visualsOptions: VisualInitOptions): void {
            this.hostService = visualsOptions.host;

            if (this.svg) {
                this.root = this.svg;
            } else {
                this.root = d3.select(visualsOptions.element.get(0))
                    .append("svg");
            }

            var style: IVisualStyle = visualsOptions.style;

            this.colors = style && style.colorPalette
                ? style.colorPalette.dataColors
                : new DataColorPalette();

            this.root.classed(Histogram.ClassName, true);

            this.main = this.root.append("g");

            this.axes = this.main
                .append("g")
                .classed(Histogram.Axes["class"], true);

            this.axisX = this.axes
                .append("g")
                .classed(Histogram.Axis["class"], true);

            this.axisY = this.axes
                .append("g")
                .classed(Histogram.Axis["class"], true);

            this.legend = this.main
                .append("g")
                .classed(Histogram.Legends["class"], true);

            this.columns = this.main
                .append("g")
                .classed(Histogram.Columns["class"], true);

            this.selectionManager = new SelectionManager({ hostServices: visualsOptions.host });
        }

        public converter(dataView: DataView): HistogramDataView {
            if (!dataView ||
                !dataView.categorical ||
                !dataView.categorical.categories ||
                !dataView.categorical.categories[0] ||
                !dataView.categorical.categories[0].values ||
                !(dataView.categorical.categories[0].values.length > 0)) {
                return null;
            }

            var settings: HistogramSettings,
                histogramLayout: D3.Layout.HistogramLayout,
                values: HistogramValue[],
                numericalValues: number[] = [],
                data: D3.Layout.Bin[],
                xScale: D3.Scale.LinearScale,
                yScale: D3.Scale.LinearScale,
                valueFormatter: IValueFormatter,
                frequencies: number[] = [],
                identities: DataViewScopeIdentity[] = [],
                shiftByValues: number = 0,
                sumFrequency: number = 0;

            if (dataView.categorical.values &&
                dataView.categorical.values[0] &&
                dataView.categorical.values[0].values) {
                frequencies = dataView.categorical.values[0].values;
            }

            if (dataView.categorical.categories[0].identity
                && dataView.categorical.categories[0].identity.length > 0) {
                identities = dataView.categorical.categories[0].identity;
            }

            settings = this.parseSettings(dataView);

            if (!settings) {
                return null;
            }

            values = this.getValuesByFrequencies(
                dataView.categorical.categories[0].values,
                frequencies,
                identities);

            values.forEach((value: HistogramValue) => {
                numericalValues.push(value.value);

                sumFrequency += value.frequency;
            });

            histogramLayout = d3.layout.histogram();

            if (settings.bins && settings.bins > this.MinNumberOfBins) {
                histogramLayout = histogramLayout.bins(settings.bins);
            }

            data = histogramLayout.frequency(settings.frequency)(numericalValues);

            data.forEach((bin: D3.Layout.Bin, index: number) => {
                var filteredValues: HistogramValue[],
                    frequency: number;

                filteredValues = values.filter((value: HistogramValue) => {
                    return this.isValueContainedInRange(value, bin, index);
                });

                frequency = filteredValues.reduce((previousValue: number, currentValue: HistogramValue): number => {
                    return previousValue + currentValue.frequency;
                }, 0);

                bin.y = settings.frequency
                    ? frequency
                    : frequency / sumFrequency;

                shiftByValues += bin.length;
            });

            xScale = d3.scale.linear()
                .domain([
                    d3.min(data, (item: D3.Layout.Bin) => d3.min(item)),
                    d3.max(data, (item: D3.Layout.Bin) => d3.max(item))
                ])
                .range([0, this.viewport.width - this.LegendSize - this.AxisSize]);

            yScale = d3.scale.linear()
                .domain([
                    0,
                    d3.max(data, (item: D3.Layout.Bin) => item.y)
                ])
                .range([this.viewport.height - this.LegendSize, 0]);

            valueFormatter = ValueFormatter.create({
                format: ValueFormatter.getFormatString(
                    dataView.categorical.categories[0].source, Histogram.Properties["general"]["formatString"]),
                value: values[0].value,
                value2: values[values.length - 1].value,
                precision: settings.precision
            });

            return {
                xScale: xScale,
                yScale: yScale,
                settings: settings,
                data: this.getData(values, numericalValues, data, settings, valueFormatter),
                formatter: valueFormatter
            };
        }

        private getValuesByFrequencies(sourceValues: number[], frequencies: number[], identities: DataViewScopeIdentity[]): HistogramValue[] {
            var values: HistogramValue[] = [];

            sourceValues.forEach((item: number, index: number) => {
                var frequency: number = 1,
                    value: number = Number(item);

                value = isNaN(value) ? 0 : value;

                if (frequencies
                    && frequencies[index]
                    && !isNaN(frequencies[index])
                    && frequencies[index] > 1) {
                    frequency = frequencies[index];
                }

                values.push({
                    value: value,
                    frequency: frequency,
                    selectionId: SelectionId.createWithId(identities[index])
                });
            });

            return values;
        }

        private getData(
            values: HistogramValue[],
            numericalValues: number[],
            data: D3.Layout.Bin[],
            settings: HistogramSettings,
            valueFormatter: IValueFormatter): HistogramData[] {
            var minValue: number = d3.min(numericalValues),
                maxValue: number = d3.max(numericalValues);

            return data.map((bin: HistogramData, index: number): HistogramData => {
                bin.range = this.getRange(minValue, maxValue, bin.dx, index);
                bin.tooltipInfo = this.getTooltipData(bin.y, bin.range, settings, index === 0, valueFormatter);
                bin.selectionIds = this.getSelectionIds(values, bin, index);

                return bin;
            });
        }

        private getRange(minValue: number, maxValue: number, step: number, index: number): number[] {
            var leftBorder: number = minValue + index * step,
                rightBorder: number = leftBorder + step;

            return [leftBorder, rightBorder];
        }

        private getTooltipData(
            value: number,
            range: number[],
            settings: HistogramSettings,
            includeLeftBorder: boolean,
            valueFormatter: IValueFormatter): TooltipDataItem[] {

            return [{
                displayName: this.getLegendText(settings),
                value: valueFormatter.format(value)
            }, {
                displayName: this.TooltipDisplayName,
                value: this.rangeToString(range, includeLeftBorder, valueFormatter)
            }];
        }

        private getSelectionIds(values: HistogramValue[], bin: HistogramData, index: number): SelectionId[] {
            var selectionIds: SelectionId[] = [];

            values.forEach((value: HistogramValue) => {
                if (this.isValueContainedInRange(value, bin, index)) {
                    selectionIds.push(value.selectionId);
                }
            });

            return selectionIds;
        }

        private isValueContainedInRange(value: HistogramValue, bin: D3.Layout.Bin, index: number): boolean {
            return ((index === 0 && value.value >= bin.x) || (value.value > bin.x)) && value.value <= bin.x + bin.dx;
        }

        private parseSettings(dataView: DataView): HistogramSettings {
            if (!dataView ||
                !dataView.metadata ||
                !dataView.metadata.columns ||
                !dataView.metadata.columns[0]) {
                return null;
            }

            var histogramSettings: HistogramSettings = <HistogramSettings>{},
                objects: DataViewObjects,
                colorHelper: ColorHelper;

            colorHelper = new ColorHelper(
                this.colors,
                Histogram.Properties["dataPoint"]["fill"],
                Histogram.DefaultHistogramSettings.fillColor);

            histogramSettings.displayName = Histogram.DefaultHistogramSettings.displayName;
            histogramSettings.fillColor = Histogram.DefaultHistogramSettings.fillColor;
            histogramSettings.bins = Histogram.DefaultHistogramSettings.bins;
            histogramSettings.frequency = Histogram.DefaultHistogramSettings.frequency;
            histogramSettings.displayName =
                dataView.metadata.columns[0].displayName || Histogram.DefaultHistogramSettings.displayName;

            objects = this.getObjectsFromDataView(dataView);

            if (objects) {
                histogramSettings.fillColor = colorHelper.getColorForMeasure(objects, "");
                histogramSettings.bins = this.getBins(objects);
                histogramSettings.frequency = this.getFrequency(objects);
                histogramSettings.precision = this.getPrecision(objects);
            }

            return histogramSettings;
        }

        private getBins(objects: DataViewObjects): number {
            var binsNumber: number;

            binsNumber = Number(DataViewObjects.getValue<number>(
                objects,
                Histogram.Properties["general"]["bins"],
                Histogram.DefaultHistogramSettings.bins));

            if (!binsNumber || isNaN(binsNumber) || binsNumber <= this.MinNumberOfBins) {
                return Histogram.DefaultHistogramSettings.bins;
            }

            if (binsNumber > this.MaxNumberOfBins) {
                return this.MaxNumberOfBins;
            }

            return binsNumber;
        }

        private getFrequency(objects: DataViewObjects): boolean {
            return DataViewObjects.getValue<boolean>(
                objects,
                Histogram.Properties["general"]["frequency"],
                Histogram.DefaultHistogramSettings.frequency);
        }

        private getPrecision(objects: DataViewObjects): number {
            var precision: number = DataViewObjects.getValue(
                objects,
                Histogram.Properties["labels"]["labelPrecision"],
                Histogram.DefaultHistogramSettings.precision);

            if (precision <= this.MinPrecision) {
                return this.MinPrecision;
            }

            if (precision >= this.MaxPrecision) {
                return this.MaxPrecision;
            }

            return precision;
        }

        public validateData(data: HistogramDataView): boolean {
            if (data && data.data.some(x=> x.range.some(x => isNaN(x) || x === Infinity || x === -Infinity))) {
                this.hostService.setWarnings([new HistogramChartWarning(HistogramChartWarning.ErrorInvalidDataValues)]);
                return false;
            }

            return true;
        }

        public update(visualUpdateOptions: VisualUpdateOptions): void {
            if (!visualUpdateOptions ||
                !visualUpdateOptions.dataViews ||
                !visualUpdateOptions.dataViews[0]) {
                return;
            }

            var dataView: DataView = visualUpdateOptions.dataViews[0];

            this.durationAnimations = getAnimationDuration(
                this.animator,
                visualUpdateOptions.suppressAnimations);

            this.setSize(visualUpdateOptions.viewport);

            this.histogramDataView = this.converter(dataView);
            if (!this.validateData(this.histogramDataView)) {
                this.histogramDataView.data = [];
            }

            this.render();
        }

        private setSize(viewport: IViewport): void {
            var height: number,
                width: number;

            height = viewport.height -
                this.margin.top -
                this.margin.bottom;

            width = viewport.width -
                this.margin.left -
                this.margin.right;

            this.viewport = {
                height: height,
                width: width
            };

            this.updateElements(viewport.height, viewport.width);
        }

        private updateElements(height: number, width: number): void {
            var shiftToRight: number = this.margin.left + this.LegendSize;

            this.root.attr({
                "height": height,
                "width": width
            });

            this.main.attr("transform", SVGUtil.translate(this.margin.left, this.margin.top));

            this.legend.attr("transform", SVGUtil.translate(this.margin.left, this.margin.top));

            this.columns.attr("transform", SVGUtil.translate(shiftToRight, 0));

            this.axes.attr("transform", SVGUtil.translate(shiftToRight, 0));

            this.axisX.attr(
                "transform",
                SVGUtil.translate(0, this.viewport.height - this.LegendSize));
        }

        private render(): void {
            if (!this.histogramDataView || !this.histogramDataView.settings) {
                return;
            }

            this.renderAxes();
            var columnsSelection: D3.UpdateSelection = this.renderColumns();
            this.renderLegend();

            this.bindSelectionHandler(columnsSelection);
        }

        private renderColumns(): D3.UpdateSelection {
            var data: HistogramData[] = this.histogramDataView.data,
                yScale: D3.Scale.LinearScale = this.histogramDataView.yScale,
                countOfValues: number = data.length,
                widthOfColumn: number,
                updateColumnsSelection: D3.UpdateSelection;

            widthOfColumn = countOfValues && ((this.viewport.width - this.AxisSize - this.LegendSize) / countOfValues - this.ColumnPadding);

            if (widthOfColumn < 0) {
                widthOfColumn = 0;
            }

            updateColumnsSelection = this.columnsSelection.data(data);

            updateColumnsSelection
                .enter()
                .append("svg:rect");

            updateColumnsSelection
                .attr("x", this.ColumnPadding / 2)
                .attr("width", widthOfColumn)
                .attr("height", (item: HistogramData) => this.getColumnHeight(item, yScale))
                .style("fill", this.histogramDataView.settings.fillColor)
                .attr("class", Histogram.Column["class"])
                .attr("transform", (item: HistogramData, index: number) => SVGUtil.translate(
                    widthOfColumn * index + this.ColumnPadding * index,
                    yScale(item.y) - this.ColumnPadding / 2.5));

            if (countOfValues) {
                //if data is empty, it throws for some reason
                updateColumnsSelection.classed(Histogram.Column["class"]);
            }

            updateColumnsSelection.exit().remove();

            this.renderTooltip(updateColumnsSelection);

            return updateColumnsSelection;
        }

        private renderTooltip(selection: D3.UpdateSelection): void {
            TooltipManager.addTooltip(selection, (tooltipEvent: TooltipEvent) => {
                return (<HistogramData> tooltipEvent.data).tooltipInfo;
            });
        }

        private getColumnHeight(column: D3.Layout.Bin, y: D3.Scale.LinearScale): number {
            var height: number = this.viewport.height - this.LegendSize - y(column.y);

            return height > 0 ? height : this.MinColumnHeight;
        }

        private renderAxes(): void {
            var xScale: D3.Scale.LinearScale = this.histogramDataView.xScale,
                yScale: D3.Scale.LinearScale = this.histogramDataView.yScale,
                valueFormatter: IValueFormatter = this.histogramDataView.formatter,
                xAxis: D3.Svg.Axis,
                yAxis: D3.Svg.Axis;

            xAxis = d3.svg.axis()
                .scale(xScale)
                .orient("bottom")
                .tickValues(this.rangesToArray(this.histogramDataView.data))
                .tickFormat((item: number) => valueFormatter.format(item));

            yAxis = d3.svg.axis()
                .scale(yScale)
                .orient("left")
                .ticks(this.NumberOfLabelsOnAxisY);

            this.axisX.call(xAxis);

            this.axisY.call(yAxis);
        }

        private rangesToArray(data: HistogramData[]): number[] {
            return data.reduce((previousValue: number[], currentValue: HistogramData, index: number) => {
                var range: number[];

                range = index === 0
                    ? currentValue.range
                    : currentValue.range.slice(1);

                return previousValue.concat(range);
            }, []);
        }

        private rangeToString(range: number[], includeLeftBorder: boolean, valueFormatter: IValueFormatter): string {
            var leftBracket: string,
                rightBracket: string = this.IncludeBrackets.right,
                leftBorder: string = valueFormatter.format(range[0]),
                rightBorder: string = valueFormatter.format(range[1]);

            leftBracket = includeLeftBorder
                ? this.IncludeBrackets.left
                : this.ExcludeBrackets.left;

            return `${leftBracket}${leftBorder}${this.SeparatorNumbers}${rightBorder}${rightBracket}`;
        }

        private renderLegend(): void {
            var legendElements: D3.Selection,
                legendSelection: D3.UpdateSelection,
                datalegends: Legend[] = this.getDataLegends(this.histogramDataView.settings);

            legendElements = this.main
                .select(Histogram.Legends.selector)
                .selectAll(Histogram.Legend.selector);

            legendSelection = legendElements.data(datalegends);

            legendSelection
                .enter()
                .append("svg:text");

            legendSelection
                .attr("x", 0)
                .attr("y", 0)
                .attr("dx", (item: Legend) => item.dx)
                .attr("dy", (item: Legend) => item.dy)
                .attr("transform", (item: Legend) => item.transform)
                .attr("class", Histogram.Legend["class"])
                .text((item: Legend) => item.text)
                .classed(Histogram.Legend["class"], true);

            legendSelection
                .exit()
                .remove();
        }

        private getDataLegends(settings: HistogramSettings): Legend[] {
            var bottomLegendText: string = this.getLegendText(settings);

            return [{
                transform: SVGUtil.translate(
                    this.viewport.width / 2,
                    this.viewport.height),
                text: settings.displayName,
                dx: "1em",
                dy: "-1em"
            }, {
                transform: SVGUtil.translateAndRotate(
                    0,
                    this.viewport.height / 2,
                    0,
                    0,
                    270),
                text: bottomLegendText,
                dx: "3em"
            }];
        }

        private getLegendText(settings: HistogramSettings): string {
            return settings.frequency
                ? Histogram.FrequencyText
                : Histogram.DensityText;
        }

        private bindSelectionHandler(columnsSelection: D3.UpdateSelection): void {
            this.setSelection(columnsSelection);

            columnsSelection.on("click", (data: HistogramData) => {
                this.selectionManager.clear();

                data.selectionIds.forEach((selectionId: SelectionId) => {
                    this.selectionManager.select(selectionId, true).then((selectionIds: SelectionId[]) => {
                        if (selectionIds.length > 0) {
                            this.setSelection(columnsSelection, data);
                        } else {
                            this.setSelection(columnsSelection);
                        }
                    });
                });

                d3.event.stopPropagation();
            });

            this.root.on("click", () => {
                this.selectionManager.clear();
                this.setSelection(columnsSelection);
            });
        }

        private setSelection(columnsSelection: D3.UpdateSelection, data?: HistogramData): void {
            columnsSelection.transition()
                .duration(this.durationAnimations)
                .style("fill-opacity", this.MaxOpacity);

            if (!data) {
                return;
            }

            columnsSelection
                .filter((columnSelection: HistogramData) => {
                    return columnSelection !== data;
                })
                .transition()
                .duration(this.durationAnimations)
                .style("fill-opacity", this.MinOpacity);
        }

        public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstance[] {
            var instances: VisualObjectInstance[] = [],
                settings: HistogramSettings;

            if (!this.histogramDataView ||
                !this.histogramDataView.settings) {
                return instances;
            }

            settings = this.histogramDataView.settings;

            switch (options.objectName) {
                case "general": {
                    var general: VisualObjectInstance = {
                        objectName: "general",
                        displayName: "general",
                        selector: null,
                        properties: {
                            bins: settings.bins,
                            frequency: settings.frequency
                        }
                    };

                    instances.push(general);
                    break;
                }
                case "dataPoint": {
                    var dataPoint: VisualObjectInstance = {
                        objectName: "dataPoint",
                        displayName: "dataPoint",
                        selector: null,
                        properties: {
                            fill: settings.fillColor
                        }
                    };

                    instances.push(dataPoint);
                    break;
                }
                case "labels": {
                    var labels: VisualObjectInstance = {
                        objectName: "labels",
                        displayName: "labels",
                        selector: null,
                        properties: {
                            labelPrecision: settings.precision
                        }
                    };

                    instances.push(labels);
                    break;
                }
            }

            return instances;
        }

        private getObjectsFromDataView(dataView: DataView): DataViewObjects {
            if (!dataView ||
                !dataView.metadata ||
                !dataView.metadata.columns ||
                !dataView.metadata.objects) {
                    return null;
            }

            return dataView.metadata.objects;
        }

        public destroy(): void {
            this.root = null;
        }
    }
}