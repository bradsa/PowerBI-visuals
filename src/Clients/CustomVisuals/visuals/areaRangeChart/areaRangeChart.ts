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

/// <reference path="../../_references.ts"/>
module powerbi.visuals.samples {
    import SelectionManager = utility.SelectionManager;
    import ClassAndSelector = jsCommon.CssConstants.ClassAndSelector;
    import createClassAndSelector = jsCommon.CssConstants.createClassAndSelector;
    import AxisScale = powerbi.visuals.axisScale;

    export interface AreaRangeChartConstructorOptions {
        animator?: IGenericAnimator;
    }

    export interface AreaRangeChartSeries extends LineChartSeries {
        name?: string;
        data: AreaRangeChartDataPoint[];
        color: string;
        identity: SelectionId;
    }

    export interface AreaRangeChartDataPoint extends LineChartDataPoint {
        y0?: number;
        y1?: number;
    }

    export interface AreaRangeChartLegend extends DataViewObject {
        show?: boolean;
        showTitle?: boolean;
        titleText?: string;
        position?: LegendPosition;
    }

    export interface AreaRangeChartSettings {
        displayName?: string;
        fillColor?: string;
        precision: number;
        legend?: AreaRangeChartLegend;
        colors?: IColorPalette;
    }

    export interface AreaRangeChartData /*extends LineChartData*/ {
        
        categoryMetadata: DataViewMetadataColumn;
        hasHighlights?: boolean;
        
        
        series: LineChartSeries[];
        isScalar?: boolean;
        dataLabelsSettings: PointDataLabelsSettings;
        axesLabels: ChartAxesLabels;
        hasDynamicSeries?: boolean;
        defaultSeriesColor?: string;
        categoryData?: LineChartCategoriesData[];

        categories: any[];
        legendData?: LegendData;
        xScale?: IAxisProperties;
        xAxisProperties?: IAxisProperties;
        yAxisProperties?: IAxisProperties;
        settings?: AreaRangeChartSettings;
        formatter?: IValueFormatter;
        
        lowerMeasureIndex: number;
        upperMeasureIndex: number;
        

    }
    
    export class AreaRangeChart implements IVisual {

        private static properties = {
            general: {
                formatString: <DataViewObjectPropertyIdentifier>{
                    objectName: "general",
                    propertyName: "formatString"
                }
            },
            legend: {
                show: <DataViewObjectPropertyIdentifier>{ objectName: 'legend', propertyName: 'show' },
                position: <DataViewObjectPropertyIdentifier>{ objectName: 'legend', propertyName: 'position' },
                showTitle: <DataViewObjectPropertyIdentifier>{ objectName: 'legend', propertyName: 'showTitle' },
                titleText: <DataViewObjectPropertyIdentifier>{ objectName: 'legend', propertyName: 'titleText' },
            },
            dataPoint: {
                defaultColor: <DataViewObjectPropertyIdentifier>{ objectName: 'dataPoint', propertyName: 'defaultColor' },
                fill: <DataViewObjectPropertyIdentifier>{ objectName: 'dataPoint', propertyName: 'fill' },
                showAllDataPoints: <DataViewObjectPropertyIdentifier>{ objectName: 'dataPoint', propertyName: 'showAllDataPoints' },
            },
            labels: {
                labelPrecision: <DataViewObjectPropertyIdentifier>{
                    objectName: "labels",
                    propertyName: "labelPrecision"
                }
            }
        };

        private static RoleNames = {
            Category: "Category",
            Series: "Series",
            Lower: "Lower",
            Upper: "Upper",
        };

        public static capabilities: VisualCapabilities = {
            dataRoles: [
                {
                    name: AreaRangeChart.RoleNames.Category,
                    kind: powerbi.VisualDataRoleKind.Grouping,
                    displayName: data.createDisplayNameGetter("Role_DisplayName_Axis"),
                    description: data.createDisplayNameGetter("Role_DisplayName_AxisDescription")
                },
                {
                    name: AreaRangeChart.RoleNames.Series,
                    kind: powerbi.VisualDataRoleKind.Grouping,
                    displayName: data.createDisplayNameGetter("Role_DisplayName_Legend"),
                    description: data.createDisplayNameGetter("Role_DisplayName_LegendDescription")
                },
                {
                    name: AreaRangeChart.RoleNames.Lower,
                    kind: powerbi.VisualDataRoleKind.Measure,
                    displayName: 'Y1'
                },
                {
                    name: AreaRangeChart.RoleNames.Upper,
                    kind: powerbi.VisualDataRoleKind.Measure,
                    displayName: data.createDisplayNameGetter("Role_DisplayName_Y2")
                },
            ],
            dataViewMappings: [
                {
                    conditions: [
                        {
                            "Category": { max: 1 },
                            "Series": { max: 1 },
                            "Lower": { max: 1 },
                            "Upper": { max: 1 }
                        },
                    ],
                    categorical: {
                        categories: {
                            for: { in: AreaRangeChart.RoleNames.Category },
                            dataReductionAlgorithm: { top: {} }
                        },
                        values: {
                            group: {
                                by: AreaRangeChart.RoleNames.Series,
                                select: [
                                    { bind: { to: AreaRangeChart.RoleNames.Lower } },
                                    { bind: { to: AreaRangeChart.RoleNames.Upper } }
                                ]
                            },
                        },
                    }
                }
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
                legend: {
                    displayName: data.createDisplayNameGetter('Visual_Legend'),
                    properties: {
                        show: {
                            displayName: data.createDisplayNameGetter('Visual_Show'),
                            type: { bool: true }
                        },
                        position: {
                            displayName: data.createDisplayNameGetter('Visual_LegendPosition'),
                            type: { formatting: { legendPosition: true } }
                        },
                        showTitle: {
                            displayName: data.createDisplayNameGetter('Visual_LegendShowTitle'),
                            type: { bool: true }
                        },
                        titleText: {
                            displayName: data.createDisplayNameGetter('Visual_LegendTitleText'),
                            type: { text: true }
                        }
                    }
                },
                dataPoint: {
                    displayName: data.createDisplayNameGetter('Visual_DataPoint'),
                    properties: {
                        defaultColor: {
                            displayName: data.createDisplayNameGetter('Visual_DefaultColor'),
                            type: { fill: { solid: { color: true } } }
                        },
                        showAllDataPoints: {
                            displayName: data.createDisplayNameGetter('Visual_DataPoint_Show_All'),
                            type: { bool: true }
                        },
                        fill: {
                            displayName: data.createDisplayNameGetter('Visual_Fill'),
                            type: { fill: { solid: { color: true } } }
                        }
                    }
                },
                label: {
                    displayName: data.createDisplayNameGetter("Label"),
                    properties: {
                        fill: {
                            displayName: data.createDisplayNameGetter("Fill"),
                            type: { fill: { solid: { color: true } } }
                        }
                    }
                }
            }
        };

        private static VisualClassName = 'areaRangeChart';

        private static Chart: ClassAndSelector = createClassAndSelector('chart');
        private static Area: ClassAndSelector = createClassAndSelector('area');
        private static Axis: ClassAndSelector = createClassAndSelector('axis');

        private static DimmedFillOpacity = 0.5;
        private static FillOpacity = 0.9;

        private svg: D3.Selection;

        private colors: IDataColorPalette;
        private selectionManager: SelectionManager;

        private viewport: IViewport;

        private animator: IGenericAnimator;
        private margin: IMargin;
        private legend: ILegend;

        private dataViewCat: DataViewCategorical;        
        private data: AreaRangeChartData;

        private static DefaultSettings: AreaRangeChartSettings = {
            displayName: "Area Range Chart",
            precision: 2,
            legend: {
                show: true,
                position: LegendPosition.Top,
                showTitle: true,
            }
        };

        private static DefaultMargin: IMargin = {
            top: 20,
            bottom: 50,
            right: 20,
            left: 40,
        };
        
        private static DefaultViewport: IViewport = {
            width: 50,
            height: 50
        };

        private chart: D3.Selection;
        private axis: D3.Selection;
        private axisX: D3.Selection;
        private axisY: D3.Selection;

        private scaleType: string = AxisScale.linear;

        public constructor(options?: AreaRangeChartConstructorOptions) {
            if (options) {
                this.animator = options.animator;
            }

            this.margin = AreaRangeChart.DefaultMargin;
        }

        public init(options: VisualInitOptions): void {
            var element = options.element;
            this.selectionManager = new SelectionManager({ hostServices: options.host });

            this.colors = options.style.colorPalette.dataColors;
            this.legend = createLegend(element, false, null);

            this.svg = d3.select(element.get(0))
                .append('svg')
                .classed(AreaRangeChart.VisualClassName, true);

            this.chart = this.svg
                .append('g')
                .classed(AreaRangeChart.Chart.class, true);

            this.axis = this.svg
                .append('g')
                .classed(AreaRangeChart.Axis.class, true);

            this.axisX = this.axis
                .append('g')
                .classed(AreaRangeChart.Axis.class, true);

            this.axisY = this.axis
                .append('g')
                .classed(AreaRangeChart.Axis.class, true);
        }
       
        private isSizeAvailable(viewport: IViewport): boolean {
            if ((viewport.height < AreaRangeChart.DefaultViewport.height) || 
                (viewport.width < AreaRangeChart.DefaultViewport.width)) {
                    return false; 
            }
            return true;
        }

        private updateInternal(options: VisualUpdateOptions): void {
            if (!options.dataViews || !options.dataViews[0]) {
                return;
            }
            
            var dataView = options.dataViews[0];
            if (!dataView ||
                !dataView.categorical ||
                !dataView.categorical.values ||
                !dataView.categorical.values[0] ||
                !dataView.categorical.values[0].values) {
                    this.clearChart();
                    return;
            }
            
            if (!this.isSizeAvailable(options.viewport)) {
                this.clearChart();
                return;
            }
   
            this.setSize(options.viewport);            
            this.setData(options.dataViews);

            if (typeof(this.data) === 'undefined') {
                this.clearChart();
                return;
            }
            
            this.calculateAxesProperties(null);
            this.render(options.suppressAnimations);
        }
 
        public update(options: VisualUpdateOptions): void {
            if (!options.dataViews || !options.dataViews[0]) {
                return;
            }
            this.updateInternal(options);
        }
        
        private static getColor(
            colorHelper: ColorHelper,
            hasDynamicSeries: boolean,
            values: DataViewValueColumns,
            grouped: DataViewValueColumnGroup[],
            seriesIndex: number,
            groupedIdentity: DataViewValueColumnGroup): string {

            var objects: DataViewObjects;
            if (hasDynamicSeries) {
                if (grouped && grouped[seriesIndex])
                    objects = grouped[seriesIndex].objects;
            }
            else if (values[seriesIndex]) {
                objects = values[seriesIndex].source.objects;
            }

            return hasDynamicSeries && groupedIdentity 
                ? colorHelper.getColorForSeriesValue(objects, values.identityFields, groupedIdentity.name)
                : colorHelper.getColorForMeasure(objects, values[seriesIndex].source.queryName);
        }

        public setData(dataViews: DataView[]): void {
            this.data = {
                series: [],
                dataLabelsSettings: dataLabelUtils.getDefaultPointLabelSettings(),
                axesLabels: { x: null, y: null },
                hasDynamicSeries: false,
                categories: [],
                categoryMetadata: undefined,
                lowerMeasureIndex: undefined,
                upperMeasureIndex: undefined,
                //labelDensity: 0,
            };

            if (dataViews.length > 0) {
                var dataView = dataViews[0];

                if (dataView) {
                    if (dataView.categorical) {
                        var dataViewCat = this.dataViewCat = dataView.categorical;
                        var dvCategories = dataViewCat.categories;
                        var categoryType = ValueType.fromDescriptor({ text: true });
                        if (dvCategories && dvCategories.length > 0 && dvCategories[0].source && dvCategories[0].source.type)
                            categoryType = dvCategories[0].source.type;

                    
                        //var axisType = lineChartProps.categoryAxis.axisType
                        var axisType = AreaRangeChart.properties.general.formatString;
                                                
                        var convertedData = AreaRangeChart.converter(
                            dataView,
                            valueFormatter.format(null),
                            this.colors,
                            CartesianChart.getIsScalar(dataView.metadata ? dataView.metadata.objects : null, axisType, categoryType),
                            null);
                        this.data = convertedData;
                    }
                }
            }
        }
        
        
        public static converter(dataView: DataView, blankCategoryValue: string, colors: IDataColorPalette, isScalar: boolean, interactivityService?: IInteractivityService): AreaRangeChartData {
            var categorical = dataView.categorical;
            var category = categorical.categories && categorical.categories.length > 0
                ? categorical.categories[0]
                : {
                    source: undefined,
                    values: [blankCategoryValue],
                    identity: undefined,
                };

            var xAxisCardProperties = CartesianHelper.getCategoryAxisProperties(dataView.metadata);
            isScalar = CartesianHelper.isScalar(isScalar, xAxisCardProperties);
            categorical = ColumnUtil.applyUserMinMax(isScalar, categorical, xAxisCardProperties);

            var formatStringProp = AreaRangeChart.properties.general.formatString;
            var categoryType: ValueType = AxisHelper.getCategoryValueType(category.source, isScalar);
            var isDateTime = AxisHelper.isDateTime(categoryType);
            var categoryValues = category.values;
            var series: AreaRangeChartSeries[] = [];
            var seriesLen = categorical.values ? categorical.values.length : 0;
            var hasDynamicSeries = !!(categorical.values && categorical.values.source);
            var values = categorical.values;
            var labelFormatString: string = values && values[0] ? valueFormatter.getFormatString(values[0].source, formatStringProp) : undefined;
            var defaultLabelSettings: LineChartDataLabelsSettings = dataLabelUtils.getDefaultLineChartLabelSettings();

            var defaultSeriesColor: string;

            if (dataView.metadata && dataView.metadata.objects) {
                var objects = dataView.metadata.objects;
                defaultSeriesColor = DataViewObjects.getFillColor(objects, lineChartProps.dataPoint.defaultColor);

                //var labelsObj = <DataLabelObject>objects['labels'];
                //dataLabelUtils.updateLabelSettingsFromLabelsObject(labelsObj, defaultLabelSettings);
            }

            var settings: AreaRangeChartSettings = AreaRangeChart.parseSettings(dataView);

            if (!settings) {
                return;
            }

            var colorHelper = new ColorHelper(colors, lineChartProps.dataPoint.fill, defaultSeriesColor);

            var grouped: DataViewValueColumnGroup[];
            if (dataView.categorical.values) {
                grouped = dataView.categorical.values.grouped();
            }

            var lowerMeasureIndex = DataRoleHelper.getMeasureIndexOfRole(grouped, AreaRangeChart.RoleNames.Lower);
            var upperMeasureIndex = DataRoleHelper.getMeasureIndexOfRole(grouped, AreaRangeChart.RoleNames.Upper);
     
            if (lowerMeasureIndex < 0 || upperMeasureIndex < 0) {
                return;
            }
            
            seriesLen = grouped.length;
            
            for (var seriesIndex = 0; seriesIndex < seriesLen; seriesIndex++) {
                var column = categorical.values[seriesIndex];
                var valuesMetadata = column.source;
                var dataPoints: AreaRangeChartDataPoint[] = [];
                var groupedIdentity = grouped[seriesIndex];
                var identity = hasDynamicSeries && groupedIdentity ?
                    SelectionId.createWithIdAndMeasure(groupedIdentity.identity, column.source.queryName) :
                    SelectionId.createWithMeasure(column.source.queryName);
                var key = identity.getKey();
                var color = AreaRangeChart.getColor(colorHelper, hasDynamicSeries, values, grouped, seriesIndex, groupedIdentity);
                var seriesLabelSettings: LineChartDataLabelsSettings;

                if (!hasDynamicSeries) {
                    var labelsSeriesGroup = grouped && grouped.length > 0 && grouped[0].values ? grouped[0].values[seriesIndex] : null;
                    var labelObjects = (labelsSeriesGroup && labelsSeriesGroup.source && labelsSeriesGroup.source.objects) ? <DataLabelObject> labelsSeriesGroup.source.objects['labels'] : null;
                    if (labelObjects) {
                        //seriesLabelSettings = Prototype.inherit(defaultLabelSettings);
                        //dataLabelUtils.updateLabelSettingsFromLabelsObject(labelObjects, seriesLabelSettings);
                    }
                }

                var dataPointLabelSettings = (seriesLabelSettings) ? seriesLabelSettings : defaultLabelSettings;
                

                for (var categoryIndex = 0, len = column.values.length; categoryIndex < len; categoryIndex++) {
                    var categoryValue = categoryValues[categoryIndex];
                    var value = AxisHelper.normalizeNonFiniteNumber(column.values[categoryIndex]);

                    // When Scalar, skip null categories and null values so we draw connected lines and never draw isolated dots.
                    if (isScalar && (categoryValue === null || value === null)) {
                        continue;
                    }

                    var categorical: DataViewCategorical = dataView.categorical;
                    var y0_group = groupedIdentity.values[lowerMeasureIndex];
                    var y1_group = groupedIdentity.values[upperMeasureIndex];

                    var y0 = y0_group.values[categoryIndex];
                    var y1 = y1_group.values[categoryIndex];

                    var formatterLarge = valueFormatter.create({ format: "0", value: 1e6 });
                    var formatted_y0 = (y0 != null ? (String(y0).length >= 6 ? formatterLarge.format(y0) : y0) : y0);
                    var formatted_y1 = (y1 != null ? (String(y1).length >= 6 ? formatterLarge.format(y1) : y1) : y1);

                    var seriesData: TooltipSeriesDataItem[] = [
                        {
                            value: formatted_y0,
                            metadata: y0_group
                        },
                        {
                            value: formatted_y1,
                            metadata: y1_group
                        }];

                    if (typeof(categorical.categories) === 'undefined') {
                        return;
                    }
                    var categoryColumns: DataViewCategoryColumn[] = [
                        categorical.categories[0]
                    ];
                    var tooltipInfo: TooltipDataItem[] = TooltipBuilder.createTooltipInfo(formatStringProp, null /*categorical*/, categoryValue, null, categoryColumns, seriesData, null);

                    var dataPoint: AreaRangeChartDataPoint = {
                        categoryValue: isDateTime && categoryValue ? categoryValue.getTime() : categoryValue,
                        value: value,
                        categoryIndex: categoryIndex,
                        seriesIndex: seriesIndex,
                        tooltipInfo: tooltipInfo,
                        selected: false,
                        identity: identity,
                        key: JSON.stringify({ ser: key, catIdx: categoryIndex }),
                        labelFill: dataPointLabelSettings.labelColor,
                        labelFormatString: labelFormatString || valuesMetadata.format,
                        labelSettings: dataPointLabelSettings,
                        y0: y0,
                        y1: y1,
                        pointColor: color,
                    };

                    dataPoints.push(dataPoint);
                }

                if (interactivityService) {
                    interactivityService.applySelectionStateToData(dataPoints);
                }

                if (dataPoints.length > 0) {
                    series.push({
                        displayName: grouped[seriesIndex].name,
                        key: key,
                        lineIndex: seriesIndex,
                        color: color,
                        xCol: category.source,
                        yCol: column.source,
                        data: dataPoints,
                        identity: identity,
                        selected: false,
                        labelSettings: seriesLabelSettings,
                    });
                }
            }

            xAxisCardProperties = CartesianHelper.getCategoryAxisProperties(dataView.metadata);
            var valueAxisProperties = CartesianHelper.getValueAxisProperties(dataView.metadata);
             
            // Convert to DataViewMetadataColumn
            var valuesMetadataArray: powerbi.DataViewMetadataColumn[] = [];
            if (values) {
                for (var i = 0; i < values.length; i++) {

                    if (values[i] && values[i].source && values[i].source.displayName) {
                        valuesMetadataArray.push({ displayName: values[i].source.displayName });
                    }
                }
            }

            var axesLabels = converterHelper.createAxesLabels(xAxisCardProperties, valueAxisProperties, category.source, valuesMetadataArray);
            if (interactivityService) {
                interactivityService.applySelectionStateToData(series);
            }
            return {
                series: series,
                isScalar: isScalar,
                dataLabelsSettings: defaultLabelSettings,
                axesLabels: { x: axesLabels.xAxisLabel, y: axesLabels.yAxisLabel },
                hasDynamicSeries: hasDynamicSeries,
                categoryMetadata: category.source,
                categories: categoryValues,
                lowerMeasureIndex: lowerMeasureIndex,
                upperMeasureIndex: upperMeasureIndex,
                settings: settings
            };
        }
        
        private clearChart(): void {
            this.chart.selectAll('*').remove();
            this.axisY.selectAll('*').remove();
            this.axisX.selectAll('*').remove();
        }

        public render(suppressAnimations: boolean): CartesianVisualRenderResult {
            var duration = AnimatorCommon.GetAnimationDuration(this.animator, suppressAnimations);
            var result: CartesianVisualRenderResult;
            var data = this.data;
            
            if (!data) {
                this.clearChart();
                return;
            }

            this.renderAxis(data, duration);
            this.renderChart(data, duration);
            
            
            //calculateLegend
            var legendData = this.createLegendDataPoints(0);

            if (data.settings && data.settings.legend) {
                LegendData.update(legendData, data.settings.legend);
                this.legend.changeOrientation(data.settings.legend.position);
            }
            
            var isDrawLegend = false;
            
            if (isDrawLegend) {
                this.legend.drawLegend(legendData, this.viewport);
            }
            return result;
        }

        private setSize(viewport: IViewport): void {
            var height: number,
                width: number;

            height = viewport.height - this.margin.top - this.margin.bottom;
            width = viewport.width - this.margin.left - this.margin.right;
            
            height = Math.max(height, AreaRangeChart.DefaultViewport.height);
            width  = Math.max(width, AreaRangeChart.DefaultViewport.width);

            this.viewport = {
                height: height,
                width: width
            };

            this.updateElements(viewport.height, viewport.width);
        }

        private updateElements(height: number, width: number): void {
            this.svg.attr({
                'height': height,
                'width': width
            });
            this.chart.attr('transform', SVGUtil.translate(this.margin.left, this.margin.top));
            this.axisY.attr('transform', SVGUtil.translate(this.margin.left, this.margin.top));
            this.axisX.attr('transform', SVGUtil.translate(this.margin.left, this.margin.top + this.viewport.height));
        }

        private static getObjectsFromDataView(dataView: DataView): DataViewObjects {
            if (!dataView ||
                !dataView.metadata ||
                !dataView.metadata.columns ||
                !dataView.metadata.objects) {
                return null;
            }

            return dataView.metadata.objects;
        }

        private static getPrecision(objects: DataViewObjects): number {
            var precision: number = DataViewObjects.getValue(
                objects,
                AreaRangeChart.properties.labels.labelPrecision,
                AreaRangeChart.DefaultSettings.precision);

            return precision;
        }

        private static getLegendSettings(objects: DataViewObjects): DataViewObject {
            var legend: any = objects["legend"];

            legend.show = DataViewObjects.getValue(objects,
                AreaRangeChart.properties.legend.show,
                AreaRangeChart.DefaultSettings.legend.show);
            legend.position = DataViewObjects.getValue(objects,
                AreaRangeChart.properties.legend.position,
                AreaRangeChart.DefaultSettings.legend.position);
            legend.showTitle = DataViewObjects.getValue(objects,
                AreaRangeChart.properties.legend.showTitle,
                AreaRangeChart.DefaultSettings.legend.showTitle);
            legend.titleText = DataViewObjects.getValue(objects,
                AreaRangeChart.properties.legend.titleText,
                AreaRangeChart.DefaultSettings.legend.titleText);

            return legend;
        }

        private static getDataColorsSettings(objects: DataViewObjects): IColorPalette {
            var legend: any = objects["dataPoints"];
            return legend;
        }

        private static parseSettings(dataView: DataView): AreaRangeChartSettings {
            var settings: AreaRangeChartSettings = <AreaRangeChartSettings>{},
                objects: DataViewObjects;

            settings.displayName = AreaRangeChart.DefaultSettings.displayName;
            settings.fillColor = AreaRangeChart.DefaultSettings.fillColor;
            objects = AreaRangeChart.getObjectsFromDataView(dataView);

            if (objects) {
                settings.precision = AreaRangeChart.getPrecision(objects);

                settings.legend = AreaRangeChart.getLegendSettings(objects);
                settings.colors = AreaRangeChart.getDataColorsSettings(objects);
            }
            return settings;
        }

        public calculateAxesProperties(options: CalculateScaleAndDomainOptions): IAxisProperties[] {

            this.data.xAxisProperties = this.getXAxisProperties();
            this.data.yAxisProperties = this.getYAxisProperties();
            
            return [this.data.xAxisProperties, this.data.yAxisProperties];
        }

        private lookupXValue(index: number, type: ValueType): any {

            var isDateTime = AxisHelper.isDateTime(type);
            if (isDateTime && this.data.isScalar) {
                return new Date(index);
            }

            if (this.data && this.data.series && this.data.series.length > 0) {
                var firstSeries = this.data.series[0];
                if (firstSeries) {
                    var data = firstSeries.data;
                    if (data) {
                        var dataAtIndex = data[index];
                        if (dataAtIndex) {
                            if (isDateTime) {
                                return new Date(dataAtIndex.categoryValue);
                            }
                            return dataAtIndex.categoryValue;
                        }
                    }
                }
            }

            return index;
        }

        private getXAxisProperties(): IAxisProperties {
            var data = this.data;
            
            var origCatgSize = data.series && data.series.length > 0 ? data.series[0].data.length : 0;
            var categoryThickness = CartesianChart.getCategoryThickness(data.series, origCatgSize, this.viewport.width, xDomain, data.isScalar);

            var categoryDataType: ValueType = AxisHelper.getCategoryValueType(data.categoryMetadata);
            
            var xDomain = AxisHelper.createDomain(data.series, categoryDataType, data.isScalar, null);
            var xMetaDataColumn: DataViewMetadataColumn = data.categoryMetadata;
            
            var xAxisProperties = AxisHelper.createAxis({
                pixelSpan: this.viewport.width,
                dataDomain: xDomain,
                metaDataColumn: xMetaDataColumn,
                //formatStringProp: lineChartProps.general.formatString,
                formatString: valueFormatter.getFormatString(xMetaDataColumn, AreaRangeChart.properties.general.formatString),
                outerPadding: 0,
                isScalar: this.data.isScalar,
                isVertical: false,
                forcedTickCount: undefined,
                useTickIntervalForDisplayUnits: true,
                getValueFn: (index, type) => this.lookupXValue(index, type),
                categoryThickness: categoryThickness,
                isCategoryAxis: true,
                scaleType: this.scaleType,
                axisDisplayUnits: undefined,
                axisPrecision: undefined
            });

            return xAxisProperties;
        }
        
        /**
         * Creates a [min,max] from your Cartiesian data values.
         * 
         * @param data The series array of CartesianDataPoints.
         * @param includeZero Columns and bars includeZero, line and scatter do not.
         */
        private static createValueDomain(data: AreaRangeChartSeries[], includeZero: boolean): number[] {
            if (data.length === 0) {
                return null;
            }

            var minY0 = <number>d3.min(data,(kv) => { return d3.min(kv.data, d => { return d.y0; }); });
            var minY1 = <number>d3.min(data, (kv) => { return d3.min(kv.data, d => { return d.y1; }); });
            
            var maxY0 = <number>d3.max(data, (kv) => { return d3.max(kv.data, d => { return d.y0; }); });
            var maxY1 = <number>d3.max(data, (kv) => { return d3.max(kv.data, d => { return d.y1; }); });
            
            var minY = Math.min(minY0, minY1);
            var maxY = Math.max(maxY0, maxY1);
            
            if (includeZero) {
                return [Math.min(minY, 0), Math.max(maxY, 0)];
            }
            return [minY, maxY];
        }

        private getYAxisProperties(): IAxisProperties {
            var yDomain = AreaRangeChart.createValueDomain(this.data.series, false);
            var lowerMeasureIndex = this.data.series.length === 1 ? 0 : this.data.lowerMeasureIndex;
            var yMetaDataColumn: DataViewMetadataColumn  = this.data.series.length? this.data.series[lowerMeasureIndex].yCol : undefined;
            var yAxisProperties = AxisHelper.createAxis({
                pixelSpan: this.viewport.height,
                dataDomain: yDomain,
                metaDataColumn: yMetaDataColumn,
                //formatStringProp: AreaRangeChart.properties.general.formatString,
                formatString: valueFormatter.getFormatString(yMetaDataColumn, AreaRangeChart.properties.general.formatString),
                outerPadding: 0,
                isScalar: true,//this.data.isScalar,
                isVertical: true,
                useTickIntervalForDisplayUnits: true,
                isCategoryAxis: false,
                scaleType: this.scaleType,
            });

            return yAxisProperties;
        }

        private renderAxis(data: AreaRangeChartData, duration: number): void {
            var xAxis = data.xAxisProperties.axis;
            var yAxis = data.yAxisProperties.axis;

            xAxis.orient('bottom');
            yAxis.orient('left');

            this.axisX
                .transition()
                .duration(duration)
                .call(xAxis);

            this.axisY
                .transition()
                .duration(duration)
                .call(yAxis);
        }

        private renderChart(data: AreaRangeChartData, duration: number): void {
            var series: AreaRangeChartSeries[] = data.series,
                isScalar: boolean = data.isScalar,
                xScale: D3.Scale.LinearScale = <D3.Scale.LinearScale>data.xAxisProperties.scale,
                yScale: D3.Scale.LinearScale = <D3.Scale.LinearScale>data.yAxisProperties.scale,
                sm = this.selectionManager;

            var area: D3.Svg.Area = d3.svg.area()
                .x((d: AreaRangeChartDataPoint) => {
                    return xScale(isScalar ? d.categoryValue : d.categoryIndex);
                })
                .y0((d: AreaRangeChartDataPoint) => yScale(d.y0))
                .y1((d: AreaRangeChartDataPoint) => yScale(d.y1));

            var selection = this.chart.selectAll(AreaRangeChart.Area.selector).data(series);

            selection
                .enter()
                .append('svg:path')
                .classed(AreaRangeChart.Area.class, true);

            selection
                .attr('fill', (d: AreaRangeChartSeries) => d.color)
                .attr('stroke', (d: AreaRangeChartSeries) => d.color)
                .attr('d', (d: AreaRangeChartSeries) => {
                    return area(d.data);
                })
                .style('fill-opacity', AreaRangeChart.DimmedFillOpacity)
                .on('click', function(d: AreaRangeChartSeries) {
                    sm.select(d.identity).then(ids => {
                        if (ids.length > 0) {
                            selection.style('fill-opacity', AreaRangeChart.DimmedFillOpacity);
                            d3.select(this).transition()
                                .duration(duration)
                                .style('fill-opacity', AreaRangeChart.FillOpacity);
                        } else {
                            selection.style('fill-opacity', AreaRangeChart.DimmedFillOpacity);
                        }
                    });
                    d3.event.stopPropagation();
                });

            selection.exit().remove();
            this.renderTooltip(selection, xScale, data.isScalar);
        }

        private static findClosestXAxisIndex(currentX: number, xAxisValues: AreaRangeChartDataPoint[], isScalar: boolean): number {
            var closestValueIndex: number = -1;
            var minDistance = Number.MAX_VALUE;
            for (var i in xAxisValues) {
                
                var element = <AreaRangeChartDataPoint>xAxisValues[i];
                var value = isScalar ? element.categoryValue : element.categoryIndex;
                
                var distance = Math.abs(currentX - value);
                if (distance < minDistance) {
                    minDistance = distance;
                    closestValueIndex = i;
                }
            }
            return closestValueIndex;
        }

        public static getTooltipInfoByPointX(pointData: any, xScale: D3.Scale.LinearScale, isScalar: boolean, pointX: number): TooltipDataItem[] {

            var index: number = 0;
            var currentX = powerbi.visuals.AxisHelper.invertScale(xScale, pointX);
            index = AreaRangeChart.findClosestXAxisIndex(currentX, pointData.data, isScalar);
            return pointData.data[index].tooltipInfo;
        }

        private renderTooltip(selection: D3.UpdateSelection, xScale: D3.Scale.LinearScale, isScalar: boolean): void {
            TooltipManager.addTooltip(selection, (tooltipEvent: TooltipEvent) => {
                var pointX: number = tooltipEvent.elementCoordinates[0];
                return AreaRangeChart.getTooltipInfoByPointX(tooltipEvent.data, xScale, isScalar, pointX);
            }, true);
        }

        private createLegendDataPoints(columnIndex: number): LegendData {
            var data = this.data;
            if (!data) {
                return null;
            }

            var legendDataPoints: LegendDataPoint[] = [];
            var category: any;

            // Category will be the same for all series. This is an optimization.
            if (data.series.length > 0) {
                var lineDatePointFirstSeries: LineChartDataPoint = data.series[0].data[columnIndex];
                var isDateTime = AxisHelper.isDateTime(this.data.xAxisProperties.axisType);
                var value = (isDateTime && this.data.isScalar && lineDatePointFirstSeries) ? lineDatePointFirstSeries.categoryValue : columnIndex;
                category = lineDatePointFirstSeries && this.lookupXValue(value, this.data.xAxisProperties.axisType);
            }

            var formatStringProp = lineChartProps.general.formatString;
            var seriesYCol: DataViewMetadataColumn = null;
            // iterating over the line data (i is for a line)
            for (var i = 0, len = data.series.length; i < len; i++) {
                var series = data.series[i];
                var lineData = series.data;
                var lineDataPoint = lineData[columnIndex];
                var measure = lineDataPoint && lineDataPoint.value;

                var label = converterHelper.getFormattedLegendLabel(series.yCol, this.dataViewCat.values, formatStringProp);
                seriesYCol = series.yCol;
                legendDataPoints.push({
                    color: series.color,
                    icon: LegendIcon.Line,
                    label: label,
                    category: valueFormatter.format(category, valueFormatter.getFormatString(series.xCol, formatStringProp)),
                    measure: valueFormatter.format(measure, valueFormatter.getFormatString(series.yCol, formatStringProp)),
                    identity: series.identity,
                    selected: false
                });
            }

            var dvValues = this.dataViewCat ? this.dataViewCat.values : null;
            var title = dvValues && dvValues.source ? dvValues.source.displayName : "";

            return {
                title: title,
                dataPoints: legendDataPoints
            };
        }
        
        private enumerateLegend(enumeration: ObjectEnumerationBuilder): ObjectEnumerationBuilder {
            var data = this.data;

            if (typeof(data) === 'undefined') {
                return;
            }
            var legendObjectProperties: DataViewObjects = { legend: data.settings.legend };
            var show = DataViewObjects.getValue(legendObjectProperties, AreaRangeChart.properties.legend.show, this.legend.isVisible());
            var showTitle = DataViewObjects.getValue(legendObjectProperties, AreaRangeChart.properties.legend.showTitle, true);
            var titleText = DataViewObjects.getValue(legendObjectProperties, AreaRangeChart.properties.legend.titleText, null);

            enumeration.pushInstance({
                selector: null,
                objectName: 'legend',
                properties: {
                    show: show,
                    position: LegendPosition[this.legend.getOrientation()],
                    showTitle: showTitle,
                    titleText: titleText
                }
            });
        }

        private enumerateDataPoints(enumeration: ObjectEnumerationBuilder): ObjectEnumerationBuilder {
            var data = this.data;
            if (!data) {
                return;
            }

            var series = data.series;

            for (var i = 0; i < series.length; i++) {
                var item = series[i];

                var color = item.color;
                var selector = item.identity.getSelector();
                var isSingleSeries = !!selector.data;

                enumeration.pushInstance({
                    objectName: 'dataPoint',
                    displayName: item.displayName,
                    selector: ColorHelper.normalizeSelector(selector, isSingleSeries),
                    properties: {
                        fill: { solid: { color: color } }
                    },
                });
            }
        }

        public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstanceEnumeration {
            var enumeration = new ObjectEnumerationBuilder();

            switch (options.objectName) {
                case 'legend':
                    this.enumerateLegend(enumeration);
                    break;
                case 'dataPoint':
                    this.enumerateDataPoints(enumeration);
                    break;
            }
            return enumeration.complete();
        }
    }
}
