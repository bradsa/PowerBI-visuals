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
    import ClassAndSelector = jsCommon.CssConstants.ClassAndSelector;

    interface ScatterChartMeasureMetadata {
        idx: {
            x?: number;
            y?: number;
            size?: number;
            colorFill?: number;
            shape?: number;
            image?: number;
            rotation?: number;
            backdrop?: number;
            xStart?: number;
            xEnd?: number;
            yStart?: number;
            yEnd?: number;
        };
        cols: {
            x?: DataViewMetadataColumn;
            y?: DataViewMetadataColumn;
            size?: DataViewMetadataColumn;
            colorFill?: DataViewMetadataColumn;
            shape?: DataViewMetadataColumn;
            image?: DataViewMetadataColumn;
            rotation?: DataViewMetadataColumn;
            backdrop?: DataViewMetadataColumn;
            xStart?: DataViewMetadataColumn;
            xEnd?: DataViewMetadataColumn;
            yStart?: DataViewMetadataColumn;
            yEnd?: DataViewMetadataColumn;
        };
        axesLabels: ChartAxesLabels;
    }

    export interface EnhancedScatterChartDataPoint extends SelectableDataPoint, TooltipEnabledDataPoint, LabelEnabledDataPoint {
        x: any;
        y: any;
        size: any;
        radius: RadiusData;
        fill: string;
        category: string;
        colorFill?: string;
        svgurl?: string;
        shapeSymbolType?: (number) => string;
        rotation: number;
        backdrop?: string;
        xStart?: number;
        xEnd?: number;
        yStart?: number;
        yEnd?: number;
    }

    export interface EnhancedScatterChartData {
        useShape: boolean;
        useCustomColor: boolean;
        backdrop?: {
            show: boolean;
            url: string;
        };
        outline?: boolean;
        crosshair?: boolean;
        xCol: DataViewMetadataColumn;
        yCol: DataViewMetadataColumn;
        dataPoints: EnhancedScatterChartDataPoint[];
        legendData: LegendData;
        axesLabels: ChartAxesLabels;
        size?: DataViewMetadataColumn;
        sizeRange: NumberRange;
        dataLabelsSettings: PointDataLabelsSettings;
        defaultDataPointColor?: string;
        showAllDataPoints?: boolean;
        hasDynamicSeries?: boolean;
        fillPoint?: boolean;
        colorBorder?: boolean;
        colorByCategory?: boolean;
        selectedIds: SelectionId[];
    }

    export class EnhancedScatterChart implements IVisual {
        private AxisGraphicsContextClassName = 'axisGraphicsContext';
        public static DefaultBubbleOpacity = 0.85;
        public static DimmedBubbleOpacity = 0.4;
        private static ClassName = 'enhancedScatterChart';
        private static MainGraphicsContextClassName = 'mainGraphicsContext';

        private static DotClasses: ClassAndSelector = {
            class: 'dot',
            selector: '.dot'
        };
        private static ImageClasses: ClassAndSelector = {
            class: 'img',
            selector: '.img'
        };

        private static get AxisLabelsTextProperties(): TextProperties {
            return {
                fontFamily: 'wf_segoe-ui_normal',
                fontSize: jsCommon.PixelConverter.toString(11),
            };
        }

        private static get LegendTextProperties(): TextProperties {
            return {
                fontFamily: "wf_segoe-ui_normal",
                fontSize: jsCommon.PixelConverter.toString(jsCommon.PixelConverter.toPoint(12)),
            };
        }

        private legend: ILegend;
        private svgScrollable: D3.Selection;
        private axisGraphicsContext: D3.Selection;
        private axisGraphicsContextScrollable: D3.Selection;
        private xAxisGraphicsContext: D3.Selection;
        private backgroundGraphicsContext: D3.Selection;
        private y1AxisGraphicsContext: D3.Selection;
        private svg: D3.Selection;
        private element: JQuery;
        private mainGraphicsContext: D3.Selection;
        private clearCatcher: D3.Selection;
        private mainGraphicsG: D3.Selection;

        private style: IVisualStyle;
        private data: EnhancedScatterChartData;
        private dataView: DataView;

        private xAxisProperties: IAxisProperties;
        private yAxisProperties: IAxisProperties;
        private colors: IDataColorPalette;
        private options: VisualInitOptions;
        private interactivity: InteractivityOptions;
        private cartesianVisualHost: ICartesianVisualHost;
        private isInteractiveChart: boolean;
        private interactivityService: IInteractivityService;
        private categoryAxisProperties: DataViewObject;
        private valueAxisProperties: DataViewObject;
        private yAxisOrientation: string;
        private scrollY: boolean;
        private scrollX: boolean;

        private dataViews: DataView[];
        private legendObjectProperties: DataViewObject;
        private hostServices: IVisualHostServices;
        private layerLegendData: LegendData;

        private cartesianSmallViewPortProperties: CartesianSmallViewPortProperties;
        private hasCategoryAxis: boolean;
        private yAxisIsCategorical: boolean;
        private bottomMarginLimit: number;
        private leftRightMarginLimit: number;
        private isXScrollBarVisible: boolean;
        private isYScrollBarVisible: boolean;
        private ScrollBarWidth = 10;
        private categoryAxisHasUnitType: boolean;
        private valueAxisHasUnitType: boolean;
        private svgDefaultImage: string;
        private crosshairCanvas: D3.Selection;
        private oldBackdrop: string;
        private behavior: IInteractiveBehavior;
        private animator: IGenericAnimator;
        private keyArray: string[];

        private _margin: IMargin;
        private get margin(): IMargin {
            return this._margin || { left: 0, right: 0, top: 0, bottom: 0 };
        }

        private set margin(value: IMargin) {
            this._margin = $.extend({}, value);
            this._viewportIn = EnhancedScatterChart.substractMargin(this.viewport, this.margin);
        }

        private _viewport: IViewport;
        private get viewport(): IViewport {
            return this._viewport || { width: 0, height: 0 };
        }

        private set viewport(value: IViewport) {
            this._viewport = $.extend({}, value);
            this._viewportIn = EnhancedScatterChart.substractMargin(this.viewport, this.margin);
        }

        private _viewportIn: IViewport;
        private get viewportIn(): IViewport {
            return this._viewportIn || this.viewport;
        }

        private get legendViewport(): IViewport {
            return this.legend.getMargins();
        }

        public static capabilities: VisualCapabilities = {
            dataRoles: [
                {
                    name: 'Category',
                    kind: VisualDataRoleKind.Grouping,
                    displayName: data.createDisplayNameGetter('Role_DisplayName_Details'),
                }, {
                    name: 'Series',
                    kind: VisualDataRoleKind.Grouping,
                    displayName: data.createDisplayNameGetter('Role_DisplayName_Legend'),
                }, {
                    name: 'X',
                    kind: VisualDataRoleKind.Measure,
                    displayName: data.createDisplayNameGetter('Role_DisplayName_X'),
                }, {
                    name: 'Y',
                    kind: VisualDataRoleKind.Measure,
                    displayName: data.createDisplayNameGetter('Role_DisplayName_Y'),
                }, {
                    name: 'Size',
                    kind: VisualDataRoleKind.Measure,
                    displayName: data.createDisplayNameGetter('Role_DisplayName_Size'),
                }, {
                    name: 'Gradient',
                    kind: VisualDataRoleKind.Measure,
                    displayName: data.createDisplayNameGetter('Role_DisplayName_Gradient'),
                }, {
                    name: 'ColorFill',
                    kind: VisualDataRoleKind.Measure,
                    displayName: 'Customized Color',
                }, {
                    name: 'Shape',
                    kind: VisualDataRoleKind.Measure,
                    displayName: 'Shape',
                }, {
                    name: 'Image',
                    kind: VisualDataRoleKind.Measure,
                    displayName: 'Image',
                }, {
                    name: 'Rotation',
                    kind: VisualDataRoleKind.Measure,
                    displayName: 'Rotation',
                }, {
                    name: 'Backdrop',
                    kind: VisualDataRoleKind.Measure,
                    displayName: 'Backdrop',
                }, {
                    name: 'X Start',
                    kind: VisualDataRoleKind.Measure,
                    displayName: 'X Start',
                }, {
                    name: 'X End',
                    kind: VisualDataRoleKind.Measure,
                    displayName: 'X End',
                }, {
                    name: 'Y Start',
                    kind: VisualDataRoleKind.Measure,
                    displayName: 'Y Start',
                }, {
                    name: 'Y End',
                    kind: VisualDataRoleKind.Measure,
                    displayName: 'Y End',
                }
            ],

            dataViewMappings: [{
                conditions: [{
                    'Category': { max: 1 }, 'Series': { max: 1 }, 'X': { max: 1 }, 'Y': { max: 1 },
                    'Size': { max: 1 }, 'Gradient': { max: 0 }, 'ColorFill': { max: 1 }, 'Shape': { max: 1 },
                    'Image': { max: 0 }, 'Rotation': { max: 1 }, 'Backdrop': { max: 1 }, 'X Start': { max: 1 },
                    'X End': { max: 1 }, 'Y Start': { max: 1 }, 'Y End': { max: 1 }
                }, {
                    'Category': { max: 1 }, 'Series': { max: 0 }, 'X': { max: 1 }, 'Y': { max: 1 },
                    'Size': { max: 1 }, 'Gradient': { max: 1 }, 'ColorFill': { max: 1 }, 'Shape': { max: 1 },
                    'Image': { max: 0 }, 'Rotation': { max: 1 }, 'Backdrop': { max: 1 }, 'X Start': { max: 1 },
                    'X End': { max: 1 }, 'Y Start': { max: 1 }, 'Y End': { max: 1 }
                }, {
                    'Category': { max: 1 }, 'Series': { max: 1 }, 'X': { max: 1 }, 'Y': { max: 1 },
                    'Size': { max: 1 }, 'Gradient': { max: 0 }, 'ColorFill': { max: 0 }, 'Shape': { max: 0 },
                    'Image': { max: 1 }, 'Rotation': { max: 1 }, 'Backdrop': { max: 1 }, 'X Start': { max: 1 },
                    'X End': { max: 1 }, 'Y Start': { max: 1 }, 'Y End': { max: 1 }
                }, {
                    'Category': { max: 1 }, 'Series': { max: 0 }, 'X': { max: 1 }, 'Y': { max: 1 },
                    'Size': { max: 1 }, 'Gradient': { max: 1 }, 'ColorFill': { max: 0 }, 'Shape': { max: 0 },
                    'Image': { max: 1 }, 'Rotation': { max: 1 }, 'Backdrop': { max: 1 }, 'X Start': { max: 1 },
                    'X End': { max: 1 }, 'Y Start': { max: 1 }, 'Y End': { max: 1 }
                }],
                categorical: {
                    categories: {
                        for: { in: 'Category' },
                        dataReductionAlgorithm: { sample: {} }
                    },
                    values: {
                        group: {
                            by: 'Series',
                            select: [
                                { bind: { to: 'X' } },
                                { bind: { to: 'Y' } },
                                { bind: { to: 'Size' } },
                                { bind: { to: 'Gradient' } },
                                { bind: { to: 'ColorFill' } },
                                { bind: { to: 'Shape' } },
                                { bind: { to: 'Image' } },
                                { bind: { to: 'Rotation' } },
                                { bind: { to: 'Backdrop' } },
                                { bind: { to: 'X Start' } },
                                { bind: { to: 'X End' } },
                                { bind: { to: 'Y Start' } },
                                { bind: { to: 'Y End' } },
                            ],
                            dataReductionAlgorithm: { top: {} }
                        }
                    },
                    rowCount: { preferred: { min: 2 } }
                },
            }],

            objects: {
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
                        useShape: {
                            displayName: data.createDisplayNameGetter('Visual_UseImage'),
                            type: { bool: true }
                        },
                        fill: {
                            displayName: data.createDisplayNameGetter('Visual_Fill'),
                            type: { fill: { solid: { color: true } } }
                        },
                        fillRule: {
                            displayName: data.createDisplayNameGetter('Visual_Gradient'),
                            type: { fillRule: {} },
                            rule: {
                                inputRole: 'Gradient',
                                output: {
                                    property: 'fill',
                                    selector: ['Category'],
                                },
                            }
                        }
                    }
                },
                general: {
                    displayName: data.createDisplayNameGetter('Visual_General'),
                    properties: {
                        formatString: {
                            type: { formatting: { formatString: true } },
                        },
                    },
                },
                categoryAxis: {
                    displayName: data.createDisplayNameGetter('Visual_XAxis'),
                    properties: {
                        show: {
                            displayName: data.createDisplayNameGetter('Visual_Show'),
                            type: { bool: true }
                        },
                        axisScale: {
                            displayName: data.createDisplayNameGetter('Visual_Axis_Scale'),
                            type: { formatting: { axisScale: true } }
                        },
                        start: {
                            displayName: data.createDisplayNameGetter('Visual_Axis_Start'),
                            type: { numeric: true }
                        },
                        end: {
                            displayName: data.createDisplayNameGetter('Visual_Axis_End'),
                            type: { numeric: true }
                        },
                        showAxisTitle: {
                            displayName: data.createDisplayNameGetter('Visual_Axis_Title'),
                            type: { bool: true }
                        },
                        axisStyle: {
                            displayName: data.createDisplayNameGetter('Visual_Axis_Style'),
                            type: { formatting: { axisStyle: true } }
                        },
                        axisColor: {
                            displayName: 'Color',
                            type: { fill: { solid: { color: true } } }
                        }
                    }
                },
                valueAxis: {
                    displayName: data.createDisplayNameGetter('Visual_YAxis'),
                    properties: {
                        show: {
                            displayName: data.createDisplayNameGetter('Visual_Show'),
                            type: { bool: true }
                        },
                        position: {
                            displayName: data.createDisplayNameGetter('Visual_YAxis_Position'),
                            type: { formatting: { yAxisPosition: true } }
                        },
                        axisScale: {
                            displayName: data.createDisplayNameGetter('Visual_Axis_Scale'),
                            type: { formatting: { axisScale: true } }
                        },
                        start: {
                            displayName: data.createDisplayNameGetter('Visual_Axis_Start'),
                            type: { numeric: true }
                        },
                        end: {
                            displayName: data.createDisplayNameGetter('Visual_Axis_End'),
                            type: { numeric: true }
                        },
                        showAxisTitle: {
                            displayName: data.createDisplayNameGetter('Visual_Axis_Title'),
                            type: { bool: true }
                        },
                        axisStyle: {
                            displayName: data.createDisplayNameGetter('Visual_Axis_Style'),
                            type: { formatting: { axisStyle: true } }
                        },
                        axisColor: {
                            displayName: 'Color',
                            type: { fill: { solid: { color: true } } }
                        }
                    }
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
                categoryLabels: {
                    displayName: data.createDisplayNameGetter('Visual_CategoryLabels'),
                    properties: {
                        show: {
                            displayName: data.createDisplayNameGetter('Visual_Show'),
                            type: { bool: true }
                        },
                        color: {
                            displayName: data.createDisplayNameGetter('Visual_LabelsFill'),
                            type: { fill: { solid: { color: true } } }
                        },
                    },
                },
                fillPoint: {
                    displayName: data.createDisplayNameGetter('Visual_FillPoint'),
                    properties: {
                        show: {
                            displayName: data.createDisplayNameGetter('Visual_Fill'),
                            type: { bool: true }
                        },
                    },
                },
                backdrop: {
                    displayName: 'Backdrop',
                    properties: {
                        show: {
                            displayName: data.createDisplayNameGetter('Visual_Show'),
                            type: { bool: true }
                        },
                        url: {
                            displayName: 'Image URL',
                            type: { text: true }
                        },
                    },
                },
                crosshair: {
                    displayName: 'Crosshair',
                    properties: {
                        show: {
                            displayName: 'Crosshair',
                            type: { bool: true }
                        },
                    },
                },
                outline: {
                    displayName: 'Outline',
                    properties: {
                        show: {
                            displayName: data.createDisplayNameGetter('Visual_Outline'),
                            type: { bool: true }
                        }
                    }
                }
            }
        };

        private static substractMargin(viewport: IViewport, margin: IMargin): IViewport {
            return {
                width: Math.max(viewport.width - (margin.left + margin.right), 0),
                height: Math.max(viewport.height - (margin.top + margin.bottom), 0)
            };
        }

        private static getCustomSymbolType(shape: any): (number) => string {
            var customSymbolTypes = d3.map({
                "circle": (size) => {
                    var r = Math.sqrt(size / Math.PI);
                    return "M0," + r + "A" + r + "," + r + " 0 1,1 0," + (-r) + "A" + r + "," + r + " 0 1,1 0," + r + "Z";
                },

                "cross": function (size) {
                    var r = Math.sqrt(size / 5) / 2;
                    return "M" + -3 * r + "," + -r
                        + "H" + -r + "V" + -3 * r + "H" + r + "V" + -r + "H" + 3 * r + "V" + r + "H" + r + "V" + 3 * r + "H" + -r + "V" + r + "H" + -3 * r + "Z";
                },

                "diamond": (size) => {
                    var ry = Math.sqrt(size / (2 * Math.tan(Math.PI / 6))),
                        rx = ry * Math.tan(Math.PI / 6);
                    return "M0," + -ry
                        + "L" + rx + ",0"
                        + " 0," + ry
                        + " " + -rx + ",0"
                        + "Z";
                },

                "square": (size) => {
                    var r = Math.sqrt(size) / 2;
                    return "M" + -r + "," + -r
                        + "L" + r + "," + -r
                        + " " + r + "," + r
                        + " " + -r + "," + r
                        + "Z";
                },

                "triangle-up": (size) => {
                    var rx = Math.sqrt(size / Math.sqrt(3)),
                        ry = rx * Math.sqrt(3) / 2;
                    return "M0," + -ry
                        + "L" + rx + "," + ry
                        + " " + -rx + "," + ry
                        + "Z";
                },

                "triangle-down": (size) => {
                    var rx = Math.sqrt(size / Math.sqrt(3)),
                        ry = rx * Math.sqrt(3) / 2;
                    return "M0," + ry
                        + "L" + rx + "," + -ry
                        + " " + -rx + "," + -ry
                        + "Z";
                },

                'star': (size) => {
                    var outerRadius = Math.sqrt(size / 2);
                    var innerRadius = Math.sqrt(size / 10);
                    var results = "";
                    var angle = Math.PI / 5;
                    for (var i = 0; i < 10; i++) {
                        // Use outer or inner radius depending on what iteration we are in.
                        var r = (i & 1) === 0 ? outerRadius : innerRadius;
                        var currX = Math.cos(i * angle) * r;
                        var currY = Math.sin(i * angle) * r;
                        // Our first time we simply append the coordinates, subsequet times
                        // we append a ", " to distinguish each coordinate pair.
                        if (i === 0) {
                            results = "M" + currX + "," + currY + "L";
                        } else {
                            results += " " + currX + "," + currY;
                        }
                    }
                    return results + "Z";
                },

                'hexagon': (size) => {
                    var r = Math.sqrt(size / (6 * Math.sqrt(3)));
                    var r2 = Math.sqrt(size / (2 * Math.sqrt(3)));

                    return "M0," + (2 * r) + "L" + (-r2) + "," + r + " " + (-r2) + "," + (-r) + " 0," + (-2 * r) + " " + r2 + "," + (-r) + " " + r2 + "," + r + "Z";
                },

                'x': (size) => {
                    var r = Math.sqrt(size / 10);
                    return "M0," + r + "L" + (-r) + "," + 2 * r + " " + (-2 * r) + "," + r + " " + (-r) + ",0 " + (-2 * r) + "," + (-r) + " " + (-r) + "," + (-2 * r) + " 0," + (-r) + " " + r + "," + (-2 * r) + " " + (2 * r) + "," + (-r) + " " + r + ",0 " + (2 * r) + "," + r + " " + r + "," + (2 * r) + "Z";
                },

                'uparrow': (size) => {
                    var r = Math.sqrt(size / 12);
                    return "M" + r + "," + (3 * r) + "L" + (-r) + "," + (3 * r) + " " + (-r) + "," + (-r) + " " + (-2 * r) + "," + (-r) + " 0," + (-3 * r) + " " + (2 * r) + "," + (-r) + " " + r + "," + (-r) + "Z";
                },

                'downarrow': (size) => {
                    var r = Math.sqrt(size / 12);
                    return "M0," + (3 * r) + "L" + (-2 * r) + "," + r + " " + (-r) + "," + r + " " + (-r) + "," + (-3 * r) + " " + r + "," + (-3 * r) + " " + r + "," + r + " " + (2 * r) + "," + r + "Z";
                }
            });

            var defaultValue = customSymbolTypes.entries()[0].value;
            if (!shape) {
                return defaultValue;
            } else if (isNaN(shape)) {
                return customSymbolTypes[shape && shape.toString().toLowerCase()] || defaultValue;
            } else {
                var result = customSymbolTypes.entries()[Math.floor(shape)];
                return result ? result.value : defaultValue;
            }
        }

        public init(options: VisualInitOptions): void {
            this.options = options;
            this.animator = new BaseAnimator();
            this.behavior = new CartesianChartBehavior([new ScatterChartWebBehavior()]);
            var element = this.element = options.element;
            this.viewport = options.viewport;
            this.style = options.style;
            this.hostServices = options.host;
            this.colors = this.style.colorPalette.dataColors;
            this.interactivity = options.interactivity;
            this.isInteractiveChart = options.interactivity && options.interactivity.isInteractiveLegend;
            this.margin = {
                top: 1,
                right: 1,
                bottom: 1,
                left: 1
            };
            element.addClass(EnhancedScatterChart.ClassName);

            this.yAxisOrientation = yAxisPosition.left;
            this.adjustMargins();

            var showLinesOnX = this.scrollY = true;

            var showLinesOnY = this.scrollX = true;

            var svg = this.svg = d3.select(element.get(0)).append('svg');
            svg.style('position', 'absolute');

            var axisGraphicsContext = this.axisGraphicsContext = svg.append('g')
                .classed(this.AxisGraphicsContextClassName, true);

            this.svgScrollable = svg.append('svg')
                .classed('svgScrollable', true)
                .style('overflow', 'hidden');

            var axisGraphicsContextScrollable = this.axisGraphicsContextScrollable = this.svgScrollable.append('g')
                .classed(this.AxisGraphicsContextClassName, true);

            this.clearCatcher = appendClearCatcher(this.axisGraphicsContextScrollable);
            var axisGroup = showLinesOnX ? axisGraphicsContextScrollable : axisGraphicsContext;

            this.backgroundGraphicsContext = axisGraphicsContext.append('svg:image');
            this.xAxisGraphicsContext = showLinesOnX ? axisGraphicsContext.append('g').attr('class', 'x axis') : axisGraphicsContextScrollable.append('g').attr('class', 'x axis');
            this.y1AxisGraphicsContext = axisGroup.append('g').attr('class', 'y axis');

            this.xAxisGraphicsContext.classed('showLinesOnAxis', showLinesOnX);
            this.y1AxisGraphicsContext.classed('showLinesOnAxis', showLinesOnY);

            this.xAxisGraphicsContext.classed('hideLinesOnAxis', !showLinesOnX);
            this.y1AxisGraphicsContext.classed('hideLinesOnAxis', !showLinesOnY);
            this.interactivityService = createInteractivityService(this.hostServices);

            this.legend = createLegend(
                element,
                options.interactivity && options.interactivity.isInteractiveLegend, this.interactivityService,
                false);

            this.mainGraphicsG = this.axisGraphicsContextScrollable.append('g')
                .classed(EnhancedScatterChart.MainGraphicsContextClassName, true);

            this.crosshairCanvas = this.mainGraphicsG.append('g');
            this.mainGraphicsContext = this.mainGraphicsG.append('svg');
            this.svgDefaultImage = "http://svg-edit.googlecode.com/svn-history/r1771/trunk/clipart/sun.svg";
            this.keyArray = [];
        }

        private adjustMargins(): void {
            // Adjust margins if ticks are not going to be shown on either axis
            var xAxis = this.element.find('.x.axis');

            if (AxisHelper.getRecommendedNumberOfTicksForXAxis(this.viewportIn.width) === 0
                && AxisHelper.getRecommendedNumberOfTicksForYAxis(this.viewportIn.height) === 0) {
                this.margin = {
                    top: 0,
                    right: 0,
                    bottom: 0,
                    left: 0
                };
                xAxis.hide();
            } else {
                xAxis.show();
            }
        }

        private getValueAxisProperties(dataViewMetadata: DataViewMetadata, axisTitleOnByDefault?: boolean): DataViewObject {
            var toReturn: DataViewObject = {};
            if (!dataViewMetadata)
                return toReturn;

            var objects = dataViewMetadata.objects;

            if (objects) {
                var valueAxisObject = objects['valueAxis'];
                if (valueAxisObject) {
                    toReturn = {
                        show: valueAxisObject['show'],
                        position: valueAxisObject['position'],
                        axisScale: valueAxisObject['axisScale'],
                        start: valueAxisObject['start'],
                        end: valueAxisObject['end'],
                        showAxisTitle: valueAxisObject['showAxisTitle'] == null ? axisTitleOnByDefault : valueAxisObject['showAxisTitle'],
                        axisStyle: valueAxisObject['axisStyle'],
                        axisColor: valueAxisObject['axisColor'],
                        secShow: valueAxisObject['secShow'],
                        secPosition: valueAxisObject['secPosition'],
                        secAxisScale: valueAxisObject['secAxisScale'],
                        secStart: valueAxisObject['secStart'],
                        secEnd: valueAxisObject['secEnd'],
                        secShowAxisTitle: valueAxisObject['secShowAxisTitle'],
                        secAxisStyle: valueAxisObject['secAxisStyle']
                    };
                }
            }
            return toReturn;
        }

        private getCategoryAxisProperties(dataViewMetadata: DataViewMetadata, axisTitleOnByDefault?: boolean): DataViewObject {
            var toReturn: DataViewObject = {};
            if (!dataViewMetadata)
                return toReturn;

            var objects = dataViewMetadata.objects;

            if (objects) {
                var categoryAxisObject = objects['categoryAxis'];

                if (categoryAxisObject) {
                    toReturn = {
                        show: categoryAxisObject['show'],
                        axisType: categoryAxisObject['axisType'],
                        axisScale: categoryAxisObject['axisScale'],
                        axisColor: categoryAxisObject['axisColor'],
                        start: categoryAxisObject['start'],
                        end: categoryAxisObject['end'],
                        showAxisTitle: categoryAxisObject['showAxisTitle'] == null ? axisTitleOnByDefault : categoryAxisObject['showAxisTitle'],
                        axisStyle: categoryAxisObject['axisStyle']
                    };
                }
            }
            return toReturn;
        }

        public static converter(dataView: DataView, currentViewport: IViewport, colorPalette: IDataColorPalette, interactivityService?: IInteractivityService, categoryAxisProperties?: DataViewObject, valueAxisProperties?: DataViewObject): EnhancedScatterChartData {
            var categoryValues: any[],
                categoryFormatter: IValueFormatter,
                categoryObjects: DataViewObjects[],
                categoryIdentities: DataViewScopeIdentity[],
                categoryQueryName: string;

            var dataViewCategorical: DataViewCategorical = dataView.categorical;
            var dataViewMetadata: DataViewMetadata = dataView.metadata;

            if (dataViewCategorical.categories && dataViewCategorical.categories.length > 0) {
                categoryValues = dataViewCategorical.categories[0].values;
                categoryFormatter = valueFormatter.create({ format: valueFormatter.getFormatString(dataViewCategorical.categories[0].source, scatterChartProps.general.formatString), value: categoryValues[0], value2: categoryValues[categoryValues.length - 1] });
                categoryIdentities = dataViewCategorical.categories[0].identity;
                categoryObjects = dataViewCategorical.categories[0].objects;
                categoryQueryName = dataViewCategorical.categories[0].source.queryName;
            }
            else {
                categoryValues = [null];
                // creating default formatter for null value (to get the right string of empty value from the locale)
                categoryFormatter = valueFormatter.createDefaultFormatter(null);
            }
            var categories = dataViewCategorical.categories;
            var dataValues = dataViewCategorical.values;
            var hasDynamicSeries = !!dataValues.source;
            var grouped = dataValues.grouped();
            var useShape = (!!(DataRoleHelper.getMeasureIndexOfRole(grouped, 'Image') >= 0)) ? false : true;
            var useCustomColor = (!!(DataRoleHelper.getMeasureIndexOfRole(grouped, 'ColorFill') >= 0)) ? true : false;
            var dvSource = dataValues.source;
            var scatterMetadata = EnhancedScatterChart.getMetadata(grouped, dvSource);
            var dataLabelsSettings = dataLabelUtils.getDefaultPointLabelSettings();
            var fillPoint = false;
            var backdrop = { show: false, url: "" };
            var crosshair = false;
            var outline = false;

            if (dataViewMetadata && dataViewMetadata.objects) {
                var objects = dataViewMetadata.objects;

                var defaultDataPointColor = DataViewObjects.getFillColor(objects, columnChartProps.dataPoint.defaultColor);
                var showAllDataPoints = DataViewObjects.getValue<boolean>(objects, columnChartProps.dataPoint.showAllDataPoints);
                /*if(objects['dataPoint']){
                    var shapeObj = objects['dataPoint'];
                    if(shapeObj['useShape']){
                        shape = <boolean>shapeObj['useShape'];
                    }
                }*/

                var labelsObj = objects['categoryLabels'];
                if (labelsObj) {
                    dataLabelsSettings.show = (labelsObj['show'] !== undefined) ? <boolean>labelsObj['show'] : dataLabelsSettings.show;
                    dataLabelsSettings.precision = (labelsObj['labelsPrecision'] !== undefined) ? +<string>labelsObj['labelsPrecision'] : dataLabelsSettings.precision;
                    if (labelsObj['color'] !== undefined) {
                        dataLabelsSettings.labelColor = (<Fill>labelsObj['color']).solid.color;
                    }
                }

                fillPoint = DataViewObjects.getValue(objects, scatterChartProps.fillPoint.show, fillPoint);

                var backdropObject = objects['backdrop'];
                if (backdropObject !== undefined) {
                    backdrop.show = <boolean>backdropObject['show'];
                    if (backdrop.show) {
                        backdrop.url = <string>backdropObject['url'];
                    }
                }
                var crosshairObject = objects['crosshair'];
                if (crosshairObject !== undefined) {
                    crosshair = <boolean>crosshairObject['show'];
                }
                var outlineObject = objects['outline'];
                if (outlineObject !== undefined) {
                    outline = <boolean>outlineObject['show'];
                }
            }

            var dataPoints = EnhancedScatterChart.createDataPoints(
                dataValues,
                scatterMetadata,
                categories,
                categoryValues,
                categoryFormatter,
                categoryIdentities,
                categoryObjects,
                colorPalette,
                hasDynamicSeries,
                dataLabelsSettings,
                defaultDataPointColor,
                categoryQueryName);

            if (interactivityService) {
                interactivityService.applySelectionStateToData(dataPoints);
            }

            var legendItems = hasDynamicSeries
                ? EnhancedScatterChart.createSeriesLegend(dataValues, colorPalette, dataValues, valueFormatter.getFormatString(dvSource, scatterChartProps.general.formatString), defaultDataPointColor)
                : [];

            var legendTitle = dataValues && dvSource ? dvSource.displayName : "";
            if (!legendTitle) {
                legendTitle = categories && categories[0].source.displayName ? categories[0].source.displayName : "";
            }

            var legendData = { title: legendTitle, dataPoints: legendItems };

            var sizeRange = EnhancedScatterChart.getSizeRangeForGroups(grouped, scatterMetadata.idx.size);

            if (categoryAxisProperties && categoryAxisProperties["showAxisTitle"] !== null && categoryAxisProperties["showAxisTitle"] === false) {
                scatterMetadata.axesLabels.x = null;
            }
            if (valueAxisProperties && valueAxisProperties["showAxisTitle"] !== null && valueAxisProperties["showAxisTitle"] === false) {
                scatterMetadata.axesLabels.y = null;
            }

            if (dataPoints && dataPoints[0]) {
                var point = dataPoints[0];
                if (point.backdrop != null) {
                    backdrop.show = true;
                    backdrop.url = point.backdrop;
                }
                if (point.xStart != null) {
                    categoryAxisProperties['start'] = point.xStart;
                }
                if (point.xEnd != null) {
                    categoryAxisProperties['end'] = point.xEnd;
                }
                if (point.yStart != null) {
                    valueAxisProperties['start'] = point.yStart;
                }
                if (point.yEnd != null) {
                    valueAxisProperties['end'] = point.yEnd;
                }
            }

            return {
                xCol: scatterMetadata.cols.x,
                yCol: scatterMetadata.cols.y,
                dataPoints: dataPoints,
                legendData: legendData,
                axesLabels: scatterMetadata.axesLabels,
                selectedIds: [],
                size: scatterMetadata.cols.size,
                sizeRange: sizeRange,
                dataLabelsSettings: dataLabelsSettings,
                defaultDataPointColor: defaultDataPointColor,
                hasDynamicSeries: hasDynamicSeries,
                showAllDataPoints: showAllDataPoints,
                fillPoint: fillPoint,
                useShape: useShape,
                useCustomColor: useCustomColor,
                backdrop: backdrop,
                crosshair: crosshair,
                outline: outline
            };
        }

        private static createSeriesLegend(
            dataValues: DataViewValueColumns,
            colorPalette: IDataColorPalette,
            categorical: DataViewValueColumns,
            formatString: string,
            defaultDataPointColor: string): LegendDataPoint[] {

            var grouped = dataValues.grouped();
            var colorHelper = new ColorHelper(colorPalette, scatterChartProps.dataPoint.fill, defaultDataPointColor);

            var legendItems: LegendDataPoint[] = [];
            for (var i = 0, len = grouped.length; i < len; i++) {
                var grouping = grouped[i];
                var color = colorHelper.getColorForSeriesValue(grouping.objects, dataValues.identityFields, grouping.name);

                legendItems.push({
                    color: color,
                    icon: LegendIcon.Circle,
                    label: valueFormatter.format(grouping.name, formatString),
                    identity: grouping.identity ? SelectionId.createWithId(grouping.identity) : SelectionId.createNull(),
                    selected: false,
                });
            }

            return legendItems;
        }

        private static getSizeRangeForGroups(
            dataViewValueGroups: DataViewValueColumnGroup[],
            sizeColumnIndex: number): NumberRange {

            var result: NumberRange = {};
            if (dataViewValueGroups) {
                dataViewValueGroups.forEach((group) => {
                    var sizeColumn = ScatterChart.getMeasureValue(sizeColumnIndex, group.values);
                    var currentRange: NumberRange = AxisHelper.getRangeForColumn(sizeColumn);
                    if (result.min == null || result.min > currentRange.min) {
                        result.min = currentRange.min;
                    }
                    if (result.max == null || result.max < currentRange.max) {
                        result.max = currentRange.max;
                    }
                });
            }
            return result;
        }

        private static getMetadata(grouped: DataViewValueColumnGroup[], source: DataViewMetadataColumn): ScatterChartMeasureMetadata {
            var xIndex = DataRoleHelper.getMeasureIndexOfRole(grouped, 'X');
            var yIndex = DataRoleHelper.getMeasureIndexOfRole(grouped, 'Y');
            var sizeIndex = DataRoleHelper.getMeasureIndexOfRole(grouped, 'Size');

            var gradientIndex = DataRoleHelper.getMeasureIndexOfRole(grouped, 'Gradient');
            var colorFillIndex = DataRoleHelper.getMeasureIndexOfRole(grouped, 'ColorFill');
            var shapeIndex = DataRoleHelper.getMeasureIndexOfRole(grouped, 'Shape');
            var imageIndex = DataRoleHelper.getMeasureIndexOfRole(grouped, 'Image');
            var rotationIndex = DataRoleHelper.getMeasureIndexOfRole(grouped, 'Rotation');
            var backdropIndex = DataRoleHelper.getMeasureIndexOfRole(grouped, 'Backdrop');
            var xStartIndex = DataRoleHelper.getMeasureIndexOfRole(grouped, 'X Start');
            var xEndIndex = DataRoleHelper.getMeasureIndexOfRole(grouped, 'X End');
            var yStartIndex = DataRoleHelper.getMeasureIndexOfRole(grouped, 'Y Start');
            var yEndIndex = DataRoleHelper.getMeasureIndexOfRole(grouped, 'Y End');
            var xCol: DataViewMetadataColumn;
            var yCol: DataViewMetadataColumn;
            var sizeCol: DataViewMetadataColumn;
            var colorFillCol: DataViewMetadataColumn;
            var shapeCol: DataViewMetadataColumn;
            var imageCol: DataViewMetadataColumn;
            var rotationCol: DataViewMetadataColumn;
            var backdropCol: DataViewMetadataColumn;
            var xStartCol: DataViewMetadataColumn;
            var xEndCol: DataViewMetadataColumn;
            var yStartCol: DataViewMetadataColumn;
            var yEndCol: DataViewMetadataColumn;
            var xAxisLabel = "";
            var yAxisLabel = "";

            if (grouped && grouped.length) {
                var firstGroup = grouped[0],
                    measureCount = firstGroup.values.length;

                if (!(xIndex >= 0))
                    xIndex = EnhancedScatterChart.getDefaultMeasureIndex(measureCount, [yIndex, sizeIndex, gradientIndex, colorFillIndex, shapeIndex, imageIndex, rotationIndex, backdropIndex, xStartIndex, xEndIndex, yStartIndex, yEndIndex]);
                if (!(yIndex >= 0))
                    yIndex = EnhancedScatterChart.getDefaultMeasureIndex(measureCount, [xIndex, sizeIndex, gradientIndex, colorFillIndex, shapeIndex, imageIndex, rotationIndex, backdropIndex, xStartIndex, xEndIndex, yStartIndex, yEndIndex]);
                if (!(sizeIndex >= 0))
                    sizeIndex = EnhancedScatterChart.getDefaultMeasureIndex(measureCount, [xIndex, yIndex, gradientIndex, colorFillIndex, shapeIndex, imageIndex, rotationIndex, backdropIndex, xStartIndex, xEndIndex, yStartIndex, yEndIndex]);
                if (!(colorFillIndex >= 0))
                    colorFillIndex = EnhancedScatterChart.getDefaultMeasureIndex(measureCount, [xIndex, yIndex, sizeIndex, gradientIndex, shapeIndex, imageIndex, rotationIndex, backdropIndex, xStartIndex, xEndIndex, yStartIndex, yEndIndex]);
                if (!(shapeIndex >= 0))
                    shapeIndex = EnhancedScatterChart.getDefaultMeasureIndex(measureCount, [xIndex, yIndex, sizeIndex, gradientIndex, colorFillIndex, imageIndex, rotationIndex, backdropIndex, xStartIndex, xEndIndex, yStartIndex, yEndIndex]);
                if (!(imageIndex >= 0)) {
                    imageIndex = EnhancedScatterChart.getDefaultMeasureIndex(measureCount, [xIndex, yIndex, sizeIndex, gradientIndex, colorFillIndex, shapeIndex, rotationIndex, backdropIndex, xStartIndex, xEndIndex, yStartIndex, yEndIndex]);
                }
                if (!(rotationIndex >= 0))
                    rotationIndex = EnhancedScatterChart.getDefaultMeasureIndex(measureCount, [xIndex, yIndex, sizeIndex, gradientIndex, colorFillIndex, shapeIndex, imageIndex, backdropIndex, xStartIndex, xEndIndex, yStartIndex, yEndIndex]);
                if (!(backdropIndex >= 0))
                    backdropIndex = EnhancedScatterChart.getDefaultMeasureIndex(measureCount, [xIndex, yIndex, sizeIndex, gradientIndex, colorFillIndex, shapeIndex, imageIndex, rotationIndex, xStartIndex, xEndIndex, yStartIndex, yEndIndex]);
                if (!(xStartIndex >= 0))
                    xStartIndex = EnhancedScatterChart.getDefaultMeasureIndex(measureCount, [xIndex, yIndex, sizeIndex, gradientIndex, colorFillIndex, shapeIndex, imageIndex, rotationIndex, backdropIndex, xEndIndex, yStartIndex, yEndIndex]);
                if (!(xEndIndex >= 0))
                    xEndIndex = EnhancedScatterChart.getDefaultMeasureIndex(measureCount, [xIndex, yIndex, sizeIndex, gradientIndex, colorFillIndex, shapeIndex, imageIndex, rotationIndex, backdropIndex, xStartIndex, yStartIndex, yEndIndex]);
                if (!(yStartIndex >= 0))
                    yStartIndex = EnhancedScatterChart.getDefaultMeasureIndex(measureCount, [xIndex, yIndex, sizeIndex, gradientIndex, colorFillIndex, shapeIndex, imageIndex, rotationIndex, backdropIndex, xStartIndex, xEndIndex, yEndIndex]);
                if (!(yEndIndex >= 0))
                    yEndIndex = EnhancedScatterChart.getDefaultMeasureIndex(measureCount, [xIndex, yIndex, sizeIndex, gradientIndex, colorFillIndex, shapeIndex, imageIndex, rotationIndex, backdropIndex, xStartIndex, xEndIndex, yStartIndex]);

                if (xIndex >= 0) {
                    xCol = firstGroup.values[xIndex].source;
                    xAxisLabel = firstGroup.values[xIndex].source.displayName;
                }
                if (yIndex >= 0) {
                    yCol = firstGroup.values[yIndex].source;
                    yAxisLabel = firstGroup.values[yIndex].source.displayName;
                }
                if (sizeIndex >= 0) {
                    sizeCol = firstGroup.values[sizeIndex].source;
                }
                if (colorFillIndex >= 0) {
                    colorFillCol = firstGroup.values[colorFillIndex].source;
                }
                if (shapeIndex >= 0) {
                    shapeCol = firstGroup.values[shapeIndex].source;
                }
                if (imageIndex >= 0) {
                    imageCol = firstGroup.values[imageIndex].source;
                }
                if (rotationIndex >= 0) {
                    rotationCol = firstGroup.values[rotationIndex].source;
                }

                if (backdropIndex >= 0) {
                    backdropCol = firstGroup.values[backdropIndex].source;
                }
                if (xStartIndex >= 0) {
                    xStartCol = firstGroup.values[xStartIndex].source;
                }
                if (xEndIndex >= 0) {
                    xEndCol = firstGroup.values[xEndIndex].source;
                }
                if (yStartIndex >= 0) {
                    yStartCol = firstGroup.values[yStartIndex].source;
                }
                if (yEndIndex >= 0) {
                    yEndCol = firstGroup.values[yEndIndex].source;
                }
            }

            return {
                idx: {
                    x: xIndex,
                    y: yIndex,
                    size: sizeIndex,
                    colorFill: colorFillIndex,
                    shape: shapeIndex,
                    image: imageIndex,
                    rotation: rotationIndex,
                    backdrop: backdropIndex,
                    xStart: xStartIndex,
                    xEnd: xEndIndex,
                    yStart: yStartIndex,
                    yEnd: yEndIndex,
                },
                cols: {
                    x: xCol,
                    y: yCol,
                    size: sizeCol,
                    colorFill: colorFillCol,
                    shape: shapeCol,
                    image: imageCol,
                    rotation: rotationCol,
                    backdrop: backdropCol,
                    xStart: xStartCol,
                    xEnd: xEndCol,
                    yStart: yStartCol,
                    yEnd: yEndCol,
                },
                axesLabels: {
                    x: xAxisLabel,
                    y: yAxisLabel
                }
            };
        }

        private static getDefaultMeasureIndex(count: number, usedIndexes: number[]): number {
            for (var i = 0; i < count; i++) {
                var found = true;
                for (var j = 0; j < usedIndexes.length; j++) {
                    if (i === usedIndexes[j]) {
                        found = false;
                        break;
                    }
                }
                if (found === true) {
                    return i;
                }
            }
            return -1;
        }

        private static createDataPoints(
            dataValues: DataViewValueColumns,
            metadata: ScatterChartMeasureMetadata,
            categories: DataViewCategoryColumn[],
            categoryValues: any[],
            categoryFormatter: IValueFormatter,
            categoryIdentities: DataViewScopeIdentity[],
            categoryObjects: DataViewObjects[],
            colorPalette: IDataColorPalette,
            hasDynamicSeries: boolean,
            labelSettings: PointDataLabelsSettings,
            defaultDataPointColor?: string,
            categoryQueryName?: string): EnhancedScatterChartDataPoint[] {

            var dataPoints: EnhancedScatterChartDataPoint[] = [],
                indicies = metadata.idx,
                formatStringProp = scatterChartProps.general.formatString,
                dataValueSource = dataValues.source,
                grouped = dataValues.grouped();

            var colorHelper = new ColorHelper(colorPalette, scatterChartProps.dataPoint.fill, defaultDataPointColor);

            for (var categoryIdx = 0, ilen = categoryValues.length; categoryIdx < ilen; categoryIdx++) {
                var categoryValue = categoryValues[categoryIdx];

                for (var seriesIdx = 0, len = grouped.length; seriesIdx < len; seriesIdx++) {
                    var grouping = grouped[seriesIdx];
                    var seriesValues = grouping.values;
                    var measureX = ScatterChart.getMeasureValue(indicies.x, seriesValues);
                    var measureY = ScatterChart.getMeasureValue(indicies.y, seriesValues);
                    var measureSize = ScatterChart.getMeasureValue(indicies.size, seriesValues);
                    var measureColorFill = ScatterChart.getMeasureValue(indicies.colorFill, seriesValues);
                    var measureShape = ScatterChart.getMeasureValue(indicies.shape, seriesValues);
                    var measureImage = ScatterChart.getMeasureValue(indicies.image, seriesValues);
                    var measureRotation = ScatterChart.getMeasureValue(indicies.rotation, seriesValues);
                    var measureBackdrop = ScatterChart.getMeasureValue(indicies.backdrop, seriesValues);
                    var measureXStart = ScatterChart.getMeasureValue(indicies.xStart, seriesValues);
                    var measureXEnd = ScatterChart.getMeasureValue(indicies.xEnd, seriesValues);
                    var measureYStart = ScatterChart.getMeasureValue(indicies.yStart, seriesValues);
                    var measureYEnd = ScatterChart.getMeasureValue(indicies.yEnd, seriesValues);

                    var xVal = measureX && measureX.values && !isNaN(measureX.values[categoryIdx]) ? measureX.values[categoryIdx] : null;
                    var yVal = measureY && measureY.values && !isNaN(measureY.values[categoryIdx]) ? measureY.values[categoryIdx] : 0;
                    var size = measureSize && measureSize.values ? measureSize.values[categoryIdx] : null;
                    var colorFill = measureColorFill && measureColorFill.values ? measureColorFill.values[categoryIdx] : null;
                    var shapeSymbolType = EnhancedScatterChart.getCustomSymbolType(measureShape && measureShape.values && measureShape.values[categoryIdx]);
                    var image = measureImage && measureImage.values ? measureImage.values[categoryIdx] : null;
                    var rotation = measureRotation && measureRotation.values ? measureRotation.values[categoryIdx] : 0;
                    var backdrop = measureBackdrop && measureBackdrop.values ? measureBackdrop.values[categoryIdx] : null;
                    var xStart = measureXStart && measureXStart.values ? measureXStart.values[categoryIdx] : null;
                    var xEnd = measureXEnd && measureXEnd.values ? measureXEnd.values[categoryIdx] : null;
                    var yStart = measureYStart && measureYStart.values ? measureYStart.values[categoryIdx] : null;
                    var yEnd = measureYEnd && measureYEnd.values ? measureYEnd.values[categoryIdx] : null;

                    var hasNullValue = (xVal == null) || (yVal == null);

                    if (hasNullValue)
                        continue;

                    var color: string;
                    if (hasDynamicSeries) {
                        color = colorHelper.getColorForSeriesValue(grouping.objects, dataValues.identityFields, grouping.name);
                    } else {
                        // If we have no Size measure then use a blank query name
                        var measureSource = (measureSize != null)
                            ? measureSize.source.queryName
                            : '';
                        color = colorHelper.getColorForMeasure(categoryObjects && categoryObjects[categoryIdx], measureSource);
                    }

                    var category = categories && categories.length > 0 ? categories[0] : null;
                    var identity = SelectionIdBuilder.builder()
                        .withCategory(category, categoryIdx)
                        .withSeries(dataValues, grouping)
                        .createSelectionId();

                    var seriesData: TooltipSeriesDataItem[] = [];
                    if (dataValueSource) {
                        // Dynamic series
                        seriesData.push({ value: grouping.name, metadata: { source: dataValueSource, values: [] } });
                    }
                    if (measureX) {
                        seriesData.push({ value: xVal, metadata: measureX });
                    }
                    if (measureY) {
                        seriesData.push({ value: yVal, metadata: measureY });
                    }
                    if (measureSize && measureSize.values && measureSize.values.length > 0) {
                        seriesData.push({ value: measureSize.values[categoryIdx], metadata: measureSize });
                    }
                    if (measureColorFill && measureColorFill.values && measureColorFill.values.length > 0) {
                        seriesData.push({ value: measureColorFill.values[categoryIdx], metadata: measureColorFill });
                    }
                    if (measureShape && measureShape.values && measureShape.values.length > 0) {
                        seriesData.push({ value: measureShape.values[categoryIdx], metadata: measureShape });
                    }
                    if (measureImage && measureImage.values && measureImage.values.length > 0) {
                        seriesData.push({ value: measureImage.values[categoryIdx], metadata: measureImage });
                    }
                    if (measureRotation && measureRotation.values && measureRotation.values.length > 0) {
                        seriesData.push({ value: measureRotation.values[categoryIdx], metadata: measureRotation });
                    }

                    if (measureBackdrop && measureBackdrop.values && measureBackdrop.values.length > 0) {
                        seriesData.push({ value: measureBackdrop.values[categoryIdx], metadata: measureBackdrop });
                    }
                    if (measureXStart && measureXStart.values && measureXStart.values.length > 0) {
                        seriesData.push({ value: measureXStart.values[categoryIdx], metadata: measureXStart });
                    }
                    if (measureXEnd && measureXEnd.values && measureXEnd.values.length > 0) {
                        seriesData.push({ value: measureXEnd.values[categoryIdx], metadata: measureXEnd });
                    }
                    if (measureYStart && measureYStart.values && measureYStart.values.length > 0) {
                        seriesData.push({ value: measureYStart.values[categoryIdx], metadata: measureYStart });
                    }
                    if (measureYEnd && measureYEnd.values && measureYEnd.values.length > 0) {
                        seriesData.push({ value: measureYEnd.values[categoryIdx], metadata: measureYEnd });
                    }

                    var tooltipInfo: TooltipDataItem[] = TooltipBuilder.createTooltipInfo(formatStringProp, null, categoryValue, null, categories, seriesData);

                    var dataPoint: EnhancedScatterChartDataPoint = {
                        x: xVal,
                        y: yVal,
                        size: size,
                        radius: { sizeMeasure: measureSize, index: categoryIdx },
                        fill: color,
                        category: categoryFormatter.format(categoryValue),
                        selected: false,
                        identity: identity,
                        tooltipInfo: tooltipInfo,
                        labelFill: labelSettings.labelColor,
                        colorFill: colorFill,
                        shapeSymbolType: shapeSymbolType,
                        svgurl: image,
                        rotation: rotation,
                        backdrop: backdrop,
                        xStart: xStart,
                        xEnd: xEnd,
                        yStart: yStart,
                        yEnd: yEnd
                    };

                    dataPoints.push(dataPoint);
                }
            }
            return dataPoints;
        }

        public setData(dataViews: DataView[]) {
            this.data = {
                xCol: undefined,
                yCol: undefined,
                dataPoints: [],
                legendData: { dataPoints: [] },
                axesLabels: { x: '', y: '' },
                selectedIds: [],
                sizeRange: [],
                dataLabelsSettings: dataLabelUtils.getDefaultPointLabelSettings(),
                defaultDataPointColor: null,
                hasDynamicSeries: false,
                useShape: true,
                useCustomColor: false,
            };

            if (dataViews.length > 0) {
                var dataView = dataViews[0];

                if (dataView) {
                    this.categoryAxisProperties = this.getCategoryAxisProperties(dataView.metadata, true);
                    this.valueAxisProperties = this.getValueAxisProperties(dataView.metadata, true);
                    this.dataView = dataView;

                    if (dataView.categorical && dataView.categorical.values) {
                        this.data = EnhancedScatterChart.converter(dataView, this.viewport, this.colors, this.interactivityService, this.categoryAxisProperties, this.valueAxisProperties);
                    }

                }
            }
        }

        public update(options: VisualUpdateOptions) {

            debug.assertValue(options, 'options');

            var dataViews = this.dataViews = options.dataViews;
            this.viewport = options.viewport;

            if (!dataViews) return;

            if (dataViews && dataViews.length > 0) {
                var warnings = getInvalidValueWarnings(
                    dataViews,
                    false /*supportsNaN*/,
                    false /*supportsNegativeInfinity*/,
                    false /*supportsPositiveInfinity*/);

                if (warnings && warnings.length > 0)
                    this.hostServices.setWarnings(warnings);

                this.populateObjectProperties(dataViews);
            }

            this.setData(options.dataViews);
            
            // Note: interactive legend shouldn't be rendered explicitly here
            // The interactive legend is being rendered in the render method of ICartesianVisual
            if (!(this.options.interactivity && this.options.interactivity.isInteractiveLegend)) {
                this.renderLegend();
            }

            this.render(options.suppressAnimations);

        }

        private populateObjectProperties(dataViews: DataView[]) {
            if (dataViews && dataViews.length > 0) {
                var dataViewMetadata = dataViews[0].metadata;

                if (dataViewMetadata) {
                    this.legendObjectProperties = DataViewObjects.getObject(dataViewMetadata.objects, 'legend', {});
                }
                else {
                    this.legendObjectProperties = {};
                }
                this.categoryAxisProperties = this.getCategoryAxisProperties(dataViewMetadata);
                this.valueAxisProperties = this.getValueAxisProperties(dataViewMetadata);
                var axisPosition = this.valueAxisProperties['position'];
                this.yAxisOrientation = axisPosition ? axisPosition.toString() : yAxisPosition.left;
            }
        }

        private renderLegend(): void {
            var legendData: LegendData = {
                title: "",
                dataPoints: [],
                fontSize: parseInt(EnhancedScatterChart.LegendTextProperties.fontSize, 10)
            };

            this.layerLegendData = this.data.legendData;
            if (this.layerLegendData) {
                legendData.title = this.layerLegendData.title || "";
                legendData.dataPoints = legendData.dataPoints.concat(this.layerLegendData.dataPoints || []);
                if (this.layerLegendData.grouped) {
                    legendData.grouped = true;
                }
            }

            var legendProperties = this.legendObjectProperties;

            if (legendProperties) {
                LegendData.update(legendData, legendProperties);
                var position = <string>legendProperties[legendProps.position];

                if (position)
                    this.legend.changeOrientation(LegendPosition[position]);
            }
            else {
                this.legend.changeOrientation(LegendPosition.Top);
            }

            if ((legendData.dataPoints.length === 1 && !legendData.grouped) || this.hideLegends()) {
                legendData.dataPoints = [];
            }

            this.legend.drawLegend(legendData, this.viewport);
        }
        private hideLegends(): boolean {
            if (this.cartesianSmallViewPortProperties) {
                if (this.cartesianSmallViewPortProperties.hideLegendOnSmallViewPort && (this.viewport.height < this.cartesianSmallViewPortProperties.MinHeightLegendVisible)) {
                    return true;
                }
            }
            return false;
        }

        private shouldRenderAxis(axisProperties: IAxisProperties, propertyName: string = "show"): boolean {
            if (!axisProperties) {
                return false;
            }
            else if (axisProperties.isCategoryAxis && (!this.categoryAxisProperties || this.categoryAxisProperties[propertyName] == null || this.categoryAxisProperties[propertyName])) {
                return axisProperties.values && axisProperties.values.length > 0;
            }
            else if (!axisProperties.isCategoryAxis && (!this.valueAxisProperties || this.valueAxisProperties[propertyName] == null || this.valueAxisProperties[propertyName])) {
                return axisProperties.values && axisProperties.values.length > 0;
            }

            return false;
        }

        private getMaxMarginFactor(): number {
            return this.options.style.maxMarginFactor || 0.25;
        }

        private adjustViewportbyBackdrop(): void {
            var img = new Image();
            var that = this;
            img.src = this.data.backdrop.url;
            img.onload = function () {
                if (that.oldBackdrop !== this.src) {
                    that.render(true);
                    that.oldBackdrop = this.src;
                }
            };

            if (img.width > 0 && img.height > 0) {
                if (img.width * this.viewportIn.height < this.viewportIn.width * img.height) {
                    var deltaWidth = this.viewportIn.width - this.viewportIn.height * img.width / img.height;
                    this.viewport = { width: this.viewport.width - deltaWidth, height: this.viewport.height };
                } else {
                    var deltaHeight = this.viewportIn.height - this.viewportIn.width * img.height / img.width;
                    this.viewport = { width: this.viewport.width, height: this.viewport.height - deltaHeight };
                }
            }
        }

        public render(suppressAnimations: boolean): void {
            this.viewport.height -= this.legendViewport.height;
            this.viewport.width -= this.legendViewport.width;

            if (this.viewportIn.width === 0 || this.viewportIn.height === 0) {
                return;
            }

            var maxMarginFactor = this.getMaxMarginFactor();
            this.leftRightMarginLimit = this.viewport.width * maxMarginFactor;
            var bottomMarginLimit = this.bottomMarginLimit = Math.max(25, Math.ceil(this.viewport.height * maxMarginFactor));

            // reset defaults
            this.margin.top = 8;
            this.margin.bottom = bottomMarginLimit;
            this.margin.right = 0;

            this.calculateAxes(this.categoryAxisProperties, this.valueAxisProperties, EnhancedScatterChart.AxisLabelsTextProperties, true);

            this.yAxisIsCategorical = this.yAxisProperties.isCategoryAxis;
            this.hasCategoryAxis = this.yAxisIsCategorical ? this.yAxisProperties && this.yAxisProperties.values.length > 0 : this.xAxisProperties && this.xAxisProperties.values.length > 0;

            var renderXAxis = this.shouldRenderAxis(this.xAxisProperties);
            var renderY1Axis = this.shouldRenderAxis(this.yAxisProperties);

            var mainAxisScale;
            this.isXScrollBarVisible = false;
            this.isYScrollBarVisible = false;

            var yAxisOrientation = this.yAxisOrientation;
            var showY1OnRight = yAxisOrientation === yAxisPosition.right;

            this.calculateAxes(this.categoryAxisProperties, this.valueAxisProperties, EnhancedScatterChart.AxisLabelsTextProperties, true);

            var doneWithMargins = false,
                maxIterations = 2,
                numIterations = 0;

            while (!doneWithMargins && numIterations < maxIterations) {
                numIterations++;
                var tickLabelMargins = AxisHelper.getTickLabelMargins(
                    { width: this.viewportIn.width, height: this.viewport.height }, this.leftRightMarginLimit,
                    TextMeasurementService.measureSvgTextWidth, TextMeasurementService.measureSvgTextHeight, { x: this.xAxisProperties, y1: this.yAxisProperties },
                    this.bottomMarginLimit, EnhancedScatterChart.AxisLabelsTextProperties,
                    this.isXScrollBarVisible || this.isYScrollBarVisible, showY1OnRight,
                    renderXAxis, renderY1Axis, false);

                // We look at the y axes as main and second sides, if the y axis orientation is right so the main side represents the right side
                var maxMainYaxisSide = showY1OnRight ? tickLabelMargins.yRight : tickLabelMargins.yLeft,
                    maxSecondYaxisSide = showY1OnRight ? tickLabelMargins.yLeft : tickLabelMargins.yRight,
                    xMax = tickLabelMargins.xMax;

                maxMainYaxisSide += 10;
                maxSecondYaxisSide += 10;
                xMax += 12;
                if (showY1OnRight && renderY1Axis) {
                    maxSecondYaxisSide += 20;
                }

                if (!showY1OnRight && renderY1Axis) {
                    maxMainYaxisSide += 20;
                }

                if (this.hideAxisLabels()) {
                    this.xAxisProperties.axisLabel = null;
                    this.yAxisProperties.axisLabel = null;
                }

                this.addUnitTypeToAxisLabel(this.xAxisProperties, this.yAxisProperties);

                var axisLabels: ChartAxesLabels = { x: this.xAxisProperties.axisLabel, y: this.yAxisProperties.axisLabel, y2: null };
                var chartHasAxisLabels = (axisLabels.x != null) || (axisLabels.y != null || axisLabels.y2 != null);

                if (axisLabels.x != null)
                    xMax += 18;

                if (axisLabels.y != null)
                    maxMainYaxisSide += 20;

                if (axisLabels.y2 != null)
                    maxSecondYaxisSide += 20;

                this.margin.left = showY1OnRight ? maxSecondYaxisSide : maxMainYaxisSide;
                this.margin.right = showY1OnRight ? maxMainYaxisSide : maxSecondYaxisSide;
                this.margin.bottom = xMax;

                // re-calculate the axes with the new margins
                var previousTickCountY1 = this.yAxisProperties.values.length;

                this.calculateAxes(this.categoryAxisProperties, this.valueAxisProperties, EnhancedScatterChart.AxisLabelsTextProperties, true);

                // the minor padding adjustments could have affected the chosen tick values, which would then need to calculate margins again
                // e.g. [0,2,4,6,8] vs. [0,5,10] the 10 is wider and needs more margin.
                if (this.yAxisProperties.values.length === previousTickCountY1)
                    doneWithMargins = true;
            }
            // we have to do the above process again since changes are made to viewport.
            
            if (this.data.backdrop && this.data.backdrop.show && (this.data.backdrop.url !== undefined)) {
                this.adjustViewportbyBackdrop();

                doneWithMargins = false;
                maxIterations = 2;
                numIterations = 0;

                while (!doneWithMargins && numIterations < maxIterations) {
                    numIterations++;
                    var tickLabelMargins = AxisHelper.getTickLabelMargins(
                        { width: this.viewportIn.width, height: this.viewport.height }, this.leftRightMarginLimit,
                        TextMeasurementService.measureSvgTextWidth, TextMeasurementService.measureSvgTextHeight, { x: this.xAxisProperties, y1: this.yAxisProperties },
                        this.bottomMarginLimit, EnhancedScatterChart.AxisLabelsTextProperties,
                        this.isXScrollBarVisible || this.isYScrollBarVisible, showY1OnRight,
                        renderXAxis, renderY1Axis, false);

                    // We look at the y axes as main and second sides, if the y axis orientation is right so the main side represents the right side
                    var maxMainYaxisSide = showY1OnRight ? tickLabelMargins.yRight : tickLabelMargins.yLeft,
                        maxSecondYaxisSide = showY1OnRight ? tickLabelMargins.yLeft : tickLabelMargins.yRight,
                        xMax = tickLabelMargins.xMax;

                    maxMainYaxisSide += 10;
                    if (showY1OnRight && renderY1Axis)
                        maxSecondYaxisSide += 15;
                    xMax += 12;

                    if (this.hideAxisLabels()) {
                        this.xAxisProperties.axisLabel = null;
                        this.yAxisProperties.axisLabel = null;
                    }

                    this.addUnitTypeToAxisLabel(this.xAxisProperties, this.yAxisProperties);

                    var axisLabels: ChartAxesLabels = { x: this.xAxisProperties.axisLabel, y: this.yAxisProperties.axisLabel, y2: null };
                    var chartHasAxisLabels = (axisLabels.x != null) || (axisLabels.y != null || axisLabels.y2 != null);

                    if (axisLabels.x != null)
                        xMax += 18;

                    if (axisLabels.y != null)
                        maxMainYaxisSide += 20;

                    if (axisLabels.y2 != null)
                        maxSecondYaxisSide += 20;

                    this.margin.left = showY1OnRight ? maxSecondYaxisSide : maxMainYaxisSide;
                    this.margin.right = showY1OnRight ? maxMainYaxisSide : maxSecondYaxisSide;
                    this.margin.bottom = xMax;

                    // re-calculate the axes with the new margins
                    var previousTickCountY1 = this.yAxisProperties.values.length;

                    this.calculateAxes(this.categoryAxisProperties, this.valueAxisProperties, EnhancedScatterChart.AxisLabelsTextProperties, true);

                    // the minor padding adjustments could have affected the chosen tick values, which would then need to calculate margins again
                    // e.g. [0,2,4,6,8] vs. [0,5,10] the 10 is wider and needs more margin.
                    if (this.yAxisProperties.values.length === previousTickCountY1)
                        doneWithMargins = true;
                }
            }

            this.renderChart(mainAxisScale, this.xAxisProperties, this.yAxisProperties, tickLabelMargins, chartHasAxisLabels, axisLabels, suppressAnimations);

            this.updateAxis();

            if (!this.data)
                return;

            var data = this.data;
            var dataPoints = this.data.dataPoints;
            
            //this.calculateAxes(viewport, margin, this.categoryAxisProperties, this.valueAxisProperties, {fontFamily: 'wf_segoe-ui_normal',fontSize: '11'}, true);
            var xScale = this.xAxisProperties.scale;
            var yScale = this.yAxisProperties.scale;

            var hasSelection = this.interactivityService && this.interactivityService.hasSelection();

            this.mainGraphicsContext.attr('width', this.viewportIn.width)
                .attr('height', this.viewportIn.height);

            var sortedData = dataPoints.sort(function (a, b) {
                return b.radius.sizeMeasure ? (b.radius.sizeMeasure.values[b.radius.index] - a.radius.sizeMeasure.values[a.radius.index]) : 0;
            });

            var duration = AnimatorCommon.GetAnimationDuration(this.animator, suppressAnimations);
            var scatterMarkers = this.drawScatterMarkers(sortedData, hasSelection, data.sizeRange, duration);

            if (this.data.dataLabelsSettings.show) {
                var layout = dataLabelUtils.getScatterChartLabelLayout(xScale, yScale, this.data.dataLabelsSettings, this.viewport, data.sizeRange);
                dataLabelUtils.drawDefaultLabelsForDataPointChart(dataPoints, this.mainGraphicsG, layout, this.viewport, !suppressAnimations, duration);
            }
            else {
                dataLabelUtils.cleanDataLabels(this.mainGraphicsG);
            }
            var behaviorOptions: ScatterBehaviorOptions = undefined;
            if (this.interactivityService) {
                behaviorOptions = {
                    host: this.cartesianVisualHost,
                    root: this.svg,
                    dataPointsSelection: scatterMarkers,
                    mainContext: this.mainGraphicsContext,
                    data: this.data,
                    visualInitOptions: this.options,
                    xAxisProperties: this.xAxisProperties,
                    yAxisProperties: this.yAxisProperties,
                    background: d3.select(this.element.get(0)),
                };
            }

            TooltipManager.addTooltip(scatterMarkers, (tooltipEvent: TooltipEvent) => tooltipEvent.data.tooltipInfo);

            SVGUtil.flushAllD3TransitionsIfNeeded(this.options);

            if (this.behavior) {
                var layerBehaviorOptions: any[] = [];
                layerBehaviorOptions.push(behaviorOptions);

                if (this.interactivityService) {
                    var cbehaviorOptions: CartesianBehaviorOptions = {
                        layerOptions: layerBehaviorOptions,
                        clearCatcher: this.clearCatcher,
                    };
                    this.interactivityService.bind(dataPoints, this.behavior, cbehaviorOptions);
                }
            }
        }

        private darkenZeroLine(g: D3.Selection): void {
            var zeroTick = g.selectAll('g.tick').filter((data) => data === 0).node();
            if (zeroTick) {
                d3.select(zeroTick).select('line').classed('zero-line', true);
            }
        }

        private getCategoryAxisFill(): Fill {
            if (this.dataView && this.dataView.metadata.objects) {
                var label = this.dataView.metadata.objects['categoryAxis'];
                if (label) {
                    return <Fill>label['axisColor'];
                }
            }
            return { solid: { color: '#333' } };
        }

        private getValueAxisFill(): Fill {
            if (this.dataView && this.dataView.metadata.objects) {
                var label = this.dataView.metadata.objects['valueAxis'];
                if (label) {
                    return <Fill>label['axisColor'];
                }
            }

            return { solid: { color: '#333' } };
        }

        private renderCrossHair() {
            var xScale = <D3.Scale.LinearScale>this.xAxisProperties.scale;
            var yScale = <D3.Scale.LinearScale>this.yAxisProperties.scale;
            this.mainGraphicsG.selectAll(".crosshairCanvas").remove();
            if (this.data.crosshair) {
                var canvas = this.mainGraphicsG.append("g").attr("class", "crosshairCanvas").attr("id", "crosshairCanvas");
                var crossHair = canvas.append("g").attr("class", "crosshair");
                var hLine = crossHair.append("line").attr("id", "h_crosshair") // horizontal cross hair
                    .attr("x1", 0)
                    .attr("y1", 0)
                    .attr("x2", 0)
                    .attr("y2", 0)
                    .style("stroke", "gray")
                    .style("stroke-width", "1px")
                    .style("stroke-dasharray", "5,5")
                    .style("display", "none");

                var vLine = crossHair.append("line").attr("id", "v_crosshair") // vertical cross hair
                    .attr("x1", 0)
                    .attr("y1", 0)
                    .attr("x2", 0)
                    .attr("y2", 0)
                    .style("stroke", "grey")
                    .style("stroke-width", "1px")
                    .style("stroke-dasharray", "5,5")
                    .style("display", "none");

                var text = crossHair.append("text").attr("id", "crosshair_text") // text label for cross hair
                    .style("font-size", "10px")
                    .style("stroke", "black")
                    .style("stroke-width", "0.5px");

                var textRect = crossHair.append("rect").attr("id", "crosshair_rect"); // text label for cross hair

                var addCrossHair = (xCoord, yCoord) => {
                    // Update horizontal cross hair
                    hLine.attr("x1", 0)
                        .attr("y1", yCoord)
                        .attr("x2", this.viewportIn.width)
                        .attr("y2", yCoord)
                        .style("display", "block");
                    // Update vertical cross hair
                    vLine.attr("x1", xCoord)
                        .attr("y1", 0)
                        .attr("x2", xCoord)
                        .attr("y2", this.viewportIn.height)
                        .style("display", "block");
                    // Update text label
                    text.attr("transform", "translate(" + (xCoord + 5) + "," + (yCoord - 5) + ")")
                    //.text("(" + xCoord + " , " + yCoord + ")");
                        .text("(" + Math.round(xScale.invert(xCoord) * 100) / 100 + " , " + Math.round(yScale.invert(yCoord) * 100) / 100 + ")");
                    var bbox = (<SVGTextElement>text.node()).getBBox();
                    textRect.attr("x", (xCoord + 5) + bbox.x)
                        .attr("y", (yCoord - 5) + bbox.y)
                        .attr("width", bbox.width)
                        .attr("height", bbox.height)
                        .style({ 'fill': 'white', 'fill-opacity': 0.5 });
                };

                var rect = canvas.append("rect")
                    .style('visibility', () => {
                        if (this.data.crosshair === true) {
                            return 'visible';
                        } else {
                            return 'hidden';
                        }
                    })
                    .style('fill-opacity', 0)
                    .attr('x', 0)
                    .attr('y', 0)
                    .attr('width', this.viewportIn.width)
                    .attr('height', this.viewportIn.height);

                rect.on("mousemove", function (e) {
                    //var xCoord = d3.mouse(this)[0],
                    //    yCoord = d3.mouse(this)[1];
                    var xScale = 1;
                    var yScale = 1;
                    var container = d3.select(".displayArea");
                    if (container) {
                        var transform = container.style("transform");
                        if (transform && transform.indexOf('(') >= 0) {
                            var str = transform.split("(")[1];
                            xScale = Number(str.split(", ")[0]);
                            yScale = Number(str.split(", ")[3]);
                        }
                    }

                    var xCoord = (d3.event.x - this.getBoundingClientRect().left) / xScale;
                    var yCoord = (d3.event.y - this.getBoundingClientRect().top) / yScale;
                    addCrossHair(xCoord, yCoord);
                })
                    .on("mouseover", () => {
                        vLine.style("display", "block");
                        hLine.style("display", "block");
                        text.style("display", "block");
                    })
                    .on("mouseout", () => {
                        vLine.style("display", "none");
                        hLine.style("display", "none");
                        text.style("display", "none");
                    });
            }
        }

        private renderBackground() {
            if (this.data.backdrop && this.data.backdrop.show && (this.data.backdrop.url !== undefined)) {
                this.backgroundGraphicsContext
                    .attr("xlink:href", this.data.backdrop.url)
                    .attr('x', 0)
                    .attr('y', 0)
                    .attr('width', this.viewportIn.width)
                    .attr('height', this.viewportIn.height);
            } else {
                this.backgroundGraphicsContext
                    .attr('width', 0)
                    .attr('height', 0);
            }
        }

        private renderChart(
            mainAxisScale: any,
            xAxis: IAxisProperties,
            yAxis: IAxisProperties,
            tickLabelMargins: any,
            chartHasAxisLabels: boolean,
            axisLabels: ChartAxesLabels,
            suppressAnimations: boolean,
            scrollScale?: any,
            extent?: number[]) {

            var bottomMarginLimit = this.bottomMarginLimit;
            var leftRightMarginLimit = this.leftRightMarginLimit;
            var duration = AnimatorCommon.GetAnimationDuration(this.animator, suppressAnimations);

            this.renderBackground();
            //hide show x-axis here
            if (this.shouldRenderAxis(xAxis)) {
                xAxis.axis.orient("bottom");
                if (!xAxis.willLabelsFit)
                    xAxis.axis.tickPadding(5);

                var xAxisGraphicsElement = this.xAxisGraphicsContext;
                if (duration) {
                    xAxisGraphicsElement
                        .transition()
                        .duration(duration)
                        .call(xAxis.axis)
                        .call(this.darkenZeroLine);
                }
                else {
                    xAxisGraphicsElement
                        .call(xAxis.axis)
                        .call(this.darkenZeroLine);
                }
                var xZeroTick = xAxisGraphicsElement.selectAll('g.tick').filter((data) => data === 0);
                if (xZeroTick) {
                    var xZeroColor = this.getValueAxisFill();
                    if (xZeroColor) {
                        xZeroTick.selectAll('line').style({ 'stroke': xZeroColor.solid.color });
                    }
                }

                var xAxisTextNodes = xAxisGraphicsElement.selectAll('text');
                if (xAxis.willLabelsWordBreak) {
                    xAxisTextNodes
                        .call(AxisHelper.LabelLayoutStrategy.wordBreak, xAxis, bottomMarginLimit);
                } else {
                    xAxisTextNodes
                        .call(AxisHelper.LabelLayoutStrategy.rotate,
                            bottomMarginLimit,
                            TextMeasurementService.svgEllipsis,
                            !xAxis.willLabelsFit,
                            bottomMarginLimit === tickLabelMargins.xMax,
                            xAxis,
                            this.margin,
                            this.isXScrollBarVisible || this.isYScrollBarVisible);
                }
            }
            else {
                this.xAxisGraphicsContext.selectAll('*').remove();
            }

            if (this.shouldRenderAxis(yAxis)) {
                var yAxisOrientation = this.yAxisOrientation;

                yAxis.axis
                    .tickSize(-this.viewportIn.width)
                    .tickPadding(10)
                    .orient(yAxisOrientation.toLowerCase());

                var y1AxisGraphicsElement = this.y1AxisGraphicsContext;
                if (duration) {
                    y1AxisGraphicsElement
                        .transition()
                        .duration(duration)
                        .call(yAxis.axis)
                        .call(this.darkenZeroLine);
                }
                else {
                    y1AxisGraphicsElement
                        .call(yAxis.axis)
                        .call(this.darkenZeroLine);
                }

                var yZeroTick = y1AxisGraphicsElement.selectAll('g.tick').filter((data) => data === 0);
                if (yZeroTick) {
                    var yZeroColor = this.getCategoryAxisFill();
                    if (yZeroColor) {
                        yZeroTick.selectAll('line').style({ 'stroke': yZeroColor.solid.color });
                    }
                }

                if (tickLabelMargins.yLeft >= leftRightMarginLimit) {
                    y1AxisGraphicsElement.selectAll('text')
                        .call(AxisHelper.LabelLayoutStrategy.clip,
                            // Can't use padding space to render text, so subtract that from available space for ellipses calculations
                            leftRightMarginLimit - 10,
                            TextMeasurementService.svgEllipsis);
                }

                // TODO: clip (svgEllipsis) the Y2 labels
            }
            else {
                this.y1AxisGraphicsContext.selectAll('*').remove();
            }
            // Axis labels
            //TODO: Add label for second Y axis for combo chart
            if (chartHasAxisLabels) {
                var hideXAxisTitle = !this.shouldRenderAxis(xAxis, "showAxisTitle");
                var hideYAxisTitle = !this.shouldRenderAxis(yAxis, "showAxisTitle");
                var hideY2AxisTitle = this.valueAxisProperties && this.valueAxisProperties["secShowAxisTitle"] != null && this.valueAxisProperties["secShowAxisTitle"] === false;

                this.renderAxesLabels(axisLabels, this.legendViewport.height, hideXAxisTitle, hideYAxisTitle, hideY2AxisTitle);
            }
            else {
                this.axisGraphicsContext.selectAll('.xAxisLabel').remove();
                this.axisGraphicsContext.selectAll('.yAxisLabel').remove();
            }
            this.renderCrossHair();
        }

        private renderAxesLabels(axisLabels: ChartAxesLabels, legendMargin: number, hideXAxisTitle: boolean, hideYAxisTitle: boolean, hideY2AxisTitle: boolean): void {
            this.axisGraphicsContext.selectAll('.xAxisLabel').remove();
            this.axisGraphicsContext.selectAll('.yAxisLabel').remove();

            var margin = this.margin;
            var width = this.viewportIn.width;
            var height = this.viewport.height;
            var fontSize = parseInt(EnhancedScatterChart.AxisLabelsTextProperties.fontSize, 10);
            var yAxisOrientation = this.yAxisOrientation;
            var showY1OnRight = yAxisOrientation === yAxisPosition.right;

            if (!hideXAxisTitle) {
                var xAxisLabel = this.axisGraphicsContext.append("text")
                    .style("text-anchor", "middle")
                    .text(axisLabels.x)
                    .call((text: D3.Selection) => {
                        text.each(function () {
                            var text = d3.select(this);
                            text.attr({
                                "class": "xAxisLabel",
                                "transform": SVGUtil.translate(width / 2, height - fontSize - 2)
                            });
                        });
                    });

                xAxisLabel.call(AxisHelper.LabelLayoutStrategy.clip,
                    width,
                    TextMeasurementService.svgEllipsis);
            }

            if (!hideYAxisTitle) {
                var yAxisLabel = this.axisGraphicsContext.append("text")
                    .style("text-anchor", "middle")
                    .text(axisLabels.y)
                    .call((text: D3.Selection) => {
                        text.each(function () {
                            var text = d3.select(this);
                            text.attr({
                                "class": "yAxisLabel",
                                "transform": "rotate(-90)",
                                "y": showY1OnRight ? width + margin.right - fontSize : -margin.left,
                                "x": -((height - margin.top - legendMargin) / 2),
                                "dy": "1em"
                            });
                        });
                    });

                yAxisLabel.call(AxisHelper.LabelLayoutStrategy.clip,
                    height - (margin.bottom + margin.top),
                    TextMeasurementService.svgEllipsis);
            }

            if (!hideY2AxisTitle && axisLabels.y2) {
                var y2AxisLabel = this.axisGraphicsContext.append("text")
                    .style("text-anchor", "middle")
                    .text(axisLabels.y2)
                    .call((text: D3.Selection) => {
                        text.each(function () {
                            var text = d3.select(this);
                            text.attr({
                                "class": "yAxisLabel",
                                "transform": "rotate(-90)",
                                "y": showY1OnRight ? -margin.left : width + margin.right - fontSize,
                                "x": -((height - margin.top - legendMargin) / 2),
                                "dy": "1em"
                            });
                        });
                    });

                y2AxisLabel.call(AxisHelper.LabelLayoutStrategy.clip,
                    height - (margin.bottom + margin.top),
                    TextMeasurementService.svgEllipsis);
            }
        }

        private updateAxis(): void {
            this.adjustMargins();

            var yAxisOrientation = this.yAxisOrientation;
            var showY1OnRight = yAxisOrientation === yAxisPosition.right;

            this.xAxisGraphicsContext
                .attr('transform', SVGUtil.translate(0, this.viewportIn.height));

            this.y1AxisGraphicsContext
                .attr('transform', SVGUtil.translate(showY1OnRight ? this.viewportIn.width : 0, 0));

            this.svg.attr({
                'width': this.viewport.width,
                'height': this.viewport.height
            });

            this.svgScrollable.attr({
                'width': this.viewport.width,
                'height': this.viewport.height
            });

            this.svgScrollable.attr({
                'x': 0
            });

            this.axisGraphicsContext.attr('transform', SVGUtil.translate(this.margin.left, this.margin.top));
            this.axisGraphicsContextScrollable.attr('transform', SVGUtil.translate(this.margin.left, this.margin.top));

            if (this.isXScrollBarVisible) {
                this.svgScrollable.attr({
                    'x': this.margin.left
                });
                this.axisGraphicsContextScrollable.attr('transform', SVGUtil.translate(0, this.margin.top));
                this.svgScrollable.attr('width', this.viewportIn.width);
                this.svg.attr('width', this.viewport.width)
                    .attr('height', this.viewport.height + this.ScrollBarWidth);
            }
            else if (this.isYScrollBarVisible) {
                this.svgScrollable.attr('height', this.viewportIn.height + this.margin.top);
                this.svg.attr('width', this.viewport.width + this.ScrollBarWidth)
                    .attr('height', this.viewport.height);
            }
        }

        private getUnitType(xAxis: IAxisProperties) {
            if (xAxis.formatter &&
                xAxis.formatter.displayUnit &&
                xAxis.formatter.displayUnit.value > 1)
                return xAxis.formatter.displayUnit.title;
            return null;
        }

        private addUnitTypeToAxisLabel(xAxis: IAxisProperties, yAxis: IAxisProperties): void {
            var unitType = this.getUnitType(xAxis);
            if (xAxis.isCategoryAxis) {
                this.categoryAxisHasUnitType = unitType !== null;
            }
            else {
                this.valueAxisHasUnitType = unitType !== null;
            }

            if (xAxis.axisLabel && unitType) {
                if (xAxis.isCategoryAxis) {
                    xAxis.axisLabel = AxisHelper.createAxisLabel(this.categoryAxisProperties, xAxis.axisLabel, unitType);
                }
                else {
                    xAxis.axisLabel = AxisHelper.createAxisLabel(this.valueAxisProperties, xAxis.axisLabel, unitType);
                }
            }

            var unitType = this.getUnitType(yAxis);

            if (!yAxis.isCategoryAxis) {
                this.valueAxisHasUnitType = unitType !== null;
            }
            else {
                this.categoryAxisHasUnitType = unitType !== null;
            }

            if (yAxis.axisLabel && unitType) {
                if (!yAxis.isCategoryAxis) {
                    yAxis.axisLabel = AxisHelper.createAxisLabel(this.valueAxisProperties, yAxis.axisLabel, unitType);
                }
                else {
                    yAxis.axisLabel = AxisHelper.createAxisLabel(this.categoryAxisProperties, yAxis.axisLabel, unitType);
                }
            }
        }

        private hideAxisLabels(): boolean {
            if (this.cartesianSmallViewPortProperties) {
                if (this.cartesianSmallViewPortProperties.hideAxesOnSmallViewPort
                    && ((this.viewport.height + this.legendViewport.height) < this.cartesianSmallViewPortProperties.MinHeightAxesVisible)
                    && !this.options.interactivity.isInteractiveLegend) {
                    return true;
                }
            }
            return false;
        }

        private drawScatterMarkers(scatterData: EnhancedScatterChartDataPoint[], hasSelection: boolean, sizeRange: NumberRange, duration: number) {
            var xScale = this.xAxisProperties.scale;
            var yScale = this.yAxisProperties.scale;
            var shouldEnableFill = (!sizeRange || !sizeRange.min) && this.data.fillPoint;

            var markers;
            var useCustomColor = this.data.useCustomColor;
            if (this.data.useShape) {
                this.mainGraphicsContext.selectAll(EnhancedScatterChart.ImageClasses.selector).remove();
                markers = this.mainGraphicsContext.selectAll(EnhancedScatterChart.DotClasses.selector).data(scatterData, (d: EnhancedScatterChartDataPoint) => d.identity.getKey());
                markers.enter()
                    .append('path')
                    .classed(EnhancedScatterChart.DotClasses.class, true).attr('id', 'markershape');
                markers
                    .style({
                        'stroke-opacity': (d: EnhancedScatterChartDataPoint) => ScatterChart.getBubbleOpacity(d, hasSelection),
                        'stroke-width': '1px',
                        'stroke': (d: EnhancedScatterChartDataPoint) => {
                            var color = useCustomColor ? d.colorFill : d.fill;
                            if (this.data.outline) {
                                return d3.rgb(color).darker();
                            } else {
                                return d3.rgb(color);
                            }
                        },
                        'fill': (d: EnhancedScatterChartDataPoint) => d3.rgb(useCustomColor ? d.colorFill : d.fill),
                        'fill-opacity': (d: EnhancedScatterChartDataPoint) => (d.size != null || shouldEnableFill) ? ScatterChart.getBubbleOpacity(d, hasSelection) : 0,
                    })
                    .attr("d", (d: EnhancedScatterChartDataPoint) => {
                        var r = ScatterChart.getBubbleRadius(d.radius, sizeRange, this.viewport);
                        var area = 4 * r * r;
                        return d.shapeSymbolType(area);
                    })
                    .transition()
                    .duration((d) => {
                        if (this.keyArray.indexOf(d.identity.getKey()) >= 0) {
                            return duration;
                        } else {
                            return 0;
                        }
                    })
                    .attr("transform", function (d) { return "translate(" + xScale(d.x) + "," + yScale(d.y) + ") rotate(" + d.rotation + ")"; });
            } else {
                this.mainGraphicsContext.selectAll(EnhancedScatterChart.DotClasses.selector).remove();
                markers = this.mainGraphicsContext.selectAll(EnhancedScatterChart.ImageClasses.selector).data(scatterData, (d: EnhancedScatterChartDataPoint) => d.identity.getKey());
                markers.enter().append("svg:image")
                    .classed(EnhancedScatterChart.ImageClasses.class, true).attr('id', 'markerimage');
                markers
                    .attr("xlink:href", (d) => {
                        if (d.svgurl !== undefined && d.svgurl != null && d.svgurl !== "") {
                            return d.svgurl;
                        } else {
                            return this.svgDefaultImage;
                        }
                    })
                    .attr("width", (d) => {
                        return ScatterChart.getBubbleRadius(d.radius, sizeRange, this.viewport) * 2;
                    })
                    .attr("height", (d) => {
                        return ScatterChart.getBubbleRadius(d.radius, sizeRange, this.viewport) * 2;
                    })
                    .transition()
                    .duration((d) => {
                        if (this.keyArray.indexOf(d.identity.getKey()) >= 0) {
                            return duration;
                        } else {
                            return 0;
                        }
                    })
                    .attr("transform", (d) => {
                        var radius = ScatterChart.getBubbleRadius(d.radius, sizeRange, this.viewport);
                        return "translate(" + (xScale(d.x) - radius) + "," + (yScale(d.y) - radius) + ") rotate(" + d.rotation + "," + radius + "," + radius + ")";
                    });
            }

            markers.exit().remove();
            this.keyArray = [];
            for (var i = 0; i < scatterData.length; i++) {
                this.keyArray.push(scatterData[i].identity.getKey());
            }
            //console.log(this.keyArray);
            return markers;
        }

        public calculateAxes(
            categoryAxisProperties: DataViewObject,
            valueAxisProperties: DataViewObject,
            textProperties: TextProperties,
            scrollbarVisible: boolean): IAxisProperties[] {

            var visualOptions: CalculateScaleAndDomainOptions = {
                viewport: this.viewport,
                margin: this.margin,
                forcedXDomain: [categoryAxisProperties ? categoryAxisProperties['start'] : null, categoryAxisProperties ? categoryAxisProperties['end'] : null],
                forceMerge: valueAxisProperties && valueAxisProperties['secShow'] === false,
                showCategoryAxisLabel: false,
                showValueAxisLabel: false,
                categoryAxisScaleType: categoryAxisProperties && categoryAxisProperties['axisScale'] != null ? <string>categoryAxisProperties['axisScale'] : null,//axisScale.linear,
                valueAxisScaleType: valueAxisProperties && valueAxisProperties['axisScale'] != null ? <string>valueAxisProperties['axisScale'] : null//axisScale.linear
            };

            if (valueAxisProperties) {
                visualOptions.forcedYDomain = AxisHelper.applyCustomizedDomain([valueAxisProperties['start'], valueAxisProperties['end']], visualOptions.forcedYDomain);
            }

            visualOptions.showCategoryAxisLabel = (!!categoryAxisProperties && !!categoryAxisProperties['showAxisTitle']);//here

            visualOptions.showValueAxisLabel = true;

            var width = this.viewport.width - (this.margin.left + this.margin.right);

            var axes = this.calculateAxesProperties(visualOptions);
            axes[0].willLabelsFit = AxisHelper.LabelLayoutStrategy.willLabelsFit(
                axes[0],
                width,
                TextMeasurementService.measureSvgTextWidth,
                textProperties);

            // If labels do not fit and we are not scrolling, try word breaking
            axes[0].willLabelsWordBreak = (!axes[0].willLabelsFit && !scrollbarVisible) && AxisHelper.LabelLayoutStrategy.willLabelsWordBreak(
                axes[0], this.margin, width, TextMeasurementService.measureSvgTextWidth,
                TextMeasurementService.estimateSvgTextHeight, TextMeasurementService.getTailoredTextOrDefault,
                textProperties);
            return axes;
        }

        public calculateAxesProperties(options: CalculateScaleAndDomainOptions): IAxisProperties[] {
            var data = this.data;
            var dataPoints = data.dataPoints;
            this.margin = options.margin;
            this.viewport = options.viewport;

            var minY = 0,
                maxY = 10,
                minX = 0,
                maxX = 10;
            if (dataPoints.length > 0) {
                minY = d3.min<EnhancedScatterChartDataPoint, number>(dataPoints, d => d.y);
                maxY = d3.max<EnhancedScatterChartDataPoint, number>(dataPoints, d => d.y);
                minX = d3.min<EnhancedScatterChartDataPoint, number>(dataPoints, d => d.x);
                maxX = d3.max<EnhancedScatterChartDataPoint, number>(dataPoints, d => d.x);
            }

            var xDomain = [minX, maxX];
            var combinedXDomain = AxisHelper.combineDomain(options.forcedXDomain, xDomain);

            this.xAxisProperties = AxisHelper.createAxis({
                pixelSpan: this.viewportIn.width,
                dataDomain: combinedXDomain,
                metaDataColumn: data.xCol,
                formatStringProp: scatterChartProps.general.formatString,
                outerPadding: 0,
                isScalar: true,
                isVertical: false,
                forcedTickCount: options.forcedTickCount,
                useTickIntervalForDisplayUnits: true,
                isCategoryAxis: true, //scatter doesn't have a categorical axis, but this is needed for the pane to react correctly to the x-axis toggle one/off
                scaleType: options.categoryAxisScaleType,
                formatString: undefined
            });
            this.xAxisProperties.axis.tickSize(-this.viewportIn.height, 0);
            this.xAxisProperties.axisLabel = this.data.axesLabels.x;

            var combinedDomain = AxisHelper.combineDomain(options.forcedYDomain, [minY, maxY]);

            this.yAxisProperties = AxisHelper.createAxis({
                pixelSpan: this.viewportIn.height,
                dataDomain: combinedDomain,
                metaDataColumn: data.yCol,
                formatStringProp: scatterChartProps.general.formatString,
                outerPadding: 0,
                isScalar: true,
                isVertical: true,
                forcedTickCount: options.forcedTickCount,
                useTickIntervalForDisplayUnits: true,
                isCategoryAxis: false,
                scaleType: options.valueAxisScaleType,
                formatString: undefined
            });
            this.yAxisProperties.axisLabel = this.data.axesLabels.y;

            return [this.xAxisProperties, this.yAxisProperties];
        }

        private enumerateDataPoints(enumeration: ObjectEnumerationBuilder): void {
            var data = this.data;
            if (!data)
                return;

            var seriesCount = data.dataPoints.length;

            if (!data.hasDynamicSeries) {
                // Add default color and show all slices
                enumeration.pushInstance({
                    objectName: 'dataPoint',
                    selector: null,
                    properties: {
                        defaultColor: { solid: { color: data.defaultDataPointColor || this.colors.getColorByIndex(0).value } }
                    }
                }).pushInstance({
                    objectName: 'dataPoint',
                    selector: null,
                    properties: {
                        showAllDataPoints: !!data.showAllDataPoints
                    }
                });

                for (var i = 0; i < seriesCount; i++) {
                    var seriesDataPoints = data.dataPoints[i];
                    enumeration.pushInstance({
                        objectName: 'dataPoint',
                        displayName: seriesDataPoints.category,
                        selector: ColorHelper.normalizeSelector(seriesDataPoints.identity.getSelector(), /*isSingleSeries*/ true),
                        properties: {
                            fill: { solid: { color: seriesDataPoints.fill } }
                        },
                    });
                }
            }
            else {
                var legendDataPointLength = data.legendData.dataPoints.length;
                for (var i = 0; i < legendDataPointLength; i++) {
                    var series = data.legendData.dataPoints[i];
                    enumeration.pushInstance({
                        objectName: 'dataPoint',
                        displayName: series.label,
                        selector: ColorHelper.normalizeSelector(series.identity.getSelector()),
                        properties: {
                            fill: { solid: { color: series.color } }
                        },
                    });
                }
            }
        }

        public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstanceEnumeration {
            var enumeration = new ObjectEnumerationBuilder();

            switch (options.objectName) {
                case 'dataPoint':
                    var categoricalDataView: DataViewCategorical = this.dataView && this.dataView.categorical ? this.dataView.categorical : null;
                    if (!GradientUtils.hasGradientRole(categoricalDataView))
                        this.enumerateDataPoints(enumeration);
                    break;
                case 'categoryAxis':
                    this.getCategoryAxisValues(enumeration);
                    break;
                case 'valueAxis':
                    this.getValueAxisValues(enumeration);
                    break;
                case 'categoryLabels':
                    if (this.data)
                        dataLabelUtils.enumerateCategoryLabels(enumeration, this.data.dataLabelsSettings, true);
                    else
                        dataLabelUtils.enumerateCategoryLabels(enumeration, null, true);
                    break;
                case 'fillPoint':
                    var sizeRange = this.data.sizeRange;
                    // Check if the card should be shown or not
                    if (sizeRange && sizeRange.min)
                        break;

                    enumeration.pushInstance({
                        objectName: 'fillPoint',
                        selector: null,
                        properties: {
                            show: this.data.fillPoint,
                        },
                    });
                    break;
                case 'backdrop':
                    enumeration.pushInstance({
                        objectName: 'backdrop',
                        displayName: 'Backdrop',
                        selector: null,
                        properties: {
                            show: this.data.backdrop ? this.data.backdrop.show : false,
                            url: this.data.backdrop ? this.data.backdrop.url : null
                        },
                    });
                    break;
                case 'crosshair':
                    enumeration.pushInstance({
                        objectName: 'crosshair',
                        selector: null,
                        properties: {
                            show: this.data.crosshair
                        },
                    });
                    break;
                case 'outline':
                    enumeration.pushInstance({
                        objectName: 'outline',
                        selector: null,
                        properties: {
                            show: this.data.outline
                        },
                    });
                    break;
                case 'legend':
                    this.getLegendValue(enumeration);
                    break;
            }
            return enumeration.complete();
        }

        public hasLegend(): boolean {
            return this.data && this.data.hasDynamicSeries;
        }

        private getLegendValue(enumeration: ObjectEnumerationBuilder): void {
            if (!this.hasLegend())
                return;
            var show = DataViewObject.getValue(this.legendObjectProperties, legendProps.show, this.legend.isVisible());
            var showTitle = DataViewObject.getValue(this.legendObjectProperties, legendProps.showTitle, true);
            var titleText = DataViewObject.getValue(this.legendObjectProperties, legendProps.titleText, this.layerLegendData ? this.layerLegendData.title : '');

            enumeration.pushInstance({
                selector: null,
                properties: {
                    show: show,
                    position: LegendPosition[this.legend.getOrientation()],
                    showTitle: showTitle,
                    titleText: titleText
                },
                objectName: 'legend'
            });
        }

        private getCategoryAxisValues(enumeration: ObjectEnumerationBuilder): void {
            var supportedType = axisType.both;
            var isScalar = true;
            var logPossible = false;
            var scaleOptions = [axisScale.log, axisScale.linear];//until options can be update in propPane, show all options

            if (!isScalar) {
                if (this.categoryAxisProperties) {
                    this.categoryAxisProperties['start'] = null;
                    this.categoryAxisProperties['end'] = null;
                }
            }

            var instance: VisualObjectInstance = {
                selector: null,
                properties: {},
                objectName: 'categoryAxis',
                validValues: {
                    axisScale: scaleOptions
                }
            };

            instance.properties['show'] = this.categoryAxisProperties && this.categoryAxisProperties['show'] != null ? this.categoryAxisProperties['show'] : true;
            if (this.yAxisIsCategorical)//in case of e.g. barChart
                instance.properties['position'] = this.valueAxisProperties && this.valueAxisProperties['position'] != null ? this.valueAxisProperties['position'] : yAxisPosition.left;
            if (supportedType === axisType.both) {
                instance.properties['axisType'] = isScalar ? axisType.scalar : axisType.categorical;
            }
            if (isScalar) {
                instance.properties['axisScale'] = (this.categoryAxisProperties && this.categoryAxisProperties['axisScale'] != null && logPossible) ? this.categoryAxisProperties['axisScale'] : axisScale.linear;
                instance.properties['start'] = this.categoryAxisProperties ? this.categoryAxisProperties['start'] : null;
                instance.properties['end'] = this.categoryAxisProperties ? this.categoryAxisProperties['end'] : null;
            }
            instance.properties['showAxisTitle'] = this.categoryAxisProperties && this.categoryAxisProperties['showAxisTitle'] != null ? this.categoryAxisProperties['showAxisTitle'] : false;

            enumeration
                .pushInstance(instance)
                .pushInstance({
                    selector: null,
                    properties: {
                        axisStyle: this.categoryAxisProperties && this.categoryAxisProperties['axisStyle'] ? this.categoryAxisProperties['axisStyle'] : axisStyle.showTitleOnly,
                        labelColor: this.categoryAxisProperties ? this.categoryAxisProperties['labelColor'] : null
                    },
                    objectName: 'categoryAxis',
                    validValues: {
                        axisStyle: this.categoryAxisHasUnitType ? [axisStyle.showTitleOnly, axisStyle.showUnitOnly, axisStyle.showBoth] : [axisStyle.showTitleOnly]
                    }
                });
        }

        //todo: wrap all these object getters and other related stuff into an interface
        private getValueAxisValues(enumeration: ObjectEnumerationBuilder): void {
            var scaleOptions = [axisScale.log, axisScale.linear];  //until options can be update in propPane, show all options
            var logPossible = false;

            var instance: VisualObjectInstance = {
                selector: null,
                properties: {},
                objectName: 'valueAxis',
                validValues: {
                    axisScale: scaleOptions,
                    secAxisScale: scaleOptions
                }
            };

            instance.properties['show'] = this.valueAxisProperties && this.valueAxisProperties['show'] != null ? this.valueAxisProperties['show'] : true;

            if (!this.yAxisIsCategorical) {
                instance.properties['position'] = this.valueAxisProperties && this.valueAxisProperties['position'] != null ? this.valueAxisProperties['position'] : yAxisPosition.left;
            }
            instance.properties['axisScale'] = (this.valueAxisProperties && this.valueAxisProperties['axisScale'] != null && logPossible) ? this.valueAxisProperties['axisScale'] : axisScale.linear;
            instance.properties['start'] = this.valueAxisProperties ? this.valueAxisProperties['start'] : null;
            instance.properties['end'] = this.valueAxisProperties ? this.valueAxisProperties['end'] : null;
            instance.properties['showAxisTitle'] = this.valueAxisProperties && this.valueAxisProperties['showAxisTitle'] != null ? this.valueAxisProperties['showAxisTitle'] : false;

            enumeration
                .pushInstance(instance)
                .pushInstance({
                    selector: null,
                    properties: {
                        axisStyle: this.valueAxisProperties && this.valueAxisProperties['axisStyle'] != null ? this.valueAxisProperties['axisStyle'] : axisStyle.showTitleOnly,
                        labelColor: this.valueAxisProperties ? this.valueAxisProperties['labelColor'] : null
                    },
                    objectName: 'valueAxis',
                    validValues: {
                        axisStyle: this.valueAxisHasUnitType ? [axisStyle.showTitleOnly, axisStyle.showUnitOnly, axisStyle.showBoth] : [axisStyle.showTitleOnly]
                    },
                });
        }

        public onClearSelection(): void {
            if (this.interactivityService)
                this.interactivityService.clearSelection();
        }
    }
}