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

    import ClassAndSelector = jsCommon.CssConstants.ClassAndSelector;
    import createClassAndSelector = jsCommon.CssConstants.createClassAndSelector;
    import PixelConverter = jsCommon.PixelConverter;

    export interface ITableView {
        data(data: any[], dataIdFunction: (d) => {}, dataAppended: boolean): ITableView;
        rowHeight(rowHeight: number): ITableView;
        columnWidth(columnWidth: number): ITableView;
        orientation(orientation: string): ITableView;
        rows(rows: number): ITableView;
        columns(columns: number): ITableView;
        viewport(viewport: IViewport): ITableView;
        render(): void;
        empty(): void;
    }

    export module TableViewFactory {
        export function createTableView(options): ITableView {
            return new TableView(options);
        }
    }

    export interface TableViewViewOptions {
        enter: (selection: D3.Selection) => void;
        exit: (selection: D3.Selection) => void;
        update: (selection: D3.Selection) => void;
        loadMoreData: () => void;
        baseContainer: D3.Selection;
        rowHeight: number;
        columnWidth: number;
        orientation: string;
        rows: number;
        columns: number;
        viewport: IViewport;
        scrollEnabled: boolean;
    }

    /**
     * A UI Virtualized List, that uses the D3 Enter, Update & Exit pattern to update rows.
     * It can create lists containing either HTML or SVG elements.
     */
    class TableView implements ITableView {
        private getDatumIndex: (d: any) => {};
        private _data: any[];
        private _totalRows: number;
        private _totalColumns: number;

        private options: TableViewViewOptions;
        private visibleGroupContainer: D3.Selection;
        private scrollContainer: D3.Selection;

        private static defaultRowHeight = 0;
        private static defaultColumns = 1;

        public constructor(options: TableViewViewOptions) {
            // make a copy of options so that it is not modified later by caller
            this.options = $.extend(true, {}, options);

            this.options.baseContainer
                .style('overflow-y', 'auto')
                .attr('drag-resize-disabled', true);

            this.scrollContainer = options.baseContainer
                .append('div')
                .attr('class', 'scrollRegion');
            this.visibleGroupContainer = this.scrollContainer
                .append('div')
                .attr('class', 'visibleGroup');

            TableView.SetDefaultOptions(options);
        }

        private static SetDefaultOptions(options: TableViewViewOptions) {
            options.rowHeight = options.rowHeight || TableView.defaultRowHeight;
        }

        public rowHeight(rowHeight: number): TableView {
            this.options.rowHeight = Math.ceil(rowHeight);
            return this;
        }
        public columnWidth(columnWidth: number): TableView {
            this.options.columnWidth = Math.ceil(columnWidth);
            return this;
        }

        public orientation(orientation: string): TableView {
            this.options.orientation = orientation;
            return this;
        }

        public rows(rows: number): TableView {
            this.options.rows = Math.ceil(rows);
            return this;
        }

        public columns(columns: number): TableView {
            this.options.columns = Math.ceil(columns);
            return this;
        }

        public data(data: any[], getDatumIndex: (d) => {}, dataReset: boolean = false): ITableView {
            this._data = data;
            this.getDatumIndex = getDatumIndex;
            this.setTotalRows();
            if (dataReset) {
                $(this.options.baseContainer.node()).scrollTop(0);
            }
            return this;
        }

        public viewport(viewport: IViewport): ITableView {
            this.options.viewport = viewport;
            return this;
        }

        public empty(): void {
            this._data = [];
            this.render();
        }

        private setTotalRows(): void {
            var count = this._data.length;
            var rows = Math.min(this.options.rows, count);
            var columns = Math.min(this.options.columns, count);

            if ((columns > 0) && (rows > 0)) {
                this._totalColumns = columns;
                this._totalRows = rows;
            } else if (rows > 0) {
                this._totalRows = rows;
                this._totalColumns = Math.ceil(count / rows);
            } else if (columns > 0) {
                this._totalColumns = columns;
                this._totalRows = Math.ceil(count / columns);
            } else {
                this._totalColumns = TableView.defaultColumns;
                this._totalRows = Math.ceil(count / TableView.defaultColumns);
            }

            if (this.options.orientation === Orientation.HORIZONTAL) {
                this._totalRows = 1;
                this._totalColumns = count;
            }
        }

        public render(): void {
            var options = this.options;
            var visibleGroupContainer = this.visibleGroupContainer;
            var rowHeight = options.rowHeight || TableView.defaultRowHeight;
            var groupedData: any[] = [];
            for (var i: number = 0; i < this._totalRows; i++) {
                var k: number = i * this._totalColumns;
                groupedData.push(this._data.slice(k, k + this._totalColumns));
            }

            visibleGroupContainer.selectAll(".row").remove();
            var cellSelection = visibleGroupContainer.selectAll(".row")
                .data(groupedData)
                .enter()
                .append("div")
                .classed('row', true)
                .selectAll(".cell")
                .data(d => d);

            cellSelection
                .enter()
                .append('div')
                .classed('cell', true)
                .call(d => options.enter(d));
            cellSelection.order();

            var cellUpdateSelection = visibleGroupContainer.selectAll('.cell:not(.transitioning)');

            cellUpdateSelection.call(d => options.update(d));
            cellUpdateSelection.style({ 'height': (rowHeight > 0) ? rowHeight + 'px' : 'auto' });
            cellUpdateSelection.style({
                'width': (options.columnWidth > 0) ? options.columnWidth + 'px' : (100 / this._totalColumns) + '%'
            });

            cellSelection
                .exit()
                .call(d => options.exit(d))
                .remove();
        }
    }

    // TODO: Generate these from above, defining twice just introduces potential for error
    export var chicletSlicerProps = {
        general: {
            orientation: <DataViewObjectPropertyIdentifier>{ objectName: 'general', propertyName: 'orientation' },
            columns: <DataViewObjectPropertyIdentifier>{ objectName: 'general', propertyName: 'columns' },
            rows: <DataViewObjectPropertyIdentifier>{ objectName: 'general', propertyName: 'rows' },
            showDisabled: <DataViewObjectPropertyIdentifier>{ objectName: 'general', propertyName: 'showDisabled' },
            multiselect: <DataViewObjectPropertyIdentifier>{ objectName: 'general', propertyName: 'multiselect' },
        },
        header: {
            show: <DataViewObjectPropertyIdentifier>{ objectName: 'header', propertyName: 'show' },
            title: <DataViewObjectPropertyIdentifier>{ objectName: 'header', propertyName: 'title' },
            fontColor: <DataViewObjectPropertyIdentifier>{ objectName: 'header', propertyName: 'fontColor' },
            background: <DataViewObjectPropertyIdentifier>{ objectName: 'header', propertyName: 'background' },
            outline: <DataViewObjectPropertyIdentifier>{ objectName: 'header', propertyName: 'outline' },
            textSize: <DataViewObjectPropertyIdentifier>{ objectName: 'header', propertyName: 'textSize' },
            outlineColor: <DataViewObjectPropertyIdentifier>{ objectName: 'header', propertyName: 'outlineColor' },
            outlineWeight: <DataViewObjectPropertyIdentifier>{ objectName: 'header', propertyName: 'outlineWeight' }
        },
        rows: {
            fontColor: <DataViewObjectPropertyIdentifier>{ objectName: 'rows', propertyName: 'fontColor' },
            textSize: <DataViewObjectPropertyIdentifier>{ objectName: 'rows', propertyName: 'textSize' },
            height: <DataViewObjectPropertyIdentifier>{ objectName: 'rows', propertyName: 'height' },
            width: <DataViewObjectPropertyIdentifier>{ objectName: 'rows', propertyName: 'width' },
            background: <DataViewObjectPropertyIdentifier>{ objectName: 'rows', propertyName: 'background' },
            selectedColor: <DataViewObjectPropertyIdentifier>{ objectName: 'rows', propertyName: 'selectedColor' },
            unselectedColor: <DataViewObjectPropertyIdentifier>{ objectName: 'rows', propertyName: 'unselectedColor' },
            disabledColor: <DataViewObjectPropertyIdentifier>{ objectName: 'rows', propertyName: 'disabledColor' },
            outline: <DataViewObjectPropertyIdentifier>{ objectName: 'rows', propertyName: 'outline' },
            outlineColor: <DataViewObjectPropertyIdentifier>{ objectName: 'rows', propertyName: 'outlineColor' },
            outlineWeight: <DataViewObjectPropertyIdentifier>{ objectName: 'rows', propertyName: 'outlineWeight' },

        },
        images: {
            imageSplit: <DataViewObjectPropertyIdentifier>{ objectName: 'images', propertyName: 'imageSplit' },
            stretchImage: <DataViewObjectPropertyIdentifier>{ objectName: 'images', propertyName: 'stretchImage' },
            bottomImage: <DataViewObjectPropertyIdentifier>{ objectName: 'images', propertyName: 'bottomImage' },
        },
        selectedPropertyIdentifier: <DataViewObjectPropertyIdentifier>{ objectName: 'general', propertyName: 'selected' },
        filterPropertyIdentifier: <DataViewObjectPropertyIdentifier>{ objectName: 'general', propertyName: 'filter' },
        formatString: <DataViewObjectPropertyIdentifier>{ objectName: 'general', propertyName: 'formatString' },

    };

    module ChicletSlicerShowDisabled {
        export var INPLACE: string = 'Inplace';
        export var BOTTOM: string = 'Bottom';
        export var HIDE: string = 'Hide';

        export var type: IEnumType = createEnumType([
            { value: INPLACE, displayName: ChicletSlicerShowDisabled.INPLACE },
            { value: BOTTOM, displayName: ChicletSlicerShowDisabled.BOTTOM },
            { value: HIDE, displayName: ChicletSlicerShowDisabled.HIDE },
        ]);
    }

    module Orientation {
        export var HORIZONTAL: string = 'Horizontal';
        export var VERTICAL: string = 'Vertical';

        export var type: IEnumType = createEnumType([
            { value: HORIZONTAL, displayName: HORIZONTAL },
            { value: VERTICAL, displayName: VERTICAL }
        ]);
    }

    export interface ChicletSlicerConstructorOptions {
        behavior?: ChicletSlicerWebBehavior;
    }

    export interface ChicletSlicerData {
        categorySourceName: string;
        formatString: string;
        slicerDataPoints: ChicletSlicerDataPoint[];
        slicerSettings: ChicletSlicerSettings;
        hasSelectionOverride?: boolean;
    }

    export interface ChicletSlicerDataPoint extends SelectableDataPoint {
        category?: string;
        value?: number;
        mouseOver?: boolean;
        mouseOut?: boolean;
        isSelectAllDataPoint?: boolean;
        imageURL?: string;
        selectable?: boolean;
    }

    export interface ChicletSlicerSettings {
        general: {
            orientation: string;
            columns: number;
            rows: number;
            multiselect: boolean;
            showDisabled: string;
        };
        margin: IMargin;
        header: {
            borderBottomWidth: number;
            show: boolean;
            outline: string;
            fontColor: string;
            background: string;
            textSize: number;
            outlineColor: string;
            outlineWeight: number;
            title: string;
        };
        headerText: {
            marginLeft: number;
            marginTop: number;
        };
        slicerText: {
            textSize: number;
            height: number;
            width: number;
            fontColor: string;
            hoverColor: string;
            selectedColor: string;
            unselectedColor: string;
            disabledColor: string;
            marginLeft: number;
            outline: string;
            background: string;
            outlineColor: string;
            outlineWeight: number;
        };
        slicerItemContainer: {
            marginTop: number;
            marginLeft: number;
        };
        images: {
            imageSplit: number;
            stretchImage: boolean;
            bottomImage: boolean;
        };
    }

    export class ChicletSlicer implements IVisual {
        public static capabilities: VisualCapabilities = {
            dataRoles: [
                {
                    name: 'Category',
                    kind: VisualDataRoleKind.Grouping,
                    displayName: powerbi.data.createDisplayNameGetter('Role_DisplayName_Field'),
                },
                {
                    name: 'Values',
                    kind: VisualDataRoleKind.Measure,
                    displayName: data.createDisplayNameGetter('Role_DisplayName_Values'),
                },
                {
                    name: 'Image',
                    kind: VisualDataRoleKind.Grouping,
                    displayName: 'Image',
                },
            ],
            objects: {
                general: {
                    displayName: data.createDisplayNameGetter('Visual_General'),
                    properties: {
                        orientation: {
                            displayName: 'Orientation',
                            type: { enumeration: Orientation.type }
                        },
                        columns: {
                            displayName: 'Columns',
                            type: { numeric: true }
                        },
                        rows: {
                            displayName: 'Rows',
                            type: { numeric: true }
                        },
                        showDisabled: {
                            displayName: 'Show Disabled',
                            type: { enumeration: ChicletSlicerShowDisabled.type }
                        },
                        multiselect: {
                            displayName: 'Multiple selection',
                            type: { bool: true }
                        },
                        selected: {
                            type: { bool: true }
                        },
                        filter: {
                            type: { filter: {} },
                            rule: {
                                output: {
                                    property: 'selected',
                                    selector: ['Category'],
                                }
                            }
                        },
                        formatString: {
                            type: { formatting: { formatString: true } },
                        },
                    },
                },
                header: {
                    displayName: data.createDisplayNameGetter('Visual_Header'),
                    properties: {
                        show: {
                            displayName: data.createDisplayNameGetter('Visual_Show'),
                            type: { bool: true }
                        },
                        title: {
                            displayName: 'Title',
                            type: { text: true }
                        },
                        fontColor: {
                            displayName: data.createDisplayNameGetter('Visual_FontColor'),
                            type: { fill: { solid: { color: true } } }
                        },
                        background: {
                            displayName: data.createDisplayNameGetter('Visual_Background'),
                            type: { fill: { solid: { color: true } } }
                        },
                        outline: {
                            displayName: data.createDisplayNameGetter('Visual_Outline'),
                            type: { formatting: { outline: true } }
                        },
                        textSize: {
                            displayName: data.createDisplayNameGetter('Visual_TextSize'),
                            type: { numeric: true }
                        },
                        outlineColor: {
                            displayName: data.createDisplayNameGetter('Visual_outlineColor'),
                            type: { fill: { solid: { color: true } } }
                        },
                        outlineWeight: {
                            displayName: data.createDisplayNameGetter('Visual_outlineWeight'),
                            type: { numeric: true }
                        }
                    }
                },
                rows: {
                    displayName: 'Chiclets',
                    properties: {
                        fontColor: {
                            displayName: 'Text color',
                            type: { fill: { solid: { color: true } } }
                        },
                        textSize: {
                            displayName: data.createDisplayNameGetter('Visual_TextSize'),
                            type: { numeric: true }
                        },
                        height: {
                            displayName: 'Height',
                            type: { numeric: true }
                        },
                        width: {
                            displayName: 'Width',
                            type: { numeric: true }
                        },
                        selectedColor: {
                            displayName: 'Selected Color',
                            type: { fill: { solid: { color: true } } }
                        },
                        unselectedColor: {
                            displayName: 'Unselected Color',
                            type: { fill: { solid: { color: true } } }
                        },
                        disabledColor: {
                            displayName: 'Disabled Color',
                            type: { fill: { solid: { color: true } } }
                        },
                        background: {
                            displayName: data.createDisplayNameGetter('Visual_Background'),
                            type: { fill: { solid: { color: true } } }
                        },
                        outline: {
                            displayName: data.createDisplayNameGetter('Visual_Outline'),
                            type: { formatting: { outline: true } }
                        },
                        outlineColor: {
                            displayName: data.createDisplayNameGetter('Visual_outlineColor'),
                            type: { fill: { solid: { color: true } } }
                        },
                        outlineWeight: {
                            displayName: data.createDisplayNameGetter('Visual_outlineWeight'),
                            type: { numeric: true }
                        },

                    }
                },
                images: {
                    displayName: 'Images',
                    properties: {
                        imageSplit: {
                            displayName: 'Image Split',
                            type: { numeric: true }
                        },
                        stretchImage: {
                            displayName: 'Stretch image',
                            type: { bool: true }
                        },
                        bottomImage: {
                            displayName: 'Bottom image',
                            type: { bool: true }
                        },
                    }
                },
            },
            dataViewMappings: [{
                conditions: [
                    { 'Category': { max: 1 }, 'Image': { min: 0, max: 1 }, 'Values': { min: 0, max: 1 } }],
                categorical: {
                    categories: {
                        for: { in: 'Category' },
                        dataReductionAlgorithm: { top: {} }
                    },
                    values: {
                        group: {
                            by: 'Image',
                            select: [{ bind: { to: 'Values' } },
                            ],
                            dataReductionAlgorithm: { top: {} }
                        }
                    },
                    includeEmptyGroups: true
                }
            }],
            supportsHighlight: true,
            sorting: {
                default: {},
            },
            drilldown: {
                roles: ['Category']
            },
            suppressDefaultTitle: true,
        };
        private element: JQuery;
        private currentViewport: IViewport;
        private dataView: DataView;
        private slicerHeader: D3.Selection;
        private slicerBody: D3.Selection;
        private tableView: ITableView;
        private slicerData: ChicletSlicerData;
        private settings: ChicletSlicerSettings;
        private interactivityService: IInteractivityService;
        private behavior: ChicletSlicerWebBehavior;
        private hostServices: IVisualHostServices;
        private waitingForData: boolean;
        private textProperties: TextProperties = {
            'fontFamily': 'Tahoma, Verdana, Geneva, sans-serif',
            'fontSize': '14px',
        };
        private static ItemContainer: ClassAndSelector = createClassAndSelector('slicerItemContainer');
        private static HeaderText: ClassAndSelector = createClassAndSelector('headerText');
        private static Container: ClassAndSelector = createClassAndSelector('chicletSlicer');
        private static LabelText: ClassAndSelector = createClassAndSelector('slicerText');
        private static Header: ClassAndSelector = createClassAndSelector('slicerHeader');
        private static Input: ClassAndSelector = createClassAndSelector('slicerCheckbox');
        private static Clear: ClassAndSelector = createClassAndSelector('clear');
        private static Body: ClassAndSelector = createClassAndSelector('slicerBody');

        public static DefaultStyleProperties(): ChicletSlicerSettings {
            return {
                general: {
                    orientation: Orientation.VERTICAL,
                    columns: 3,
                    rows: 0,
                    multiselect: true,
                    showDisabled: ChicletSlicerShowDisabled.INPLACE
                },
                margin: {
                    top: 50,
                    bottom: 50,
                    right: 50,
                    left: 50
                },
                header: {
                    borderBottomWidth: 1,
                    show: true,
                    outline: 'BottomOnly',
                    fontColor: '#a6a6a6',
                    background: '#ffffff',
                    textSize: 10,
                    outlineColor: '#a6a6a6',
                    outlineWeight: 1,
                    title: '',
                },
                headerText: {
                    marginLeft: 8,
                    marginTop: 0
                },
                slicerText: {
                    textSize: 10,
                    height: 0,
                    width: 0,
                    fontColor: '#666666',
                    hoverColor: '#212121',
                    selectedColor: '#BDD7EE',
                    unselectedColor: '#ffffff',
                    disabledColor: 'grey',
                    marginLeft: 8,
                    outline: 'Frame',
                    background: '#ffffff',
                    outlineColor: '#000000',
                    outlineWeight: 1,

                },
                slicerItemContainer: {
                    // The margin is assigned in the less file. This is needed for the height calculations.
                    marginTop: 5,
                    marginLeft: 0,
                },
                images: {
                    imageSplit: 50,
                    stretchImage: false,
                    bottomImage: false
                }
            };
        }

        constructor(options?: ChicletSlicerConstructorOptions) {
            if (options) {
                if (options.behavior) {
                    this.behavior = options.behavior;
                }
            }
            if (!this.behavior) {
                this.behavior = new ChicletSlicerWebBehavior();
            }

        }

        public static converter(dataView: DataView, localizedSelectAllText: string, interactivityService: IInteractivityService): ChicletSlicerData {
            if (!dataView ||
                !dataView.categorical ||
                !dataView.categorical.categories ||
                !dataView.categorical.categories[0] ||
                !dataView.categorical.categories[0].values ||
                !(dataView.categorical.categories[0].values.length > 0)) {
                return;
            }
            var converter = new ChicletSlicerChartConversion.ChicletSlicerConverter(dataView, interactivityService);
            converter.convert();
            var slicerData: ChicletSlicerData;
            var defaultSettings: ChicletSlicerSettings = this.DefaultStyleProperties();
            var objects: DataViewObjects = dataView.metadata.objects;
            if (objects) {
                defaultSettings.general.orientation = DataViewObjects.getValue<string>(objects, chicletSlicerProps.general.orientation, defaultSettings.general.orientation);
                defaultSettings.general.columns = DataViewObjects.getValue<number>(objects, chicletSlicerProps.general.columns, defaultSettings.general.columns);
                defaultSettings.general.rows = DataViewObjects.getValue<number>(objects, chicletSlicerProps.general.rows, defaultSettings.general.rows);
                defaultSettings.general.multiselect = DataViewObjects.getValue<boolean>(objects, chicletSlicerProps.general.multiselect, defaultSettings.general.multiselect);
                defaultSettings.general.showDisabled = DataViewObjects.getValue<string>(objects, chicletSlicerProps.general.showDisabled, defaultSettings.general.showDisabled);

                defaultSettings.header.show = DataViewObjects.getValue<boolean>(objects, chicletSlicerProps.header.show, defaultSettings.header.show);
                defaultSettings.header.title = DataViewObjects.getValue<string>(objects, chicletSlicerProps.header.title, defaultSettings.header.title);
                defaultSettings.header.fontColor = DataViewObjects.getFillColor(objects, chicletSlicerProps.header.fontColor, defaultSettings.header.fontColor);
                defaultSettings.header.background = DataViewObjects.getFillColor(objects, chicletSlicerProps.header.background, defaultSettings.header.background);
                defaultSettings.header.textSize = DataViewObjects.getValue<number>(objects, chicletSlicerProps.header.textSize, defaultSettings.header.textSize);
                defaultSettings.header.outline = DataViewObjects.getValue<string>(objects, chicletSlicerProps.header.outline, defaultSettings.header.outline);
                defaultSettings.header.outlineColor = DataViewObjects.getFillColor(objects, chicletSlicerProps.header.outlineColor, defaultSettings.header.outlineColor);
                defaultSettings.header.outlineWeight = DataViewObjects.getValue<number>(objects, chicletSlicerProps.header.outlineWeight, defaultSettings.header.outlineWeight);

                defaultSettings.slicerText.textSize = DataViewObjects.getValue<number>(objects, chicletSlicerProps.rows.textSize, defaultSettings.slicerText.textSize);
                defaultSettings.slicerText.height = DataViewObjects.getValue<number>(objects, chicletSlicerProps.rows.height, defaultSettings.slicerText.height);
                defaultSettings.slicerText.width = DataViewObjects.getValue<number>(objects, chicletSlicerProps.rows.width, defaultSettings.slicerText.width);
                defaultSettings.slicerText.selectedColor = DataViewObjects.getFillColor(objects, chicletSlicerProps.rows.selectedColor, defaultSettings.slicerText.selectedColor);
                defaultSettings.slicerText.unselectedColor = DataViewObjects.getFillColor(objects, chicletSlicerProps.rows.unselectedColor, defaultSettings.slicerText.unselectedColor);
                defaultSettings.slicerText.disabledColor = DataViewObjects.getFillColor(objects, chicletSlicerProps.rows.disabledColor, defaultSettings.slicerText.disabledColor);
                defaultSettings.slicerText.background = DataViewObjects.getFillColor(objects, chicletSlicerProps.rows.background, defaultSettings.slicerText.background);
                defaultSettings.slicerText.fontColor = DataViewObjects.getFillColor(objects, chicletSlicerProps.rows.fontColor, defaultSettings.slicerText.fontColor);
                defaultSettings.slicerText.outline = DataViewObjects.getValue<string>(objects, chicletSlicerProps.rows.outline, defaultSettings.slicerText.outline);
                defaultSettings.slicerText.outlineColor = DataViewObjects.getFillColor(objects, chicletSlicerProps.rows.outlineColor, defaultSettings.slicerText.outlineColor);
                defaultSettings.slicerText.outlineWeight = DataViewObjects.getValue<number>(objects, chicletSlicerProps.rows.outlineWeight, defaultSettings.slicerText.outlineWeight);

                defaultSettings.images.imageSplit = DataViewObjects.getValue<number>(objects, chicletSlicerProps.images.imageSplit, defaultSettings.images.imageSplit);
                defaultSettings.images.stretchImage = DataViewObjects.getValue<boolean>(objects, chicletSlicerProps.images.stretchImage, defaultSettings.images.stretchImage);
                defaultSettings.images.bottomImage = DataViewObjects.getValue<boolean>(objects, chicletSlicerProps.images.bottomImage, defaultSettings.images.bottomImage);
            }
            var categories: DataViewCategoricalColumn = dataView.categorical.categories[0];

            slicerData = {
                categorySourceName: categories.source.displayName,
                formatString: valueFormatter.getFormatString(categories.source, chicletSlicerProps.formatString),
                slicerSettings: defaultSettings,
                slicerDataPoints: converter.dataPoints,
            };

            // Override hasSelection if a objects contained more scopeIds than selections we found in the data
            slicerData.hasSelectionOverride = converter.hasSelectionOverride;

            return slicerData;
        }

        public init(options: VisualInitOptions): void {
            this.element = options.element;
            this.currentViewport = options.viewport;
            if (this.behavior) {
                this.interactivityService = createInteractivityService(options.host);
            }
            this.hostServices = options.host;
            this.settings = ChicletSlicer.DefaultStyleProperties();

            this.initContainer();
        }

        public update(options: VisualUpdateOptions) {
            if (!options ||
                !options.dataViews ||
                !options.dataViews[0] ||
                !options.viewport) {
                return;
            }

            var existingDataView = this.dataView;
            this.dataView = options.dataViews[0];

            var resetScrollbarPosition: boolean = true;
            if (existingDataView) {
                resetScrollbarPosition = !DataViewAnalysis.hasSameCategoryIdentity(existingDataView, this.dataView);
            }

            if (options.viewport.height === this.currentViewport.height
                && options.viewport.width === this.currentViewport.width) {
                this.waitingForData = false;
            }
            else {
                this.currentViewport = options.viewport;
            }

            this.updateInternal(resetScrollbarPosition);
        }

        public onResizing(finalViewport: IViewport): void {
            this.currentViewport = finalViewport;
            this.updateInternal(false /* resetScrollbarPosition */);
        }

        public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstance[] {
            var data: ChicletSlicerData = this.slicerData;
            if (!data) {
                return;
            }

            var objectName = options.objectName;
            switch (objectName) {
                case 'rows':
                    return this.enumerateRows(data);
                case 'header':
                    return this.enumerateHeader(data);
                case 'general':
                    return this.enumerateGeneral(data);
                case 'images':
                    return this.enumerateImages(data);
            }
        }

        private enumerateHeader(data: ChicletSlicerData): VisualObjectInstance[] {
            var slicerSettings: ChicletSlicerSettings = this.settings;
            return [{
                selector: null,
                objectName: 'header',
                properties: {
                    show: slicerSettings.header.show,
                    title: slicerSettings.header.title,
                    fontColor: slicerSettings.header.fontColor,
                    background: slicerSettings.header.background,
                    textSize: slicerSettings.header.textSize,
                    outline: slicerSettings.header.outline,
                    outlineColor: slicerSettings.header.outlineColor,
                    outlineWeight: slicerSettings.header.outlineWeight
                }
            }];
        }

        private enumerateRows(data: ChicletSlicerData): VisualObjectInstance[] {
            var slicerSettings: ChicletSlicerSettings = this.settings;
            return [{
                selector: null,
                objectName: 'rows',
                properties: {
                    textSize: slicerSettings.slicerText.textSize,
                    height: slicerSettings.slicerText.height,
                    width: slicerSettings.slicerText.width,
                    background: slicerSettings.slicerText.background,
                    selectedColor: slicerSettings.slicerText.selectedColor,
                    unselectedColor: slicerSettings.slicerText.unselectedColor,
                    disabledColor: slicerSettings.slicerText.disabledColor,
                    outline: slicerSettings.slicerText.outline,
                    outlineColor: slicerSettings.slicerText.outlineColor,
                    outlineWeight: slicerSettings.slicerText.outlineWeight,
                    fontColor: slicerSettings.slicerText.fontColor,
                }
            }];
        }

        private enumerateGeneral(data: ChicletSlicerData): VisualObjectInstance[] {
            var slicerSettings: ChicletSlicerSettings = this.settings;

            return [{
                selector: null,
                objectName: 'general',
                properties: {
                    orientation: slicerSettings.general.orientation,
                    columns: slicerSettings.general.columns,
                    rows: slicerSettings.general.rows,
                    showDisabled: slicerSettings.general.showDisabled,
                    multiselect: slicerSettings.general.multiselect,
                }
            }];
        }

        private enumerateImages(data: ChicletSlicerData): VisualObjectInstance[] {
            var slicerSettings: ChicletSlicerSettings = this.settings;
            return [{
                selector: null,
                objectName: 'images',
                properties: {
                    imageSplit: slicerSettings.images.imageSplit,
                    stretchImage: slicerSettings.images.stretchImage,
                    bottomImage: slicerSettings.images.bottomImage,
                }
            }];
        }
        private updateInternal(resetScrollbarPosition: boolean) {
            this.updateSlicerBodyDimensions();

            var localizedSelectAllText: string = 'Select All';
            var data = ChicletSlicer.converter(this.dataView, localizedSelectAllText, this.interactivityService);
            if (!data) {
                this.tableView.empty();
                return;
            }
            data.slicerSettings.header.outlineWeight = data.slicerSettings.header.outlineWeight < 0 ? 0 : data.slicerSettings.header.outlineWeight;
            this.slicerData = data;
            this.settings = this.slicerData.slicerSettings;
            if (this.settings.general.showDisabled === ChicletSlicerShowDisabled.BOTTOM) {
                data.slicerDataPoints.sort(function (a, b) {
                    if (a.selectable === b.selectable) {
                        return 0;
                    } else if (a.selectable && !b.selectable) {
                        return -1;
                    } else {
                        return 1;
                    }
                });
            }

            var height: number = this.settings.slicerText.height > 0 ? this.settings.slicerText.height :
                (data.slicerDataPoints[0].imageURL !== '' ? 100 : 25);

            this.tableView
                .rowHeight(height)
                .columnWidth(this.settings.slicerText.width)
                .orientation(this.settings.general.orientation)
                .rows(this.settings.general.rows)
                .columns(this.settings.general.columns)
                .data(data.slicerDataPoints,
                	  (d: ChicletSlicerDataPoint) => $.inArray(d, data.slicerDataPoints),
                      resetScrollbarPosition)
                .viewport(this.getSlicerBodyViewport(this.currentViewport))
                .render();
        }

        private initContainer() {
            var settings: ChicletSlicerSettings = this.settings;
            var slicerBodyViewport: IViewport = this.getSlicerBodyViewport(this.currentViewport);
            var slicerContainer: D3.Selection = d3.select(this.element.get(0))
                .append('div')
                .classed(ChicletSlicer.Container.class, true);

            this.slicerHeader = slicerContainer
                .append('div')
                .classed(ChicletSlicer.Header.class, true);

            this.slicerHeader
                .append('span')
                .classed(ChicletSlicer.Clear.class, true)
                .attr('title', 'Clear');

            this.slicerHeader
                .append('div')
                .classed(ChicletSlicer.HeaderText.class, true)
                .style({
                    'margin-left': PixelConverter.toString(settings.headerText.marginLeft),
                    'margin-top': PixelConverter.toString(settings.headerText.marginTop),
                    'border-style': this.getBorderStyle(settings.header.outline),
                    'border-color': settings.header.outlineColor,
                    'border-width': this.getBorderWidth(settings.header.outline, settings.header.outlineWeight),
                    'font-size': PixelConverter.fromPoint(settings.header.textSize),
                });

            this.slicerBody = slicerContainer
                .append('div').classed(ChicletSlicer.Body.class, true)
                .classed('slicerBody-horizontal', settings.general.orientation === Orientation.HORIZONTAL)
                .style({
                    'height': PixelConverter.toString(slicerBodyViewport.height),
                    'width': '100%',
                });

            var rowEnter = (rowSelection: D3.Selection) => {
                var settings: ChicletSlicerSettings = this.settings;
                var listItemElement = rowSelection.append('li')
                    .classed(ChicletSlicer.ItemContainer.class, true)
                    .style({
                        'margin-left': PixelConverter.toString(settings.slicerItemContainer.marginLeft),
                    });

                listItemElement.append('div')
                    .classed('slicer-img-wrapper', true);

                listItemElement.append('div')
                    .classed('slicer-text-wrapper', true)
                    .append('span')
                    .classed(ChicletSlicer.LabelText.class, true)
                    .style({
                        'font-size': PixelConverter.fromPoint(settings.slicerText.textSize),
                    });
            };

            var rowUpdate = (rowSelection: D3.Selection) => {
                var settings: ChicletSlicerSettings = this.settings;
                var data = this.slicerData;
                if (data && settings) {
                    this.slicerHeader.classed('hidden', !settings.header.show);
                    this.slicerHeader.select(ChicletSlicer.HeaderText.selector)
                        .text(settings.header.title.trim() !== "" ? settings.header.title.trim() : this.slicerData.categorySourceName)
                        .style({
                            'border-style': this.getBorderStyle(settings.header.outline),
                            'border-color': settings.header.outlineColor,
                            'border-width': this.getBorderWidth(settings.header.outline, settings.header.outlineWeight),
                            'color': settings.header.fontColor,
                            'background-color': settings.header.background,
                            'font-size': PixelConverter.fromPoint(settings.header.textSize),
                        });

                    this.slicerBody
                        .classed('slicerBody-horizontal', settings.general.orientation === Orientation.HORIZONTAL);

                    var slicerText = rowSelection.selectAll(ChicletSlicer.LabelText.selector);

                    var formatString = data.formatString;
                    slicerText.text((d: ChicletSlicerDataPoint) => valueFormatter.format(d.category, formatString));

                    var slicerImg = rowSelection.selectAll('.slicer-img-wrapper');
                    slicerImg
                        .style('height', settings.images.imageSplit + '%')
                        .classed('hidden', (d: ChicletSlicerDataPoint) => {
                            if (!(d.imageURL)) {
                                return true;
                            }
                            if (settings.images.imageSplit < 10) {
                                return true;
                            }
                        })
                        .style('display', (d: ChicletSlicerDataPoint) => (d.imageURL) ? 'flex' : 'none')
                        .classed('stretchImage', settings.images.stretchImage)
                        .classed('bottomImage', settings.images.bottomImage)
                        .style('background-image', (d: ChicletSlicerDataPoint) => {
                            return d.imageURL ? `url(${d.imageURL})` : '';
                        });

                    rowSelection.selectAll('.slicer-text-wrapper')
                        .style('height', (d: ChicletSlicerDataPoint) => {
                            return d.imageURL ? (100 - settings.images.imageSplit) + '%' : '100%';
                        })
                        .classed('hidden', (d: ChicletSlicerDataPoint) => {
                            if (settings.images.imageSplit > 90) {
                                return true;
                            }
                        });

                    rowSelection.selectAll('.slicerItemContainer').style({
                        'color': settings.slicerText.fontColor,
                        'border-style': this.getBorderStyle(settings.slicerText.outline),
                        'border-color': settings.slicerText.outlineColor,
                        'border-width': this.getBorderWidth(settings.slicerText.outline, settings.slicerText.outlineWeight),
                        'font-size': PixelConverter.fromPoint(settings.slicerText.textSize),
                    });
                    rowSelection.style('display', (d: ChicletSlicerDataPoint) => (d.selectable || settings.general.showDisabled !== ChicletSlicerShowDisabled.HIDE) ? 'inline-block' : 'none');
                    this.slicerBody.style('background-color', settings.slicerText.background);

                    if (this.interactivityService && this.slicerBody) {
                        var slicerBody = this.slicerBody.attr('width', this.currentViewport.width);
                        var slicerItemContainers = slicerBody.selectAll(ChicletSlicer.ItemContainer.selector);
                        var slicerItemLabels = slicerBody.selectAll(ChicletSlicer.LabelText.selector);
                        var slicerItemInputs = slicerBody.selectAll(ChicletSlicer.Input.selector);
                        var slicerClear = this.slicerHeader.select(ChicletSlicer.Clear.selector);

                        var behaviorOptions: ChicletSlicerBehaviorOptions = {
                            dataPoints: data.slicerDataPoints,
                            slicerItemContainers: slicerItemContainers,
                            slicerItemLabels: slicerItemLabels,
                            slicerItemInputs: slicerItemInputs,
                            slicerClear: slicerClear,
                            interactivityService: this.interactivityService,
                            slicerSettings: data.slicerSettings,
                        };

                        this.interactivityService.bind(data.slicerDataPoints, this.behavior, behaviorOptions, {
                            overrideSelectionFromData: true,
                            hasSelectionOverride: data.hasSelectionOverride
                        });
                        this.behavior.styleSlicerInputs(rowSelection.select(ChicletSlicer.ItemContainer.selector),
                            this.interactivityService.hasSelection());
                    }
                    else {
                        this.behavior.styleSlicerInputs(rowSelection.select(ChicletSlicer.ItemContainer.selector), false);
                    }
                }
            };

            var rowExit = (rowSelection: D3.Selection) => {
                rowSelection.remove();
            };

            var tableViewOptions: TableViewViewOptions = {
                rowHeight: this.getRowHeight(),
                columnWidth: this.settings.slicerText.width,
                orientation: this.settings.general.orientation,
                rows: this.settings.general.rows,
                columns: this.settings.general.columns,
                enter: rowEnter,
                exit: rowExit,
                update: rowUpdate,
                loadMoreData: () => this.onLoadMoreData(),
                scrollEnabled: true,
                viewport: this.getSlicerBodyViewport(this.currentViewport),
                baseContainer: this.slicerBody,
            };

            this.tableView = TableViewFactory.createTableView(tableViewOptions);
        }

        private onLoadMoreData(): void {
            if (!this.waitingForData && this.dataView.metadata && this.dataView.metadata.segment) {
                this.hostServices.loadMoreData();
                this.waitingForData = true;
            }
        }

        private getSlicerBodyViewport(currentViewport: IViewport): IViewport {
            var settings = this.settings;
            var headerHeight = (settings.header.show) ? this.getHeaderHeight() : 0;
            var slicerBodyHeight = currentViewport.height - (headerHeight + settings.header.borderBottomWidth);
            return {
                height: slicerBodyHeight,
                width: currentViewport.width
            };
        }

        private updateSlicerBodyDimensions(): void {
            var slicerViewport: IViewport = this.getSlicerBodyViewport(this.currentViewport);
            this.slicerBody
                .style({
                    'height': PixelConverter.toString(slicerViewport.height),
                    'width': '100%',
                });
        }

        private getTextProperties(textSize: number): TextProperties {
            this.textProperties.fontSize = PixelConverter.fromPoint(textSize);
            return this.textProperties;
        }

        private getHeaderHeight(): number {
            return TextMeasurementService.estimateSvgTextHeight(
            	this.getTextProperties(this.settings.header.textSize));
        }

        private getRowHeight(): number {
            var textSettings = this.settings.slicerText;
            return textSettings.height !== 0
            	? textSettings.height
            	: TextMeasurementService.estimateSvgTextHeight(this.getTextProperties(textSettings.textSize));
        }

        private getBorderStyle(outlineElement: string): string {
            return outlineElement === '0px' ? 'none' : 'solid';
        }

        private getBorderWidth(outlineElement: string, outlineWeight: number): string {
            switch (outlineElement) {
                case 'None':
                    return '0px';
                case 'BottomOnly':
                    return '0px 0px ' + outlineWeight + 'px 0px';
                case 'TopOnly':
                    return outlineWeight + 'px 0px 0px 0px';
                case 'TopBottom':
                    return outlineWeight + 'px 0px ' + outlineWeight + 'px 0px';
                case 'LeftRight':
                    return '0px ' + outlineWeight + 'px 0px ' + outlineWeight + 'px';
                case 'Frame':
                    return outlineWeight + 'px';
                default:
                    return outlineElement.replace("1", outlineWeight.toString());
            }
        }
    }

    module ChicletSlicerChartConversion {
        export class ChicletSlicerConverter {
            private dataViewCategorical: DataViewCategorical;
            private dataViewMetadata: DataViewMetadata;
            private category: DataViewCategoryColumn;
            private categoryIdentities: DataViewScopeIdentity[];
            private categoryValues: any[];
            private categoryColumnRef: data.SQExpr[];
            private categoryFormatString: string;
            private interactivityService: IInteractivityService;

            public numberOfCategoriesSelectedInData: number;
            public dataPoints: ChicletSlicerDataPoint[];
            public hasSelectionOverride: boolean;

            public constructor(dataView: DataView, interactivityService: IInteractivityService) {

                var dataViewCategorical = dataView.categorical;
                this.dataViewCategorical = dataViewCategorical;
                this.dataViewMetadata = dataView.metadata;

                if (dataViewCategorical.categories && dataViewCategorical.categories.length > 0) {
                    this.category = dataViewCategorical.categories[0];
                    this.categoryIdentities = this.category.identity;
                    this.categoryValues = this.category.values;
                    this.categoryColumnRef = this.category.identityFields;
                    this.categoryFormatString = valueFormatter.getFormatString(this.category.source, chicletSlicerProps.formatString);
                }

                this.dataPoints = [];

                this.interactivityService = interactivityService;
                this.hasSelectionOverride = false;
            }

            public convert(): void {
                this.dataPoints = [];
                this.numberOfCategoriesSelectedInData = 0;
                // If category exists, we render labels using category values. If not, we render labels
                // using measure labels.
                if (this.categoryValues) {
                    var objects = this.dataViewMetadata ? <any>this.dataViewMetadata.objects : undefined;

                    var isInvertedSelectionMode = undefined;
                    var numberOfScopeIds: number;
                    if (objects && objects.general && objects.general.filter) {
                        if (!this.categoryColumnRef)
                            return;
                        var filter = <powerbi.data.SemanticFilter>objects.general.filter;
                        var scopeIds = powerbi.data.SQExprConverter.asScopeIdsContainer(filter, this.categoryColumnRef);
                        if (scopeIds) {
                            isInvertedSelectionMode = scopeIds.isNot;
                            numberOfScopeIds = scopeIds.scopeIds ? scopeIds.scopeIds.length : 0;
                        }
                        else {
                            isInvertedSelectionMode = false;
                        }
                    }

                    if (this.interactivityService) {
                        if (isInvertedSelectionMode === undefined) {
                            // The selection state is read from the Interactivity service in case of SelectAll or Clear when query doesn't update the visual
                            isInvertedSelectionMode = this.interactivityService.isSelectionModeInverted();
                        }
                        else {
                            this.interactivityService.setSelectionModeInverted(isInvertedSelectionMode);
                        }
                    }

                    var hasSelection: boolean = undefined;

                    for (var idx = 0; idx < this.categoryValues.length; idx++) {
                        var selected = isCategoryColumnSelected(chicletSlicerProps.selectedPropertyIdentifier, this.category, idx);
                        if (selected != null) {
                            hasSelection = selected;
                            break;
                        }
                    }

                    var dataViewCategorical = this.dataViewCategorical;
                    var formatStringProp = chicletSlicerProps.formatString;
                    var value: number = -Infinity;
                    var imageURL: string = '';

                    for (var categoryIndex: number = 0, categoryCount = this.categoryValues.length; categoryIndex < categoryCount; categoryIndex++) {
                        var categoryIdentity = this.category.identity ? this.category.identity[categoryIndex] : null;
                        var categoryIsSelected = isCategoryColumnSelected(chicletSlicerProps.selectedPropertyIdentifier, this.category, categoryIndex);
                        var selectable: boolean = true;

                        if (hasSelection != null) {
                            if (isInvertedSelectionMode) {
                                if (this.category.objects == null)
                                    categoryIsSelected = undefined;

                                if (categoryIsSelected != null) {
                                    categoryIsSelected = hasSelection;
                                }
                                else if (categoryIsSelected == null)
                                    categoryIsSelected = !hasSelection;
                            }
                            else {
                                if (categoryIsSelected == null) {
                                    categoryIsSelected = !hasSelection;
                                }
                            }
                        }

                        if (categoryIsSelected) {
                            this.numberOfCategoriesSelectedInData++;
                        }

                        var categoryValue = this.categoryValues[categoryIndex];
                        var categoryLabel = valueFormatter.format(categoryValue, this.categoryFormatString);

                        if (this.dataViewCategorical.values) {
                        
                            // Series are either measures in the multi-measure case, or the single series otherwise
                            for (var seriesIndex: number = 0; seriesIndex < this.dataViewCategorical.values.length; seriesIndex++) {
                                var seriesData = dataViewCategorical.values[seriesIndex];
                                if (seriesData.values[categoryIndex] != null) {
                                    value = seriesData.values[categoryIndex];
                                    if (seriesData.highlights) {
                                        selectable = !(seriesData.highlights[categoryIndex] === null);
                                    }
                                    if (seriesData.source.groupName && seriesData.source.groupName !== '') {
                                        imageURL = converterHelper.getFormattedLegendLabel(seriesData.source, dataViewCategorical.values, formatStringProp);
                                        if (!/^(ftp|http|https):\/\/[^ "]+$/.test(imageURL)) {
                                            imageURL = undefined;
                                        }
                                    }
                                }
                            }
                        }
                        this.dataPoints.push({
                            identity: SelectionId.createWithId(categoryIdentity),
                            category: categoryLabel,
                            imageURL: imageURL,
                            value: value,
                            selected: categoryIsSelected,
                            selectable: selectable
                        });

                    }
                    if (numberOfScopeIds != null && numberOfScopeIds > this.numberOfCategoriesSelectedInData) {
                        this.hasSelectionOverride = true;
                    }

                }
            }
        }
    }

    export interface ChicletSlicerBehaviorOptions {
        slicerItemContainers: D3.Selection;
        slicerItemLabels: D3.Selection;
        slicerItemInputs: D3.Selection;
        slicerClear: D3.Selection;
        dataPoints: ChicletSlicerDataPoint[];
        interactivityService: IInteractivityService;
        slicerSettings: ChicletSlicerSettings;
    }

    export class ChicletSlicerWebBehavior implements IInteractiveBehavior {
        private slicers: D3.Selection;
        private slicerItemLabels: D3.Selection;
        private slicerItemInputs: D3.Selection;
        private dataPoints: ChicletSlicerDataPoint[];
        private interactivityService: IInteractivityService;
        private slicerSettings: ChicletSlicerSettings;

        public bindEvents(options: ChicletSlicerBehaviorOptions, selectionHandler: ISelectionHandler): void {
            var filterPropertyId = chicletSlicerProps.filterPropertyIdentifier;
            var slicers = this.slicers = options.slicerItemContainers;
            this.slicerItemLabels = options.slicerItemLabels;
            this.slicerItemInputs = options.slicerItemInputs;
            var slicerClear = options.slicerClear;
            this.dataPoints = options.dataPoints;
            this.interactivityService = options.interactivityService;
            this.slicerSettings = options.slicerSettings;

            slicers.on("mouseover", (d: ChicletSlicerDataPoint) => {
                if (d.selectable) {
                    d.mouseOver = true;
                    d.mouseOut = false;
                    this.renderMouseover();
                }
            });

            slicers.on("mouseout", (d: ChicletSlicerDataPoint) => {
                if (d.selectable) {
                    d.mouseOver = false;
                    d.mouseOut = true;
                    this.renderMouseover();
                }
            });

            slicers.on("click", (d: ChicletSlicerDataPoint, index) => {
                if (!d.selectable) {
                    return;
                }
                var settings: ChicletSlicerSettings = this.slicerSettings;
                d3.event.preventDefault();
                if (d3.event.altKey && settings.general.multiselect) {
                    var selectedIndexes = jQuery.map(this.dataPoints, function (d, index) { if (d.selected) return index; });
                    var selIndex = selectedIndexes.length > 0 ? (selectedIndexes[selectedIndexes.length - 1]) : 0;
                    if (selIndex > index) {
                        var temp = index;
                        index = selIndex;
                        selIndex = temp;
                    }
                    selectionHandler.handleClearSelection();
                    for (var i = selIndex; i <= index; i++) {
                        selectionHandler.handleSelection(this.dataPoints[i], true /* isMultiSelect */);
                    }
                }
                else if (d3.event.ctrlKey && settings.general.multiselect) {
                    selectionHandler.handleSelection(d, true /* isMultiSelect */);
                }
                else {
                    selectionHandler.handleSelection(d, false /* isMultiSelect */);
                }
                selectionHandler.persistSelectionFilter(filterPropertyId);
            });

            slicerClear.on("click", (d: SelectableDataPoint) => {
                selectionHandler.handleClearSelection();
                selectionHandler.persistSelectionFilter(filterPropertyId);
            });
        }

        public renderSelection(hasSelection: boolean): void {
            if (!hasSelection && !this.interactivityService.isSelectionModeInverted()) {
                this.slicers.style('background', this.slicerSettings.slicerText.unselectedColor);
            }
            else {
                this.styleSlicerInputs(this.slicers, hasSelection);
            }
        }

        private renderMouseover(): void {
            this.slicerItemLabels.style({
                'color': (d: ChicletSlicerDataPoint) => {
                    if (d.mouseOver)
                        return this.slicerSettings.slicerText.hoverColor;

                    if (d.mouseOut) {
                        if (d.selected)
                            return this.slicerSettings.slicerText.fontColor;
                        else
                            return this.slicerSettings.slicerText.fontColor;
                    }
                }
            });
        }

        public styleSlicerInputs(slicers: D3.Selection, hasSelection: boolean) {
            var settings = this.slicerSettings;
            slicers.each(function (d: ChicletSlicerDataPoint) {
                d3.select(this).style({
                    'background': d.selectable ? (d.selected ? settings.slicerText.selectedColor : settings.slicerText.unselectedColor)
                        : settings.slicerText.disabledColor
                });
                d3.select(this).classed('slicerItem-disabled', !d.selectable);
            });
        }
    }
}