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

    export var bulletChartProps = {
        values: {
            targetValue: <DataViewObjectPropertyIdentifier>{ objectName: 'values', propertyName: 'targetValue' },
            minimumPercent: <DataViewObjectPropertyIdentifier>{ objectName: 'values', propertyName: 'minimumPercent' },
            satisfactoryPercent: <DataViewObjectPropertyIdentifier>{ objectName: 'values', propertyName: 'satisfactoryPercent' },
            goodPercent: <DataViewObjectPropertyIdentifier>{ objectName: 'values', propertyName: 'goodPercent' },
            maximumPercent: <DataViewObjectPropertyIdentifier>{ objectName: 'values', propertyName: 'maximumPercent' },
        },
        orientation: {
            orientation: <DataViewObjectPropertyIdentifier>{ objectName: 'orientation', propertyName: 'orientation' },
        },
        colors: {
            badColor: <DataViewObjectPropertyIdentifier>{ objectName: 'colors', propertyName: 'badColor' },
            satisfactoryColor: <DataViewObjectPropertyIdentifier>{ objectName: 'colors', propertyName: 'satisfactoryColor' },
            goodColor: <DataViewObjectPropertyIdentifier>{ objectName: 'colors', propertyName: 'goodColor' },
            bulletColor: <DataViewObjectPropertyIdentifier>{ objectName: 'colors', propertyName: 'bulletColor' },
        },
        axis: {
            axis: <DataViewObjectPropertyIdentifier>{ objectName: 'axis', propertyName: 'axis' },
            axisColor: <DataViewObjectPropertyIdentifier>{ objectName: 'axis', propertyName: 'axisColor' },
            measureUnits: <DataViewObjectPropertyIdentifier>{ objectName: 'axis', propertyName: 'measureUnits' },
            unitsColor: <DataViewObjectPropertyIdentifier>{ objectName: 'axis', propertyName: 'unitsColor' },
            measureColor: <DataViewObjectPropertyIdentifier>{ objectName: 'axis', propertyName: 'measureColor' }
        },
        formatString: <DataViewObjectPropertyIdentifier>{ objectName: 'general', propertyName: 'formatString' },

    };

    export interface BulletConstructorOptions {
        behavior?: BulletWebBehavior;
    }

    export interface BulletDataPoint extends SelectableDataPoint {
        category: string;
        value: number;
        targetValue: number;
        minimum: number;
        satisfactory: number;
        good: number;
        maximum: number;
        toolTipInfo: TooltipDataItem[];
        highlight: boolean;
    }

    export interface BulletChartSettings {
        values: {
            targetValue: number;
            minimumPercent: number;
            satisfactoryPercent: number;
            goodPercent: number;
            maximumPercent: number;
        };
        orientation: {
            orientation: string;
            reverse: boolean;
            vertical: boolean;
        };
        colors: {
            badColor: string;
            satisfactoryColor: string;
            goodColor: string;
            bulletColor: string;
        };

        axis: {
            axis: boolean;
            axisColor: string;
            measureUnits: string;
            unitsColor: string;
            measureColor: string;
        };
    }

    //Model
    export interface BulletChartModel {
        bulletDataPoints: BulletDataPoint[];
        bulletChartSettings: BulletChartSettings;
        bulletValueFormatString: string;
    }

    export var bulletChartRoleNames = {
        value: 'Value',
        targetValue: 'TargetValue',
        minValue: 'Minimum',
        satisfactoryValue: 'Satisfactory',
        goodValue: 'Good',
        maxValue: 'Maximum'
    };

    module Orientation {
        export var HORIZONTALLEFT: string = 'Horizontal Left';
        export var HORIZONTALRIGHT: string = 'Horizontal Right';
        export var VERTICALTOP: string = 'Vertical Top';
        export var VERTICALBOTTOM: string = 'Vertical Bottom';

        export var type: IEnumType = createEnumType([
            { value: HORIZONTALLEFT, displayName: HORIZONTALLEFT },
            { value: HORIZONTALRIGHT, displayName: HORIZONTALRIGHT },
            { value: VERTICALTOP, displayName: VERTICALTOP },
            { value: VERTICALBOTTOM, displayName: VERTICALBOTTOM }
        ]);
    }

    export class BulletChartWarning implements IVisualWarning {
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

    export class BulletChart implements IVisual {
        private static ScrollbarWidth: number = 13;
        private static BulletVerticalWidth = 105;
        private static BulletHorizontalHeight = 50;
        private static BulletWidth = 25;
        private static BulletTitleHorizontalReservedSpace = 30;
        private static BulletTitleVerticalReservedSpace = 25;
        private static BulletLastTickVerticalReservedSpace = 5;
        private static BulletLastTickHorizontalReservedSpace = 30;

        private static BulletTitleCss = {
            "font-size": "14px",
            "font-weight": "bold",
            "font-family": "Segoe UI, wf_segoe-ui_normal, helvetica, arial, sans-serif"
        };
        private static BulletSubtitleCss = {
            "font-size": "11px",
            "font-family": "Segoe UI, wf_segoe-ui_normal, helvetica, arial, sans-serif"
        };

        private static ClassName: string = "bulletChart";
        private static ColumnClassName: string = "column";

        public static capabilities: VisualCapabilities = {
            dataRoles: [
                {
                    name: 'Category',
                    kind: VisualDataRoleKind.Grouping,
                    displayName: 'Category',
                },
                {
                    name: 'Value',
                    kind: VisualDataRoleKind.Measure,
                    displayName: 'Value',
                }, {
                    name: 'TargetValue',
                    kind: VisualDataRoleKind.Measure,
                    displayName: 'Target Value',
                }, {
                    name: 'Minimum',
                    kind: VisualDataRoleKind.Measure,
                    displayName: 'Minimum',
                }, {
                    name: 'Satisfactory',
                    kind: VisualDataRoleKind.Measure,
                    displayName: 'Satisfactory',
                }, {
                    name: 'Good',
                    kind: VisualDataRoleKind.Measure,
                    displayName: 'Good',
                }, {
                    name: 'Maximum',
                    kind: VisualDataRoleKind.Measure,
                    displayName: 'Maximum',
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
                values: {
                    displayName: 'Data values',
                    properties: {
                        targetValue: {
                            displayName: 'Target Value',
                            type: { numeric: true }
                        },
                        minimumPercent: {
                            displayName: 'Minimum %',
                            type: { numeric: true }
                        },
                        satisfactoryPercent: {
                            displayName: 'Satisfactory %',
                            type: { numeric: true }
                        },
                        goodPercent: {
                            displayName: 'Good %',
                            type: { numeric: true }
                        },
                        maximumPercent: {
                            displayName: 'Maximum %',
                            type: { numeric: true }
                        },
                    }
                },
                orientation: {
                    displayName: 'Orientation',
                    properties: {
                        orientation: {
                            displayName: 'Orientation',
                            type: { enumeration: Orientation.type }
                        }
                    }
                },
                colors: {
                    displayName: 'Colors',
                    properties: {
                        badColor: {
                            type: { fill: { solid: { color: true } } },
                            displayName: 'Bad Color'
                        },
                        satisfactoryColor: {
                            type: { fill: { solid: { color: true } } },
                            displayName: 'Satisfactory Color'
                        },
                        goodColor: {
                            type: { fill: { solid: { color: true } } },
                            displayName: 'Good Color'
                        },
                        bulletColor: {
                            type: { fill: { solid: { color: true } } },
                            displayName: 'Bullet Color'
                        }
                    },
                },
                axis: {
                    displayName: 'Axis',
                    properties: {
                        axis: {
                            displayName: 'Axis',
                            type: { bool: true }
                        },
                        axisColor: {
                            type: { fill: { solid: { color: true } } },
                            displayName: 'Axis Color'
                        },
                        measureUnits: {
                            type: { text: true },
                            displayName: 'Measure Units '
                        },
                        unitsColor: {
                            type: { fill: { solid: { color: true } } },
                            displayName: 'Units Color'
                        },
                        measureColor: {
                            type: { fill: { solid: { color: true } } },
                            displayName: 'Measure Color'
                        }
                    }
                }
            },
            dataViewMappings: [{
                conditions: [
                    {
                        'Category': { max: 1 }, 'Value': { max: 1 }, 'TargetValue': { max: 1 }, 'Minimum': { max: 1 },
                        'Satisfactory': { max: 1 }, 'Good': { max: 1 }, 'Maximum': { max: 1 }
                    },
                ],
                categorical: {
                    categories: {
                        for: { in: 'Category' },
                        dataReductionAlgorithm: { top: {} }
                    },
                    values: {
                        select: [
                            { bind: { to: 'Value' } },
                            { bind: { to: 'TargetValue' } },
                            { bind: { to: 'Minimum' } },
                            { bind: { to: 'Satisfactory' } },
                            { bind: { to: 'Good' } },
                            { bind: { to: 'Maximum' } },
                        ]
                    },
                },
            }],
            supportsHighlight: true,
            sorting: {
                default: {},
            },
            drilldown: {
                roles: ['Category']
            }
        };

        //Variables
        private bulletBody: D3.Selection;
        private scrollContainer: D3.Selection;
        private model: BulletChartModel;
        private labelsReservedArea: number;
        private behavior: BulletWebBehavior;
        private interactivityService: IInteractivityService;
        private clearCatcher: D3.Selection;
        private hostService: IVisualHostServices;

        private get settings(): BulletChartSettings {
            return this.model.bulletChartSettings;
        }

        private get reverse(): Boolean {
            return this.settings.orientation.reverse;
        }

        private get vertical(): Boolean {
            return this.settings.orientation.vertical;
        }

        public static DefaultStyleProperties(): BulletChartSettings {
            return {
                values: {
                    targetValue: 0,
                    minimumPercent: 0,
                    satisfactoryPercent: 50,
                    goodPercent: 100,
                    maximumPercent: 200
                },
                orientation: {
                    orientation: Orientation.HORIZONTALLEFT,
                    reverse: false,
                    vertical: false
                },
                colors: {
                    badColor: 'Red',
                    satisfactoryColor: 'Yellow',
                    goodColor: 'Green',
                    bulletColor: 'Black'
                },
                axis: {
                    axis: true,
                    axisColor: 'Grey',
                    measureUnits: '',
                    unitsColor: 'Grey',
                    measureColor: 'Black'
                }
            };
        }

        private margin: IMargin = {
            top: 0,
            right: 0,
            bottom: 0,
            left: 0
        };

        private viewport: IViewport;

        private get viewportIn(): IViewport {
            return <IViewport>{
                width: this.viewport.width - this.margin.left - this.margin.right,
                height: this.viewport.height - this.margin.top - this.margin.bottom
            };
        }

        private get viewportScroll(): IViewport {
            var viewportIn = this.viewportIn;
            return <IViewport>{
                width: viewportIn.width - BulletChart.ScrollbarWidth,
                height: viewportIn.height - BulletChart.ScrollbarWidth
            };
        }

        private static getTextProperties(text: string, cssProperties: any): TextProperties {
            return <TextProperties>{
                fontFamily: cssProperties["font-family"],
                fontWeight: cssProperties["font-weight"],
                fontSize: cssProperties["font-size"],
                text: text
            };
        }
        
        // Convert a DataView into a view model
        public static converter(dataView: DataView, options: VisualUpdateOptions): BulletChartModel {
            var bulletModel: BulletChartModel;
            if (!dataView) {
                return;
            }

            var dataViewCategorical = dataView.categorical;

            if (!dataViewCategorical || !dataViewCategorical.categories || !dataViewCategorical.values || dataViewCategorical.values.length === 0
                || !dataView.metadata || !dataView.metadata.columns || dataView.metadata.columns.length === 0) {
                return;
            }

            var defaultSettings = BulletChart.DefaultStyleProperties();
            var objects = dataView.metadata.objects;
            if (objects) {
                defaultSettings.values.targetValue = DataViewObjects.getValue<number>(objects, bulletChartProps.values.targetValue, defaultSettings.values.targetValue);
                defaultSettings.values.minimumPercent = DataViewObjects.getValue<number>(objects, bulletChartProps.values.minimumPercent, defaultSettings.values.minimumPercent);
                defaultSettings.values.satisfactoryPercent = DataViewObjects.getValue<number>(objects, bulletChartProps.values.satisfactoryPercent, defaultSettings.values.satisfactoryPercent);
                defaultSettings.values.goodPercent = DataViewObjects.getValue<number>(objects, bulletChartProps.values.goodPercent, defaultSettings.values.goodPercent);
                defaultSettings.values.maximumPercent = DataViewObjects.getValue<number>(objects, bulletChartProps.values.maximumPercent, defaultSettings.values.maximumPercent);

                defaultSettings.orientation.orientation = DataViewObjects.getValue<string>(objects, bulletChartProps.orientation.orientation, defaultSettings.orientation.orientation);

                defaultSettings.colors.badColor = DataViewObjects.getFillColor(objects, bulletChartProps.colors.badColor, defaultSettings.colors.badColor);
                defaultSettings.colors.satisfactoryColor = DataViewObjects.getFillColor(objects, bulletChartProps.colors.satisfactoryColor, defaultSettings.colors.satisfactoryColor);
                defaultSettings.colors.goodColor = DataViewObjects.getFillColor(objects, bulletChartProps.colors.goodColor, defaultSettings.colors.goodColor);
                defaultSettings.colors.bulletColor = DataViewObjects.getFillColor(objects, bulletChartProps.colors.bulletColor, defaultSettings.colors.bulletColor);

                defaultSettings.axis.axis = DataViewObjects.getValue<boolean>(objects, bulletChartProps.axis.axis, defaultSettings.axis.axis);
                defaultSettings.axis.axisColor = DataViewObjects.getFillColor(objects, bulletChartProps.axis.axisColor, defaultSettings.axis.axisColor);
                defaultSettings.axis.measureUnits = DataViewObjects.getValue<string>(objects, bulletChartProps.axis.measureUnits, defaultSettings.axis.measureUnits);
                defaultSettings.axis.unitsColor = DataViewObjects.getFillColor(objects, bulletChartProps.axis.unitsColor, defaultSettings.axis.unitsColor);
                defaultSettings.axis.measureColor = DataViewObjects.getFillColor(objects, bulletChartProps.axis.measureColor, defaultSettings.axis.measureColor);
            }
            if (defaultSettings.orientation.orientation === Orientation.HORIZONTALRIGHT || defaultSettings.orientation.orientation === Orientation.VERTICALBOTTOM) {
                defaultSettings.orientation.reverse = true;
            }
            if (defaultSettings.orientation.orientation === Orientation.VERTICALTOP || defaultSettings.orientation.orientation === Orientation.VERTICALBOTTOM) {
                defaultSettings.orientation.vertical = true;
            }

            var categories: DataViewCategoryColumn,
                categoryValues: any[],
                categoryValuesLen: number = 1,
                categoryFormatString: string;

            if (dataViewCategorical.categories) {
                categories = dataViewCategorical.categories[0];
                categoryValues = categories.values;
                categoryValuesLen = categoryValues.length;
                categoryFormatString = valueFormatter.getFormatString(categories.source, bulletChartProps.formatString);
            }

            var bulletDataPoints: BulletDataPoint[] = [];
            var bulletValueFormatString = valueFormatter.getFormatString(dataView.categorical.values[0].source, bulletChartProps.formatString);

            for (var idx = 0; idx < categoryValuesLen; idx++) {
                var toolTipItems = [];
                var category: string, value: number = undefined, targetValue: number = undefined, minimum: number = undefined, satisfactory: number = undefined,
                    good: number = undefined, maximum: number = undefined;

                var highlight: boolean = false,
                    categoryIdentity: DataViewScopeIdentity;

                if (categoryValues) {
                    var categoryValue = categoryValues[idx];

                    category = valueFormatter.format(categoryValue, categoryFormatString);
                    categoryIdentity = categories.identity ? categories.identity[idx] : null;
                }
                var values = dataViewCategorical.values;

                for (var i = 0; i < values.length; i++) {

                    var col = values[i].source;
                    var currentVal = values[i].values[idx] || 0;
                    if (col && col.roles) {
                        if (col.roles[bulletChartRoleNames.value]) {
                            if (values[i].highlights) {
                                highlight = values[i].highlights[idx] !== null;
                            }
                            toolTipItems.push({ value: currentVal, metadata: values[i] });
                            value = currentVal;
                        } else if (col.roles[bulletChartRoleNames.targetValue]) {
                            toolTipItems.push({ value: currentVal, metadata: values[i] });
                            targetValue = currentVal;
                        } else if (col.roles[bulletChartRoleNames.minValue]) {
                            minimum = currentVal;
                        } else if (col.roles[bulletChartRoleNames.satisfactoryValue]) {
                            satisfactory = currentVal;
                        } else if (col.roles[bulletChartRoleNames.goodValue]) {
                            good = currentVal;
                        } else if (col.roles[bulletChartRoleNames.maxValue]) {
                            maximum = currentVal;
                        }
                    }
                }
                if (targetValue === undefined) {
                    targetValue = defaultSettings.values.targetValue;
                }
                if (minimum === undefined) {
                    minimum = defaultSettings.values.minimumPercent * targetValue / 100;
                }
                if (satisfactory === undefined) {
                    satisfactory = defaultSettings.values.satisfactoryPercent * targetValue / 100;
                }
                if (good === undefined) {
                    good = defaultSettings.values.goodPercent * targetValue / 100;
                }
                if (maximum === undefined) {
                    maximum = defaultSettings.values.maximumPercent * targetValue / 100;
                }
                if (!isNaN(targetValue) &&
                    !isNaN(minimum) &&
                    !isNaN(satisfactory) &&
                    !isNaN(good) &&
                    !isNaN(maximum)) {
                    bulletDataPoints.push({
                        identity: SelectionId.createWithId(categoryIdentity),
                        category: category,
                        value: value,
                        targetValue: targetValue,
                        minimum: minimum,
                        satisfactory: satisfactory,
                        good: good,
                        maximum: maximum,
                        toolTipInfo: TooltipBuilder.createTooltipInfo(bulletChartProps.formatString, null, null, null, null, toolTipItems),
                        selected: false,
                        highlight: highlight
                    });
                }
            }

            bulletModel = {
                bulletValueFormatString: bulletValueFormatString,
                bulletChartSettings: defaultSettings,
                bulletDataPoints: bulletDataPoints
            };
            return bulletModel;
        }

        private getBulletLabelTitleHeight(): number {
            return TextMeasurementService.measureSvgTextHeight(BulletChart.getTextProperties("lj", BulletChart.BulletTitleCss));
        }

        private getBulletLabelSubtitleHeight(): number {
            return TextMeasurementService.measureSvgTextHeight(BulletChart.getTextProperties("lj", BulletChart.BulletSubtitleCss));
        }

        /* One time setup*/
        public init(options: VisualInitOptions): void {
            var body = d3.select(options.element.get(0));
            this.hostService = options.host;
            this.clearCatcher = appendClearCatcher(body);
            this.bulletBody = this.clearCatcher
                .append('div')
                .classed(BulletChart.ClassName, true);

            this.scrollContainer = this.bulletBody.append('div')
                .classed('bullet-scroll-region', true);

            this.behavior = new BulletWebBehavior();

            this.interactivityService = createInteractivityService(options.host);
        }

        /* Called for data, size, formatting changes*/
        public update(options: VisualUpdateOptions) {
            if (!options.dataViews || !options.dataViews[0]) return;
            var dataView = options.dataViews[0];
            this.viewport = options.viewport;
            this.model = BulletChart.converter(dataView, options);
            this.scrollContainer.selectAll("svg").remove();
            if (!this.model) {
                return;
            }

            if (this.model.bulletDataPoints.some(data => [data.minimum,
                data.satisfactory,
                data.good,
                data.maximum,
                data.value,
                data.targetValue].some(x => x === Infinity || x === -Infinity))) {
                this.hostService.setWarnings([new BulletChartWarning(BulletChartWarning.ErrorInvalidDataValues)]);
                return;
            }

            this.updateLabelsReservedArea();
            if (this.interactivityService) {
                this.interactivityService.applySelectionStateToData(this.model.bulletDataPoints);
            }

            var hasHighlights = this.hasHighlightValues(dataView, 0);
            var hasSelection = this.interactivityService.hasSelection();
            var self = this;
            var bullet = (bullets: D3.Selection) => {
                bullets.each(function (data: BulletDataPoint, index) {
                    self.setUpBullet(d3.select(this), jQuery.extend(true, {}, data), hasHighlights, hasSelection);
                });
            };

            this.bulletBody.style({
                'height': this.viewportIn.height + 'px',
                'width': this.viewportIn.width + 'px',
            });
            if (this.vertical) {
                this.scrollContainer.style({
                    width: (this.model.bulletDataPoints.length * BulletChart.BulletVerticalWidth) + 'px',
                    height: this.viewportScroll.height + 'px'
                });
            }
            else {
                this.scrollContainer.style({
                    height: (this.model.bulletDataPoints.length * BulletChart.BulletHorizontalHeight) + 'px',
                    width: this.viewportScroll.width + 'px'
                });
            }

            this.scrollContainer.selectAll("svg.bullet")
                .data(this.model.bulletDataPoints)
                .enter().append("svg")
                .attr("class", "bullet")
                .call(bullet);
            var bullets = this.scrollContainer.selectAll("svg.bullet");
            if (this.interactivityService) {

                var behaviorOptions: BulletBehaviorOptions = {
                    bullets: bullets,
                    clearCatcher: this.clearCatcher,
                    dataPoints: this.model.bulletDataPoints,
                    interactivityService: this.interactivityService,
                    bulletChartSettings: this.settings,
                    hasHighlights: hasHighlights
                };

                this.interactivityService.bind(this.model.bulletDataPoints, this.behavior, behaviorOptions);
            }
        }

        private updateLabelsReservedArea(): void {
            if (this.vertical) {
                this.labelsReservedArea = this.getBulletLabelTitleHeight() + this.getBulletLabelSubtitleHeight();
            } else {
                var categoriesWidths: number[] = this.model.bulletDataPoints
                    .map(x => x.category && BulletChart.getTextProperties(x.category, BulletChart.BulletTitleCss))
                    .map(x => x ? TextMeasurementService.measureSvgTextWidth(x) : 0);
                this.labelsReservedArea = Math.min(
                    Math.max.apply(null, categoriesWidths) + BulletChart.BulletTitleHorizontalReservedSpace,
                    this.viewportScroll.width / 3);
            }
        }

        private setUpBullet(svgBullet: D3.Selection, data: BulletDataPoint, hasHighlights: boolean, hasSelection: boolean) {
            var sortedRanges = [data.minimum, data.satisfactory, data.good, data.maximum].sort(d3.descending);
            data.value = data.value || 0;
            data.targetValue = data.targetValue || 0;

            var svgRotate = svgBullet
                .append('g');

            var svgWrap = svgRotate
                .append('g')
                .attr("class", "wrap");

            var labels = svgRotate.append('g')
                .classed('labels', true);

            var length: number = this.vertical ? this.viewportScroll.height : this.viewportScroll.width;

            var svgTitle = labels
                .append('text')
                .classed('title', true)
                .style('display', 'block')
                .attr("fill", this.settings.axis.measureColor);
            var titleMaxWidth: number = this.vertical
                ? (BulletChart.BulletVerticalWidth - BulletChart.BulletTitleVerticalReservedSpace)
                : (this.labelsReservedArea - BulletChart.BulletTitleHorizontalReservedSpace + 1);

            if (data.category) {
                length -= this.labelsReservedArea;
                svgTitle.text(data.category);
                TextMeasurementService.svgEllipsis(<SVGTextElement>svgTitle.node(), titleMaxWidth);
            }

            var svgSubtitle = labels
                .append('text')
                .classed('subtitle', true)
                .style('display', 'block')
                .text(this.settings.axis.measureUnits)
                .attr("fill", this.settings.axis.unitsColor);
            TextMeasurementService.svgEllipsis(<SVGTextElement>svgSubtitle.node(), titleMaxWidth);

            if (this.vertical) {
                length -= BulletChart.BulletLastTickVerticalReservedSpace;
                svgWrap.attr("transform", "rotate(90)translate(" + (this.reverse ? 0 : this.labelsReservedArea) + "," + (-BulletChart.BulletWidth - 70) + ")");
                svgTitle
                    .attr('transform', 'translate(62.5,' + (this.reverse ? length + 18 : 18) + ')')
                    .style('text-anchor', 'middle');
                svgSubtitle
                    .attr('transform', 'translate(62.5,' + (this.reverse ? length + 30 : 30) + ')')
                    .style('text-anchor', 'middle');
                svgRotate.attr('transform', 'translate(0,' + (this.reverse ? 5 : 0) + ')');
            } else {
                length -= BulletChart.BulletLastTickHorizontalReservedSpace;
                svgWrap.attr("transform", "translate(0)");
                svgTitle
                    .attr('transform', 'translate(' + (this.reverse ? 0 : - 10) + ',' + ((BulletChart.BulletWidth / 2) + 5) + ')')
                    .attr('x', (this.reverse ? length + 10 : 0))
                    .style('text-anchor', this.reverse ? 'start' : 'end')
                    .attr('width', this.labelsReservedArea);
                svgSubtitle
                    .attr('transform', 'translate(' + (this.reverse ? 0 : -BulletChart.BulletLastTickHorizontalReservedSpace) + ',' + (BulletChart.BulletWidth + 17) + ')')
                    .attr('x', (this.reverse ? length + BulletChart.BulletLastTickHorizontalReservedSpace : 0))
                    .style('text-anchor', this.reverse ? 'start' : 'end')
                    .attr('width', this.labelsReservedArea);

                if (data.category) {
                    svgRotate.attr('transform',
                        'translate(' + (this.reverse ? BulletChart.BulletLastTickHorizontalReservedSpace : this.labelsReservedArea) + ',5)');
                } else {
                    svgRotate.attr('transform', 'translate(15,5)');
                }
            }

            svgBullet.attr({
                'height': this.vertical ? this.viewportScroll.height : BulletChart.BulletHorizontalHeight,
                'width': this.vertical ? BulletChart.BulletVerticalWidth : this.viewportScroll.width
            })
                .style('opacity', (hasHighlights || hasSelection) ? ((!hasHighlights && data.selected) || data.highlight ? '1' : '0.4') : '1');

            //Scale on X-axis
            var scale = d3.scale.linear()
                .clamp(true)
                .domain([data.minimum, Math.max(sortedRanges[0], data.targetValue, data.value)])
                .range(this.vertical ? [length, 0] : [0, length]);

            //Set the color Scale
            var color = d3.scale.ordinal();
            if (data.good >= data.satisfactory) {
                color.domain([data.satisfactory, data.good, data.maximum])
                    .range([this.settings.colors.badColor, this.settings.colors.satisfactoryColor, this.settings.colors.goodColor]);
            }
            else {
                color.domain([data.satisfactory, data.good, data.maximum])
                    .range([this.settings.colors.satisfactoryColor, this.settings.colors.goodColor, this.settings.colors.badColor]);
            }

            //Ranges
            var range = svgWrap.selectAll('rect.range')
                .data(sortedRanges);

            range.enter()
                .append('rect')
                .attr('class', function (d, i) { return 'range s' + i; })
                .classed(BulletChart.ColumnClassName, true);

            range
                .attr("x", (this.vertical ? x => Math.round(scale(x)) : Math.round(scale(data.minimum))))
                .attr('width', function (d) { return Math.round(Math.abs(scale(d) - scale(data.minimum))); })
                .attr('height', Math.round(BulletChart.BulletWidth))
                .style({ "fill": color });
            //Comparison measure

            //Main measure
            var measure = svgWrap
                .append('rect')
                .classed('measure', true)
                .style('fill', this.settings.colors.bulletColor);

            measure
                .attr('width', Math.round(Math.abs(scale(data.value) - scale(data.minimum))))
                .attr('height', Math.round(BulletChart.BulletWidth / 3))
                .attr("x", Math.round(this.vertical ? scale(data.value) : scale(data.minimum)))
                .attr('y', Math.round(BulletChart.BulletWidth / 3));

            //Target markers
            var marker = svgWrap
                .append('line')
                .classed('marker', true);
            marker
                .attr('x1', Math.round(scale(data.targetValue)))
                .attr('x2', Math.round(scale(data.targetValue)))
                .attr('y1', Math.round(BulletChart.BulletWidth / 6))
                .attr('y2', Math.round(BulletChart.BulletWidth * 5 / 6))
                .style('stroke', this.settings.colors.bulletColor);

            //Ticks
            if (this.settings.axis.axis) {
                var xAxis = d3.svg.axis();
                xAxis.orient(this.vertical ? "left" : "bottom");
                var minTickSize = Math.round(Math.max(3, length / 100));
                var values = [data.value, data.targetValue, data.good, data.satisfactory, data.maximum, data.minimum]
                    .filter(x => !isNaN(x));
                xAxis.tickFormat(valueFormatter.create({
                    format: this.model.bulletValueFormatString,
                    value: values.length ? Math.max.apply(null, values) : 0
                }).format);
                xAxis.ticks(minTickSize);
                var axis = svgRotate.selectAll("g.axis").data([0]);
                axis.enter().append("g")
                    .attr("class", "axis")
                    .attr('transform', 'translate(' + (this.vertical ? 65 : 0) + ','
                        + Math.round((this.vertical ? (this.reverse ? 0 : this.labelsReservedArea) : BulletChart.BulletWidth)) + ')');
                axis.call(xAxis.scale(scale));
                axis.selectAll('line').style('stroke', this.settings.axis.axisColor);
                axis.selectAll('text').style('fill', this.settings.axis.axisColor);
            }

            TooltipManager.addTooltip(svgRotate, (tooltipEvent: TooltipEvent) => {
                return tooltipEvent.data.toolTipInfo;
            });
        }

        /*About to remove your visual, do clean up here */
        public destroy() { }

        private hasHighlightValues(dataView: DataView, series: number): boolean {
            var column = dataView && dataView.categorical && dataView.categorical.values && dataView.categorical.values.length > 0 ? dataView.categorical.values[series] : undefined;
            return column && !!column.highlights;
        }

        public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstance[] {
            var data = this.model;
            if (!data) {
                return;
            }

            var objectName = options.objectName;
            switch (objectName) {
                case 'values':
                    return this.enumerateValues(data);
                case 'orientation':
                    return this.enumerateOrientation(data);
                case 'axis':
                    return this.enumerateAxis(data);
                case 'colors':
                    return this.enumerateColors(data);
            }
        }

        private enumerateValues(data: BulletChartModel): VisualObjectInstance[] {
            return [{
                selector: null,
                objectName: 'values',
                properties: {
                    targetValue: this.settings.values.targetValue,
                    minimumPercent: this.settings.values.minimumPercent,
                    satisfactoryPercent: this.settings.values.satisfactoryPercent,
                    goodPercent: this.settings.values.goodPercent,
                    maximumPercent: this.settings.values.maximumPercent,
                }
            }];
        }

        private enumerateOrientation(data: BulletChartModel): VisualObjectInstance[] {
            return [{
                selector: null,
                objectName: 'orientation',
                properties: {
                    orientation: this.settings.orientation.orientation
                }
            }];
        }

        private enumerateAxis(data: BulletChartModel): VisualObjectInstance[] {
            return [{
                selector: null,
                objectName: 'axis',
                properties: {
                    axis: this.settings.axis.axis,
                    axisColor: this.settings.axis.axisColor,
                    measureUnits: this.settings.axis.measureUnits,
                    unitsColor: this.settings.axis.unitsColor,
                    measureColor: this.settings.axis.measureColor,
                    labelsReservedArea: this.labelsReservedArea,
                }
            }];
        }

        private enumerateColors(data: BulletChartModel): VisualObjectInstance[] {
            return [{
                selector: null,
                objectName: 'colors',
                properties: {
                    badColor: this.settings.colors.badColor,
                    satisfactoryColor: this.settings.colors.satisfactoryColor,
                    goodColor: this.settings.colors.goodColor,
                    bulletColor: this.settings.colors.bulletColor,
                }
            }];
        }
    }

    export interface BulletBehaviorOptions {
        bullets: D3.Selection;
        clearCatcher: D3.Selection;
        dataPoints: BulletDataPoint[];
        interactivityService: IInteractivityService;
        bulletChartSettings: BulletChartSettings;
        hasHighlights: boolean;
    }

    export class BulletWebBehavior implements IInteractiveBehavior {
        private options: BulletBehaviorOptions;

        public bindEvents(options: BulletBehaviorOptions, selectionHandler: ISelectionHandler) {
            this.options = options;
            var bullets = options.bullets;
            var clearCatcher = options.clearCatcher;

            bullets.selectAll(".wrap").on('click', (d: BulletDataPoint, i: number) => {
                d3.event.stopPropagation();
                selectionHandler.handleSelection(d, d3.event.ctrlKey);
            });

            clearCatcher.on('click', () => {
                selectionHandler.handleClearSelection();
            });
        }

        public renderSelection(hasSelection: boolean) {
            var options = this.options;
            options.bullets.style("opacity", (d: BulletDataPoint) => {
                return hasSelection ? (d.selected ? '1' : '0.4') : '1';
            });
        }
    }
}