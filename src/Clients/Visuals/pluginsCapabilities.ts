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

/// <reference path="_references.ts"/>

module powerbi.visuals.capabilities {
    // This file registers the built-in capabilities
    // Please use this file to register the capabilities in the plugins.ts/pluginsNotForOSS.ts

    export let animatedNumber = powerbi.visuals.animatedNumberCapabilities;

    export let areaChart = powerbi.visuals.lineChartCapabilities;

    export let barChart = powerbi.visuals.getColumnChartCapabilities(true);

    export let card = powerbi.visuals.cardCapabilities;

    export let multiRowCard = powerbi.visuals.multiRowCardCapabilities;

    export let clusteredBarChart = powerbi.visuals.getColumnChartCapabilities(true);

    export let clusteredColumnChart = powerbi.visuals.getColumnChartCapabilities();

    export let columnChart = powerbi.visuals.getColumnChartCapabilities();

    export let comboChart = powerbi.visuals.comboChartCapabilities;

    export let dataDotChart = powerbi.visuals.dataDotChartCapabilities;

    export let dataDotClusteredColumnComboChart = powerbi.visuals.comboChartCapabilities;

    export let dataDotStackedColumnComboChart = powerbi.visuals.comboChartCapabilities;

    export let donutChart = powerbi.visuals.donutChartCapabilities;

    export let funnel = powerbi.visuals.funnelChartCapabilities;

    export let gauge = powerbi.visuals.gaugeCapabilities;

    export let hundredPercentStackedBarChart = powerbi.visuals.getColumnChartCapabilities(true);

    export let hundredPercentStackedColumnChart = powerbi.visuals.getColumnChartCapabilities();

    export let image = powerbi.visuals.imageVisualCapabilities;

    export let lineChart = powerbi.visuals.lineChartCapabilities;

    export let lineStackedColumnComboChart = powerbi.visuals.comboChartCapabilities;

    export let lineClusteredColumnComboChart = powerbi.visuals.comboChartCapabilities;

    export let map = powerbi.visuals.mapCapabilities;

    export let filledMap = powerbi.visuals.filledMapCapabilities;

    export let treemap = powerbi.visuals.treemapCapabilities;

    export let pieChart = powerbi.visuals.donutChartCapabilities;

    export let sankeyBarchart = powerbi.visuals.sankeyBarchartCapabilities;

    export let scatterChart = powerbi.visuals.scatterChartCapabilities;

    export let table = powerbi.visuals.tableCapabilities;

    export let matrix = powerbi.visuals.matrixCapabilities;

    export let slicer = powerbi.visuals.slicerCapabilities;

    export let textbox = powerbi.visuals.textboxCapabilities;

    export let waterfallChart = powerbi.visuals.waterfallChartCapabilities;

    export let cheerMeter = powerbi.visuals.cheerMeterCapabilities;

    export let sunburst = powerbi.visuals.sunburstCapabilities;

    export let scriptVisual = powerbi.visuals.scriptVisualCapabilities;
    
    export let kpi = powerbi.visuals.KPIStatusWithHistoryCapabilities;
}
