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
    import ValueFormatter = powerbi.visuals.valueFormatter;
    import SelectionManager = utility.SelectionManager;
    import ClassAndSelector = jsCommon.CssConstants.ClassAndSelector;
    import createClassAndSelector = jsCommon.CssConstants.createClassAndSelector;

    export interface Task {
        duration: number;
        index: number;
        description: string;
        shape: string;
        resource: string;
        id: string;
        group: string;
        start: Date;
        end: Date;
        completion: number;
        color: string;
        name: string;
        selectionId: SelectionId;
        tooltipInfo: TooltipDataItem[];
    }

    export interface GanttChartSettings {
        startDateFormatter: IValueFormatter;
        completionFormatter: IValueFormatter;
        durationFormatter: IValueFormatter;
    }

    export interface GanttViewModel {
        tasks: Task[];
        fixedHeight: number;
        paddingLines: number;
        paddingTasks: number;
    }

    interface GanttLine {
        x1: number;
        y1: number;
        x2: number;
        y2: number;
    }

    interface DurationAndCompletion {
        duration: number;
        completion: number;
    }

    export class Gantt implements IVisual {
        private static ClassName: string = "gantt";

        private static ChartSelector: ClassAndSelector = createClassAndSelector("chart");
        private static ChartLineSelector: ClassAndSelector = createClassAndSelector("chart-line");

        private static BodySelector: ClassAndSelector = createClassAndSelector("gantt-body");
        private static AxisGroupSelector: ClassAndSelector = createClassAndSelector("axis");

        private static TasksSelector: ClassAndSelector = createClassAndSelector("tasks");
        private static TaskSelector: ClassAndSelector = createClassAndSelector("task");
        private static TaskRectSelector: ClassAndSelector = createClassAndSelector("task-rect");
        private static TaskProgressSelector: ClassAndSelector = createClassAndSelector("task-progress");

        private static MilestonesSelector: ClassAndSelector = createClassAndSelector("milestones");
        private static MilestoneSelector: ClassAndSelector = createClassAndSelector("milestone");

        private static TaskLabelsSelector: ClassAndSelector = createClassAndSelector("task-labels");

        private static TaskLinesSelector: ClassAndSelector = createClassAndSelector("task-lines");
        private static TaskLineSelector: ClassAndSelector = createClassAndSelector("task-line");

        private static LabelSelector: ClassAndSelector = createClassAndSelector("label");

        private static FixedHeight: number = 45;
        private static PaddingLines: number = 0;
        private static PaddingTasks: number = 0.15;

        private static OpacityOfSelectionTask: number = 0.2;

        public static capabilities: VisualCapabilities = {
            dataRoles: [
                {
                    name: "Task",
                    kind: VisualDataRoleKind.Grouping,
                    displayName: "Task"
                }, {
                    name: "StartDate",
                    kind: VisualDataRoleKind.Grouping,
                    displayName: "Start Date"
                }, {
                    name: "Duration",
                    kind: VisualDataRoleKind.Measure,
                    displayName: "Duration",
                    requiredTypes: [{ numeric: true }, { integer: true }]
                }, {
                    name: "Completion",
                    kind: VisualDataRoleKind.Measure,
                    displayName: "% Completion",
                    requiredTypes: [{ numeric: true }, { integer: true }]
                }, {
                    name: "Resource",
                    kind: VisualDataRoleKind.Grouping,
                    displayName: "Resource"
                }
            ],
            dataViewMappings: [{
                conditions: [
                    {
                        "Task": { min: 1, max: 1 },
                        "StartDate": { min: 0, max: 0 },
                        "Duration": { min: 0, max: 0 },
                        "Completion": { min: 0, max: 0 },
                        "Resource": { min: 0, max: 0 }
                    }, {
                        "Task": { min: 1, max: 1 },
                        "StartDate": { min: 1, max: 1 },
                        "Duration": { min: 0, max: 0 },
                        "Completion": { min: 0, max: 0 },
                        "Resource": { min: 0, max: 0 }
                    }, {
                        "Task": { min: 1, max: 1 },
                        "StartDate": { min: 1, max: 1 },
                        "Duration": { min: 0, max: 1 },
                        "Completion": { min: 0, max: 1 },
                        "Resource": { min: 0, max: 1 },
                    }
                ],
                matrix: {
                    rows: {
                        select: [
                            { for: { in: "Task" } },
                            { for: { in: "StartDate" } },
                            { for: { in: "Resource" } }

                        ]
                    },
                    values: {
                        select: [
                            { bind: { to: "Duration" } },
                            { bind: { to: "Completion" } }
                        ]
                    }
                }
            }]
        };

        // Configuration
        private margin: IMargin = {
            top: 30,
            right: 40,
            bottom: 40,
            left: 100
        };

        private style: IVisualStyle;
        private root: D3.Selection;
        private viewModel: GanttViewModel;
        private xScale: D3.Scale.LinearScale;
        private yScale: D3.Scale.TimeScale;
        private yAxis: D3.Svg.Axis;
        private yAxisGroup: D3.Selection;

        private chartGroup: D3.Selection;
        private taskGroup: D3.Selection;
        private milestoneGroup: D3.Selection;
        private labelGroup: D3.Selection;
        private lineGroup: D3.Selection;

        private clearCatcher: D3.Selection;
        private ganttBody: D3.Selection;
        private scrollContainer: D3.Selection;

        private selectionManager: SelectionManager;

        /**
        * Core: init, convert and update, destroy
        */
        public init(options: VisualInitOptions): void {
            this.style = options.style;

            var body = d3.select(options.element.get(0));

            this.clearCatcher = appendClearCatcher(body);
            this.ganttBody = this.clearCatcher
                .append("div")
                .classed(Gantt.ChartSelector.class, true)
                .style({ "overflow": "auto" });

            this.scrollContainer = this.ganttBody.append("div")
                .classed(Gantt.BodySelector.class, true);

            this.root = this.scrollContainer
                .append("svg")
                .classed(Gantt.ClassName, true);

            this.yAxisGroup = this.root
                .append("g")
                .classed(Gantt.AxisGroupSelector.class, true);

            this.lineGroup = this.root
                .append("g")
                .classed(Gantt.TaskLinesSelector.class, true);

            this.chartGroup = this.root
                .append("g")
                .classed(Gantt.ChartSelector.class, true);

            this.taskGroup = this.chartGroup
                .append("g")
                .classed(Gantt.TasksSelector.class, true);

            this.milestoneGroup = this.chartGroup
                .append("g")
                .classed(Gantt.MilestonesSelector.class, true);

            this.labelGroup = this.root
                .append("g")
                .classed(Gantt.TaskLabelsSelector.class, true);

            this.xScale = d3.scale.linear();
            this.yScale = d3.time.scale();

            this.selectionManager = new SelectionManager({ hostServices: options.host });
        }

        public converter(dataView: DataView): GanttViewModel {
            if (!dataView ||
                !dataView.matrix ||
                !dataView.matrix.rows ||
                !dataView.matrix.rows.root) {
                return {
                    tasks: [],
                    fixedHeight: Gantt.FixedHeight,
                    paddingLines: Gantt.PaddingLines,
                    paddingTasks: Gantt.PaddingTasks
                };
            }

            var tasks: Task[],
                columnSource: DataViewMetadataColumn[] = [],
                settings: GanttChartSettings;

            settings = this.parseSettings(dataView);

            if (dataView.matrix.columns &&
                dataView.matrix.columns.levels &&
                dataView.matrix.columns.levels[0] &&
                dataView.matrix.columns.levels[0].sources) {
                columnSource = dataView.matrix.columns.levels[0].sources;
            }

            tasks = this.getTasks(columnSource, dataView.matrix.rows.root, settings);

            return {
                tasks: tasks,
                fixedHeight: Gantt.FixedHeight,
                paddingLines: Gantt.PaddingLines,
                paddingTasks: Gantt.PaddingTasks
            };
        }

        private parseSettings(dataView: DataView): GanttChartSettings {
            var rolesFormats: string[] = Gantt.capabilities.dataRoles
                .map(x => dataView.metadata.columns.filter(y => y.roles[x.name])[0])
                .map(x => x ? x.format : undefined);
            return <GanttChartSettings>{
                startDateFormatter: valueFormatter.create({ format: rolesFormats[1] }),
                durationFormatter: valueFormatter.create({ format: rolesFormats[2] }),
                completionFormatter: valueFormatter.create({ format: rolesFormats[3] })
            };
        }

        private getTasks(columnSource: DataViewMetadataColumn[], root: DataViewMatrixNode, settings: GanttChartSettings): Task[] {
            return root.children.map((child: DataViewTreeNode, index: number) => {
                var task: Task = <Task>{},
                    durationAndCompletion: DurationAndCompletion;

                task.index = index;
                task.name = child.value;
                task.start = this.getStartDateOfTask(child);
                task.resource = this.getResource(child);
                task.id = "ID" + index;

                durationAndCompletion = this.getDurationAndCompletion(columnSource, child);

                task.duration = durationAndCompletion.duration;
                task.completion = durationAndCompletion.completion * 100;

                task.shape = "none";
                task.color = "green";
                task.group = null;
                task.description = "";

                task.end = d3.time.day.offset(task.start, task.duration);
                task.selectionId = SelectionId.createWithId(child.identity);
                task.tooltipInfo = this.getTooltipInfo(task, settings);

                return task;
            });
        }

        private getTooltipInfo(task: Task, settings: GanttChartSettings) {
            var result: TooltipDataItem[] = [];
            result.push({ displayName: Gantt.capabilities.dataRoles[0].name, value: task.name });
            if (!isNaN(task.start.getDate())) {
                result.push({ displayName: Gantt.capabilities.dataRoles[1].name, value: settings.startDateFormatter.format(task.start) });
            }

            result.push({ displayName: Gantt.capabilities.dataRoles[2].name, value: settings.durationFormatter.format(task.duration) });
            result.push({ displayName: Gantt.capabilities.dataRoles[3].name, value: settings.completionFormatter.format(task.completion / 100) });

            if (task.resource) {
                result.push({ displayName: Gantt.capabilities.dataRoles[4].name, value: task.resource });
            }

            return result;
        }

        private getStartDateOfTask(child: DataViewTreeNode): Date {
            if (!child || !child.children || !child.children[0]) {
                return null;
            }

            return child.children[0].value;
        }

        private getResource(child: DataViewTreeNode): any {
            if (!child ||
                !child.children ||
                !child.children[0] ||
                !child.children[0].children ||
                !child.children[0].children[0]) {
                return "";
            }

            return !child.children[0].children[0].value;
        }

        private getDurationAndCompletion(columnSource: DataViewMetadataColumn[], child: DataViewTreeNode): DurationAndCompletion {
            if (!child || !columnSource || !(columnSource.length > 0)) {
                return {
                    duration: 0,
                    completion: 0
                };
            }

            if (child.values && child.values[0]) {
                return {
                    duration: this.getValue(columnSource, "Duration", child.values),
                    completion: this.getValue(columnSource, "Completion", child.values)
                };
            } else if (child.children) {
                return this.getDurationAndCompletion(columnSource, child.children[0]);
            } else {
                return this.getDurationAndCompletion([], null);
            }
        }

        private getValue(columnSource: DataViewMetadataColumn[], roleName: string, values: { [id: number]: DataViewTreeNodeValue }): number {
            if (!columnSource[0] || !columnSource[0].roles) {
                return 0;
            }

            var nodeValue: DataViewTreeNodeValue = columnSource[0].roles[roleName] ? values[0] : values[1];

            return nodeValue ? nodeValue.value || 0 : 0;
        }

        public update(options: VisualUpdateOptions) {
            if (!options.dataViews || !options.dataViews[0]) {
                return;
            };

            var viewport = options.viewport,
                viewModel: GanttViewModel = this.converter(options.dataViews[0]),
                tasks: Task[] = viewModel.tasks,
                width = viewport.width - this.margin.left - this.margin.right,
                height = viewport.height - this.margin.top - this.margin.bottom,
                taskSelection: D3.Selection;

            this.viewModel = viewModel;

            // add changes for scrolling
            this.ganttBody.style({
                "height": viewport.height + "px",
                "width": viewport.width + "px",
            });

            this.scrollContainer.style({
                "height": (tasks.length * 45 + this.margin.top) + "px",
                "width": "100%"
            });

            this.root
                .attr("fill-opacity", 0.5)
                .style({
                    "height": (tasks.length * 45 + this.margin.top) + "px",
                    "width": "100%",
                    "font-size": 10
                });

            this.yAxis = d3.svg.axis().orient("bottom");

            this.updateMisc(viewModel.tasks, width, height);
            this.updateNowLine(viewModel.tasks);
            this.updateTaskLines(viewModel.tasks, width);

            taskSelection = this.updateTasks(viewModel.tasks);

            this.updateMilestoneShapes(viewModel.tasks);
            this.updateLabels(viewModel.tasks);

            this.bindSelectionHandler(taskSelection);
        }

        private updateLabels(tasks: Task[]): void {
            var labelSelection: D3.UpdateSelection;

            labelSelection = this.labelGroup
                .selectAll(Gantt.LabelSelector.selector)
                .data(tasks);

            labelSelection
                .enter()
                .append("text");

            labelSelection
                .attr("x", 10)
                .attr("y", (task: Task, i: number) => this.getLabelY(task.index))
                .attr("fill", "black")
                .attr("stroke-width", 1)
                .text((task) => { return task.name; })
                .classed(Gantt.LabelSelector.class, true);

            labelSelection
                .exit()
                .remove();
        }

        private updateTaskLines(tasks: Task[], width: number): void {
            var taskLinesSelection: D3.UpdateSelection;

            taskLinesSelection = this.lineGroup
                .selectAll(Gantt.TaskLineSelector.selector)
                .data(tasks);

            taskLinesSelection
                .enter()
                .append("rect");

            taskLinesSelection
                .attr("x", 0)
                .attr("y", (task: Task, i: number): number => this.getBarLineY(task.index))
                .attr("width", width + this.margin.left + this.margin.right)
                .attr("height", (): number => this.getBarLineHeight())
                .attr("fill", "black")
                .attr("opacity", (task: Task, i: number): number => this.getTasklineOpacity(i))
                .classed(Gantt.TaskLineSelector.class, true);

            taskLinesSelection
                .exit()
                .remove();
        }

        private updateMilestoneShapes(tasks: Task[]): void {
            var milestoneSelection: D3.UpdateSelection;

            milestoneSelection = this.milestoneGroup
                .selectAll(Gantt.MilestoneSelector.selector)
                .data(tasks.filter(function(task) {
                    return task.shape !== "none";
                }), (task: Task) => task.index);

            milestoneSelection
                .enter()
                .append("path");

            milestoneSelection
                .attr("d", this.getMilestone())
                .attr("transform", (task: Task, i: number) => this.getMilestonePos(task))
                .style("fill", "black")
                .classed(Gantt.MilestoneSelector.class, true);

            milestoneSelection
                .exit()
                .remove();
        }

        private updateTasks(tasks: Task[]): D3.Selection {
            var taskSelection: D3.UpdateSelection,
                taskEnterSelection: D3.Selection;

            taskSelection = this.taskGroup
                .selectAll(Gantt.TaskSelector.selector)
                .data(tasks.filter((task: Task) => { return task.shape === "none"; }),
                    (task: Task) => task.index);

            taskEnterSelection = taskSelection
                .enter()
                .append("g");

            taskEnterSelection
                .append("rect")
                .classed(Gantt.TaskRectSelector.class, true);

            taskEnterSelection
                .append("rect")
                .classed(Gantt.TaskProgressSelector.class, true);

            taskSelection.classed(Gantt.TaskSelector.class, true);

            taskSelection
                .select(Gantt.TaskRectSelector.selector)
                .attr("x", (task: Task, i: number) => this.yScale(task.start))
                .attr("y", (task: Task, i: number) => this.getBarY(task.index))
                .attr("width", (task: any, i: number) => this.taskDurationToWidth(task))
                .attr("height", () => this.getBarHeight());

            taskSelection
                .select(Gantt.TaskProgressSelector.selector)
                .attr("x", (task: Task, i: number) => this.yScale(task.start))
                .attr("y", (task: Task, i: number) => this.getBarY(task.index))
                .attr("width", (task: Task, i) => this.taskProgress(task))
                .attr("height", () => this.getBarHeight())
                .style("fill", (task: Task, i: number) => this.getColorByIndex(i));

            taskSelection
                .exit()
                .remove();

            this.updateTooltips(taskSelection);

            return taskSelection;
        }

        private updateTooltips(selection: D3.Selection): void {
            TooltipManager.addTooltip(selection, (tooltipEvent: TooltipEvent) => (<Task>tooltipEvent.data).tooltipInfo);
        }

        private bindSelectionHandler(taskSelection: D3.Selection): void {
            taskSelection.on("click", (task: Task) => {
                var isMultiSelect: boolean = d3.event.altKey || d3.event.ctrlKey;

                this.selectionManager.select(task.selectionId, isMultiSelect).then((selectionIds: SelectionId[]) => {
                    this.setSelection(taskSelection, selectionIds);
                });

                d3.event.stopPropagation();
            });
        }

        private setSelection(taskSelection: D3.Selection, selectionIds: SelectionId[]): void {
            taskSelection.style("opacity", null);

            if (selectionIds.length === 0) {
                return;
            }

            taskSelection.filter((task: Task) => {
                return !selectionIds.some((selectionId: SelectionId) => {
                    return task.selectionId === selectionId;
                });
            })
            .style("opacity", Gantt.OpacityOfSelectionTask);
        }

        private getColorByIndex(index: number): string {
            return this.style.colorPalette.dataColors.getColorByIndex(index).value;
        }

        private getMilestone(): any {
            return d3.svg.symbol().type("triangle-up").size(80);
        }

        private getLabelY(i: number): number {
            var m = this.viewModel,
                y = (m.fixedHeight * i) + (m.fixedHeight * m.paddingTasks) + this.getFontSize();

            y = y - 16;

            return y;
        }

        private getMilestonePos(task: Task): string {
            return SVGUtil.translate(this.yScale(task.start), (task.index + 0.5) * this.viewModel.fixedHeight);
        }

        private taskProgress(task: Task): number {
            var fraction = (task.completion / 100),
                y = this.yScale,
                progress = (y(task.end) - y(task.start)) * fraction;

            return progress;
        }

        private getBarY(i: number): number {
            var m = this.viewModel,
                y = (m.fixedHeight * i) + (m.fixedHeight * m.paddingTasks);

            return y;
        }

        private getBarHeight(): number {
            return this.viewModel.fixedHeight - (this.viewModel.fixedHeight * this.viewModel.paddingTasks * 2);
        }

        private getBarLineY(i: number): number {
            var m = this.viewModel,
                y = (m.fixedHeight * i) + (m.fixedHeight * m.paddingLines);

            return y;
        }

        private getBarLineHeight(): number {
            var m = this.viewModel,
                height = m.fixedHeight - (m.fixedHeight * m.paddingLines * 2);

            return height;
        }

        private taskDurationToWidth(task: Task): number {
            return this.yScale(task.end) - this.yScale(task.start);
        }

        private getTasklineOpacity(i: number): number {
            var opacity: number;

            if (i % 2) {
                opacity = 0;
            }
            else {
                opacity = 0.04;
            }

            return opacity;
        }

        private updateNowLine(tasks: Task[]): void {
            var chartLineSelection: D3.UpdateSelection,
                lines: GanttLine[] = [{
                    x1: this.yScale(Date.now()),
                    y1: 0,
                    x2: this.yScale(Date.now()),
                    y2: this.getNowlineY()
                }];

            chartLineSelection = this.chartGroup
                .selectAll(Gantt.ChartLineSelector.selector)
                .data(lines);

            chartLineSelection
                .enter()
                .append("line");

            chartLineSelection
                .attr("x1", (line: GanttLine) => line.x1)
                .attr("y1", (line: GanttLine) => line.y1)
                .attr("x2", (line: GanttLine) => line.x2)
                .attr("y2", (line: GanttLine) => line.y2)
                .classed(Gantt.ChartLineSelector.class, true);

            chartLineSelection
                .exit()
                .remove();
        }

        private updateMisc(tasks: Task[], width: number, height: number): void {
            var margin: IMargin = this.margin,
                t1: Date = tasks[0].start,
                t2: Date = tasks[tasks.length - 1].end;

            this.xScale = this.xScale.range([0, height]).domain([0, tasks.length]);
            this.yScale = this.yScale.range([0, width]).domain([t1, t2]);

            this.yAxis = this.yAxis.scale(this.yScale).tickPadding(10).tickFormat((x: Date) => {
                    if (x.getDate() === 1) {
                        if (x.getMonth() === 0) {
                            return ValueFormatter.format(x, "yyyy");
                        }

                        return ValueFormatter.format(x, "MMMM");
                    }

                    return ValueFormatter.format(x, "MMM d");
                });

            this.root.attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom);

            this.yAxisGroup
                .attr("transform", SVGUtil.translate(margin.left, 5))
                .call(this.yAxis);

            this.chartGroup.attr("transform", SVGUtil.translate(margin.left, margin.top));
            this.lineGroup.attr("transform", SVGUtil.translate(0, margin.top));
            this.labelGroup.attr("transform", SVGUtil.translate(0, margin.top));
        }

        /**
        * Misc
        */
        private getNowlineY() {
            var taskNumber: number = this.viewModel.tasks.length;

            return taskNumber * this.viewModel.fixedHeight;
        }

        private getFontSize(): number {
            var m = this.viewModel;

            return (m.fixedHeight) - (m.fixedHeight * m.paddingTasks * 2);
        }

        public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstance[] {
            var instances: VisualObjectInstance[] = [];
            return instances;
        }

        public destroy(): void {
            this.root = null;
        }
    }
}