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

/// <reference path="typedefs/typedefs.ts"/>
/// <reference path="typedefs/typedefs.obj.ts"/>

/// <reference path="iVisual.ts"/>

/// <reference path="common/point.ts"/>
/// <reference path="common/rect.ts"/>
/// <reference path="legend.ts"/>

/// <reference path="types/axisScale.ts"/>
/// <reference path="types/axisStyle.ts"/>
/// <reference path="types/axisType.ts"/>
/// <reference path="types/basicShapeType.ts"/>
/// <reference path="types/imageScalingType.ts"/>
/// <reference path="types/labelPosition.ts"/>
/// <reference path="types/labelStyle.ts"/>
/// <reference path="types/legendPosition.ts"/>
/// <reference path="types/kpi_direction_type.ts"/>
/// <reference path="types/lineStyle.ts"/>
/// <reference path="types/outline.ts"/>
/// <reference path="types/referenceLinePosition.ts"/>
/// <reference path="types/slicerOrientation.ts"/>
/// <reference path="types/yAxisPosition.ts"/>

/// <reference path="animators/animatorCommon.ts"/>
/// <reference path="animators/columnChartAnimator.ts"/>
/// <reference path="animators/donutChartAnimator.ts"/>
/// <reference path="animators/funnelChartAnimator.ts"/>
/// <reference path="animators/treemapAnimator.ts"/>

/// <reference path="capabilities/animatedNumber.capabilities.ts"/>
/// <reference path="capabilities/basicShape.capabilities.ts"/>
/// <reference path="capabilities/columnChart.capabilities.ts"/>
/// <reference path="capabilities/comboChart.capabilities.ts"/>
/// <reference path="capabilities/donutChart.capabilities.ts"/>
/// <reference path="capabilities/dataDotChart.capabilities.ts"/>
/// <reference path="capabilities/filledMap.capabilities.ts"/>
/// <reference path="capabilities/funnelChart.capabilities.ts"/>
/// <reference path="capabilities/gauge.capabilities.ts"/>
/// <reference path="capabilities/imageVisual.capabilities.ts"/>
/// <reference path="capabilities/scriptVisual.capabilities.ts"/>
/// <reference path="capabilities/samples/consoleWriter.capabilities.ts"/>
/// <reference path="visuals/samples/consoleWriter.ts"/>
/// <reference path="capabilities/lineChart.capabilities.ts"/>
/// <reference path="capabilities/map.capabilities.ts"/>
/// <reference path="capabilities/multiRowCard.capabilities.ts"/>
/// <reference path="capabilities/textbox.capabilities.ts"/>
/// <reference path="capabilities/sampleVisual.capabilities.ts"/>
/// <reference path="capabilities/sankey.capabilities.ts"/>
/// <reference path="capabilities/scatterChart.capabilities.ts"/>
/// <reference path="capabilities/slicer.capabilities.ts"/>
/// <reference path="capabilities/table.capabilities.ts"/>
/// <reference path="capabilities/matrix.capabilities.ts"/>
/// <reference path="capabilities/treemap.capabilities.ts"/>
/// <reference path="capabilities/card.capabilities.ts"/>
/// <reference path="capabilities/waterfallChart.capabilities.ts"/>
/// <reference path="capabilities/sunburst.capabilities.ts"/>
/// <reference path="capabilities/kpiStatusWithHistory.capabilities.ts"/>
/// <reference path="pluginsCapabilities.ts"/>

/// <reference path="behaviours/columnChartBehaviors.ts"/>
/// <reference path="behaviours/dataDotChartBehavior.ts"/>
/// <reference path="behaviours/donutChartBehaviors.ts"/>
/// <reference path="behaviours/funnelBehaviors.ts"/>
/// <reference path="behaviours/lineChartBehaviors.ts"/>
/// <reference path="behaviours/mapBehaviors.ts"/>
/// <reference path="behaviours/scatterChartBehaviors.ts"/>
/// <reference path="behaviours/slicerBehaviors.ts"/>
/// <reference path="behaviours/legendBehaviors.ts"/>
/// <reference path="behaviours/TreemapBehaviors.ts"/>
/// <reference path="behaviours/waterfallChartBehavior.ts"/>

/// <reference path="contracts/contracts.ts"/>

/// <reference path="common/axisHelper.ts"/>
/// <reference path="common/basicShapeUtils.ts"/>
/// <reference path="common/cartesianHelper.ts"/>
/// <reference path="common/colorHelper.ts"/>
/// <reference path="common/columnChartUtil.ts"/>
/// <reference path="common/converterHelper.ts"/>
/// <reference path="common/dataLabelUtils.ts"/>
/// <reference path="common/newDataLabelUtils.ts"/>
/// <reference path="common/dataRoleHelper.ts"/>
/// <reference path="common/kpiUtil.ts"/>
/// <reference path="common/referenceLineHelper.ts"/>

/// <reference path="common/invalidDataValuesChecker.ts"/>
/// <reference path="common/listView.ts"/>
/// <reference path="common/mapUtil.ts"/>
/// <reference path="common/selectionId.ts"/>
/// <reference path="common/selectionManager.ts"/>
/// <reference path="common/shapes.ts"/>
/// <reference path="common/slicerUtil.ts"/>
/// <reference path="common/svgUtil.ts"/>
/// <reference path="common/textUtil.ts"/>
/// <reference path="common/urlHelper.ts"/>
/// <reference path="common/gradientHelper.ts"/>
/// <reference path="common/visualBackgroundHelper.ts"/>
/// <reference path="common/objectEnumerationBuilder.ts"/>

/// <reference path="converter/slicer.converter.ts"/>

/// <reference path="formatting/filledMapLabelLayout.ts" />
/// <reference path="formatting/dataLabelManager.ts"/>
/// <reference path="formatting/labelLayout.ts"/>
/// <reference path="formatting/dateTimeSequence.ts"/>
/// <reference path="formatting/displayUnitSystem.ts"/>
/// <reference path="formatting/numericSequence.ts"/>
/// <reference path="formatting/numericSequenceRange.ts"/>
/// <reference path="formatting/valueFormatter.ts"/>

/// <reference path="services/colorAllocatorFactory.ts"/>
/// <reference path="services/defaultVisualHostService.ts"/>
/// <reference path="services/interactivityService.ts"/>
/// <reference path="services/geocoder.ts"/>
/// <reference path="services/geocodingCache.ts"/>
/// <reference path="services/visualPluginService.ts"/>

/// <reference path="controls/scrollbar/scrollbar.ts"/>
/// <reference path="controls/tablix/internal/tablixGridPresenter.ts"/>
/// <reference path="controls/tablix/internal/tablixRealizationManager.ts"/>
/// <reference path="controls/tablix/internal/tablixGrid.ts"/>
/// <reference path="controls/tablix/internal/tablixLayoutManager.ts"/>
/// <reference path="controls/tablix/internal/tablixUtils.ts"/>
/// <reference path="controls/tablix/iTablixHierarchyNavigator.ts"/>
/// <reference path="controls/tablix/iTablixBinder.ts"/>
/// <reference path="controls/tablix/iTablixLayoutManager.ts"/>
/// <reference path="controls/tablix/tablixControl.ts"/>
/// <reference path="controls/tablix/tablixDimension.ts"/>
/// <reference path="controls/tablix/tablixTouchDelegate.ts"/>
/// <reference path="controls/tablix/touchRegionAbstraction.ts"/>

/// <reference path="visuals/animatedText.ts"/>
/// <reference path="visuals/animatedNumber.ts"/>

/// <reference path="visuals/basicShape.ts"/>

/// <reference path="cartesian/cartesianChart.ts"/>

/// <reference path="cartesian/columnChart.ts"/>
/// <reference path="cartesian/columnChartClustered.ts"/>
/// <reference path="cartesian/columnChartStacked.ts"/>
/// <reference path="visuals/samples/helloIVisual.ts"/>
/// <reference path="visuals/samples/asterPlot.ts"/>

/// <reference path="cartesian/comboChart.ts"/>

/// <reference path="dataColorPalette.ts"/>

/// <reference path="cartesian/dataDotChart.ts"/>
/// <reference path="visuals/funnelChart.ts"/>
/// <reference path="visuals/gauge.ts"/>
/// <reference path="visuals/imageVisual.ts"/>
/// <reference path="visuals/kpiStatusWithHistory.ts"/>
/// <reference path="iVisualStyle.ts"/>

/// <reference path="cartesian/lineChart.ts"/>

/// <reference path="visuals/map.ts"/>
/// <reference path="visuals/multiRowCard.ts"/>
/// <reference path="visuals/textbox.ts"/>
/// <reference path="visuals/sampleVisual.ts"/>
/// <reference path="cartesian/scatterChart.ts"/>
/// <reference path="cartesian/playChart.ts"/>

/// <reference path="visuals/sankey.ts"/>
/// <reference path="visuals/slicer.ts"/>
/// <reference path="visuals/table.ts"/>
/// <reference path="visuals/matrix.ts"/>
/// <reference path="visuals/treemap.ts"/>
/// <reference path="visuals/card.ts"/>
/// <reference path="visuals/owlGauge.ts"/>
/// <reference path="visuals/samples/streamGraph.ts"/>
/// <reference path="visuals/samples/sunburst.ts"/>
/// <reference path="visuals/samples/radarChart.ts"/>
/// <reference path="visuals/samples/dotPlot.ts"/>
/// <reference path="visuals/samples/timeline.ts"/>
/// <reference path="visuals/samples/areaRangeChart.ts"/>
/// <reference path="visuals/samples/chicletSlicer.ts"/>

/// <reference path="warnings/visualWarnings.ts"/>
/// <reference path="cartesian/waterfallChart.ts"/>

/// <reference path="visuals/samples/tornadoChart.ts" />

/// <reference path="tooltip.ts"/>

/// <reference path="styles/visualStyles.ts"/>

/// <reference path="visuals/donutChart.ts"/>

/// <reference path="visuals/samples/histogram.ts"/>

/// <reference path="visuals/scriptVisual.ts"/>

/// <reference path="visuals/samples/sankeyDiagram.ts"/>
/// <reference path="visuals/samples/wordCloud.ts"/>
/// <reference path="plugins.ts"/>